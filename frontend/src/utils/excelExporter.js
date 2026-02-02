import * as XLSX from 'xlsx';

/**
 * Export registrations/players to Excel file
 * @param {Array} registrations - Array of registration objects
 * @param {Array} players - Array of player objects  
 * @param {Array} categories - Array of category objects
 * @param {Object} event - Event object with event details
 * @param {string} statusFilter - Filter by status: 'all', 'pending_approval', 'approved', 'rejected', 'players'
 */
export const exportRegistrationsToExcel = (registrations, players, categories, event, statusFilter = 'all') => {
  // Filter registrations based on status
  let filteredData = [];
  let sheetName = '';

  if (statusFilter === 'players') {
    // Export players (approved and added to auction)
    filteredData = players.map(player => ({
      ...player,
      status: 'player',
      category_name: categories.find(c => c.id === player.category_id)?.name || 'Unknown'
    }));
    sheetName = 'Players';
  } else if (statusFilter === 'all') {
    // Export all registrations
    filteredData = registrations.map(reg => ({
      ...reg,
      category_name: categories.find(c => c.id === reg.category_id)?.name || ''
    }));
    sheetName = 'All Registrations';
  } else {
    // Export filtered registrations
    filteredData = registrations
      .filter(reg => reg.status === statusFilter)
      .map(reg => ({
        ...reg,
        category_name: categories.find(c => c.id === reg.category_id)?.name || ''
      }));

    const statusNames = {
      'pending_approval': 'Pending',
      'approved': 'Approved',
      'rejected': 'Rejected'
    };
    sheetName = statusNames[statusFilter] || statusFilter;
  }

  if (filteredData.length === 0) {
    throw new Error('No data to export');
  }

  // Define columns based on whether it's players or registrations
  const isPlayers = statusFilter === 'players';

  // Map data to Excel-friendly format
  const excelData = filteredData.map((item, index) => {
    const row = {
      'S.No': index + 1,
      'Name': item.name || '',
      'Status': item.status === 'pending_approval' ? 'Pending' :
        item.status === 'player' ? 'Player' :
          (item.status?.charAt(0).toUpperCase() + item.status?.slice(1)) || '',
      'Email': item.email || '',
      'Contact Number': item.contact_number || '',
      'Age': item.age || '',
      'Position': item.position || '',
      'Specialty': item.specialty || '',
      'District': item.district || '',
      'Previous Team': item.previous_team || '',
      'Category': item.category_name || '',
    };

    // Add base price for players
    if (isPlayers) {
      row['Base Price'] = item.base_price || '';
    }

    // Add stats if available
    if (item.stats) {
      row['Matches'] = item.stats.matches || '';
      row['Runs/Goals'] = item.stats.runs || '';
      row['Wickets/Assists'] = item.stats.wickets || '';
    }

    // Add CricHeroes link if available
    row['CricHeroes Link'] = item.cricheroes_link || '';

    // Add photo URL instead of embedding image
    row['Photo URL'] = item.photo_url || '';

    // Add ID proof URL instead of embedding document
    row['ID Proof URL'] = item.identity_proof_url || '';

    // Add registration date if available
    if (item.created_at) {
      row['Registration Date'] = formatDate(item.created_at);
    }

    return row;
  });

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  const columnWidths = [
    { wch: 5 },   // S.No
    { wch: 25 },  // Name
    { wch: 12 },  // Status
    { wch: 30 },  // Email
    { wch: 15 },  // Contact Number
    { wch: 8 },   // Age
    { wch: 15 },  // Position
    { wch: 20 },  // Specialty
    { wch: 15 },  // District
    { wch: 20 },  // Previous Team
    { wch: 15 },  // Category
    { wch: 12 },  // Base Price (if players)
    { wch: 10 },  // Matches
    { wch: 12 },  // Runs/Goals
    { wch: 15 },  // Wickets/Assists
    { wch: 40 },  // CricHeroes Link
    { wch: 50 },  // Photo URL
    { wch: 50 },  // ID Proof URL
    { wch: 20 },  // Registration Date
  ];
  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate filename
  const eventName = event?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Event';
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${eventName}_${sheetName.replace(/\s+/g, '_')}_${timestamp}.xlsx`;

  // Write and download file
  XLSX.writeFile(workbook, filename);

  return filename;
};

/**
 * Export all data to Excel with multiple sheets
 * @param {Array} registrations - Array of registration objects
 * @param {Array} players - Array of player objects
 * @param {Array} categories - Array of category objects
 * @param {Object} event - Event object with event details
 */
export const exportAllToExcel = (registrations, players, categories, event) => {
  const workbook = XLSX.utils.book_new();

  // Helper function to map data
  const mapToExcelRow = (item, index, isPlayer = false) => {
    const row = {
      'S.No': index + 1,
      'Name': item.name || '',
      'Status': item.status === 'pending_approval' ? 'Pending' :
        item.status === 'player' ? 'Player' :
          (item.status?.charAt(0).toUpperCase() + item.status?.slice(1)) || '',
      'Email': item.email || '',
      'Contact Number': item.contact_number || '',
      'Age': item.age || '',
      'Position': item.position || '',
      'Specialty': item.specialty || '',
      'District': item.district || '',
      'Previous Team': item.previous_team || '',
      'Category': categories.find(c => c.id === item.category_id)?.name || '',
    };

    if (isPlayer) {
      row['Base Price'] = item.base_price || '';
    }

    if (item.stats) {
      row['Matches'] = item.stats.matches || '';
      row['Runs/Goals'] = item.stats.runs || '';
      row['Wickets/Assists'] = item.stats.wickets || '';
    }

    row['CricHeroes Link'] = item.cricheroes_link || '';
    row['Photo URL'] = item.photo_url || '';
    row['ID Proof URL'] = item.identity_proof_url || '';

    if (item.created_at) {
      row['Registration Date'] = formatDate(item.created_at);
    }

    return row;
  };

  // Column widths
  const columnWidths = [
    { wch: 5 }, { wch: 25 }, { wch: 12 }, { wch: 30 }, { wch: 15 },
    { wch: 8 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
    { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 },
    { wch: 40 }, { wch: 50 }, { wch: 50 }, { wch: 20 }
  ];

  // Sheet 1: Pending Registrations
  const pendingData = registrations
    .filter(r => r.status === 'pending_approval')
    .map((r, i) => mapToExcelRow(r, i));
  if (pendingData.length > 0) {
    const pendingSheet = XLSX.utils.json_to_sheet(pendingData);
    pendingSheet['!cols'] = columnWidths;
    XLSX.utils.book_append_sheet(workbook, pendingSheet, 'Pending');
  }

  // Sheet 2: Approved Registrations
  const approvedData = registrations
    .filter(r => r.status === 'approved')
    .map((r, i) => mapToExcelRow(r, i));
  if (approvedData.length > 0) {
    const approvedSheet = XLSX.utils.json_to_sheet(approvedData);
    approvedSheet['!cols'] = columnWidths;
    XLSX.utils.book_append_sheet(workbook, approvedSheet, 'Approved');
  }

  // Sheet 3: Players (active in auction)
  const playersData = players.map((p, i) => mapToExcelRow(p, i, true));
  if (playersData.length > 0) {
    const playersSheet = XLSX.utils.json_to_sheet(playersData);
    playersSheet['!cols'] = columnWidths;
    XLSX.utils.book_append_sheet(workbook, playersSheet, 'Players');
  }

  // Sheet 4: Rejected Registrations
  const rejectedData = registrations
    .filter(r => r.status === 'rejected')
    .map((r, i) => mapToExcelRow(r, i));
  if (rejectedData.length > 0) {
    const rejectedSheet = XLSX.utils.json_to_sheet(rejectedData);
    rejectedSheet['!cols'] = columnWidths;
    XLSX.utils.book_append_sheet(workbook, rejectedSheet, 'Rejected');
  }

  // Sheet 5: All Registrations (combined)
  const allData = registrations.map((r, i) => mapToExcelRow(r, i));
  if (allData.length > 0) {
    const allSheet = XLSX.utils.json_to_sheet(allData);
    allSheet['!cols'] = columnWidths;
    XLSX.utils.book_append_sheet(workbook, allSheet, 'All Registrations');
  }

  // Generate filename
  const eventName = event?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Event';
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${eventName}_All_Data_${timestamp}.xlsx`;

  // Write and download file
  XLSX.writeFile(workbook, filename);

  return filename;
};

/**
 * Helper function to format date
 */
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};
