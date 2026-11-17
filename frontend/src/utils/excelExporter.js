import { describeExtraFields } from '@/lib/registrationFormConfig';
import * as XLSX from 'xlsx';

// Excel caps every cell at 32,767 characters — a longer value makes
// XLSX.writeFile throw ("Text length must not exceed 32767 characters")
// and the whole export fails. A photo that fell back to a base64 data URI
// (Cloudinary upload failed) is typically 100KB–several MB, so one such
// registration breaks the export for every row in the tab.
const MAX_CELL_LENGTH = 32767;
const TRUNCATION_MARKER = '… (truncated)';
const DATA_URI_PHOTO_PLACEHOLDER = 'Photo attached (data URI, not exported)';
const DATA_URI_ID_PROOF_PLACEHOLDER = 'ID proof attached (data URI, not exported)';
const DATA_URI_GENERIC_PLACEHOLDER = 'File attached (data URI, not exported)';

/**
 * Make a value safe for an Excel cell. Base64 data URIs are never written
 * raw — they are replaced with a short placeholder. Any other string longer
 * than Excel's per-cell limit is truncated (with a marker) instead of
 * throwing at write time. Non-strings pass through unchanged.
 */
const sanitizeCellValue = (value, dataUriPlaceholder = DATA_URI_GENERIC_PLACEHOLDER) => {
  if (typeof value !== 'string') return value;
  if (value.startsWith('data:')) return dataUriPlaceholder;
  if (value.length > MAX_CELL_LENGTH) {
    return value.slice(0, MAX_CELL_LENGTH - TRUNCATION_MARKER.length) + TRUNCATION_MARKER;
  }
  return value;
};

/** Sanitize every cell of a row. Photo / ID-proof columns get their own placeholder. */
const sanitizeRow = (row) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(row)) {
    const placeholder = key === 'Photo URL'
      ? DATA_URI_PHOTO_PLACEHOLDER
      : key === 'ID Proof URL'
        ? DATA_URI_ID_PROOF_PLACEHOLDER
        : DATA_URI_GENERIC_PLACEHOLDER;
    sanitized[key] = sanitizeCellValue(value, placeholder);
  }
  return sanitized;
};

/**
 * Resolve the category name for a row. The server records the resolved
 * category name in registration_category (member pricing, issue #57) —
 * the same value the cards display. Older records may hold the id
 * instead, so resolve it against the list first. Falls back to the
 * category_id lookup the exporter previously relied on alone.
 */
const resolveCategoryName = (item, categories) => {
  const raw = item.registration_category || item.category_name;
  if (raw) {
    return categories.find(c => c.id === raw)?.name || raw;
  }
  return categories.find(c => c.id === item.category_id)?.name || '';
};

/**
 * Map one registration/player to an Excel row. Shared by both exporters so
 * the two paths can't drift.
 */
const mapRegistrationToExcelRow = (item, index, categories, event, isPlayer = false) => {
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
    'Category': resolveCategoryName(item, categories),
  };

  // Add base price for players
  if (isPlayer) {
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

  // Custom / extra form fields (date of birth, state, organizer-defined, etc.)
  if (item.extra_fields && typeof item.extra_fields === 'object') {
    describeExtraFields(event, item.extra_fields).forEach(({ label, value }) => {
      row[label] = value;
    });
  }

  // Add registration date if available
  if (item.created_at || item.registered_at) {
    row['Registration Date'] = formatDate(item.created_at || item.registered_at);
  }

  return sanitizeRow(row);
};

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
  const excelData = filteredData.map((item, index) =>
    mapRegistrationToExcelRow(item, index, categories, event, isPlayers)
  );

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

  // Helper function to map data (shared with exportRegistrationsToExcel)
  const mapToExcelRow = (item, index, isPlayer = false) =>
    mapRegistrationToExcelRow(item, index, categories, event, isPlayer);

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

  // Nothing to write — an empty workbook makes XLSX.writeFile throw
  // ("Workbook is empty"), so fail with the same message as the
  // single-sheet export instead.
  if (workbook.SheetNames.length === 0) {
    throw new Error('No data to export');
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
