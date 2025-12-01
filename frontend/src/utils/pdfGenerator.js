import jsPDF from 'jspdf';

/**
 * Load an image and convert it to base64 data URL
 * @param {string} url - Image URL
 * @returns {Promise<string>} Base64 data URL
 */
const loadImage = (url) => {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };

    img.onerror = () => resolve(null);
    img.src = url;
  });
};

/**
 * Generate a PDF document for team player roster
 * Groups players by category and includes contact information
 * @param {Object} team - Team object with name, budget, etc.
 * @param {Array} players - Array of player objects
 * @param {Array} categories - Array of category objects
 * @param {Object} event - Event object with event details
 */
export const generateTeamRosterPDF = async (team, players, categories, event) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const lineHeight = 7;
  let yPosition = margin;

  // Load images
  const teamLogo = await loadImage(team.logo_url);
  const eventLogo = await loadImage(event?.logo_url);

  // Load all player images
  const playerImages = {};
  for (const player of players) {
    if (player.photo_url) {
      playerImages[player.id] = await loadImage(player.photo_url);
    }
  }

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace = 10) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to add wrapped text
  const addWrappedText = (text, x, y, maxWidth) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return lines.length * lineHeight;
  };

  // Header with Logos
  const logoSize = 20;
  const logoY = yPosition;

  // Event Logo (left)
  if (eventLogo) {
    try {
      doc.addImage(eventLogo, 'JPEG', margin, logoY, logoSize, logoSize);
    } catch (e) {
      console.error('Failed to add event logo:', e);
    }
  }

  // Team Logo (right)
  if (teamLogo) {
    try {
      doc.addImage(teamLogo, 'JPEG', pageWidth - margin - logoSize, logoY, logoSize, logoSize);
    } catch (e) {
      console.error('Failed to add team logo:', e);
    }
  }

  // Header - Event Name (centered)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(event?.name || 'Auction Event', pageWidth / 2, yPosition + 7, { align: 'center' });

  yPosition += logoSize + 5;

  // Team Name
  doc.setFontSize(20);
  doc.setTextColor(team.color || '#667eea');
  doc.text(team.name, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Subtitle
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text('Team Player Roster', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Team Summary Box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 25, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  const summaryY = yPosition + 7;
  doc.text(`Total Players: ${players.length}`, margin + 5, summaryY);
  doc.text(`Budget: ₹${team.budget?.toLocaleString() || '0'}`, margin + 70, summaryY);

  const totalSpent = players.reduce((sum, p) => sum + (p.sold_price || p.base_price || 0), 0);
  doc.text(`Total Spent: ₹${totalSpent.toLocaleString()}`, margin + 5, summaryY + 7);
  doc.text(`Remaining: ₹${((team.remaining || 0).toLocaleString())}`, margin + 70, summaryY + 7);
  doc.text(`Squad Size: ${players.length}/${team.max_squad_size || 18}`, margin + 5, summaryY + 14);

  yPosition += 30;

  // Group players by category
  const groupedPlayers = {};
  categories.forEach(category => {
    groupedPlayers[category.id] = {
      category,
      players: []
    };
  });

  players.forEach(player => {
    if (player.category_id && groupedPlayers[player.category_id]) {
      groupedPlayers[player.category_id].players.push(player);
    }
  });

  // Add uncategorized group if needed
  const uncategorizedPlayers = players.filter(p => !p.category_id);
  if (uncategorizedPlayers.length > 0) {
    groupedPlayers['uncategorized'] = {
      category: { id: 'uncategorized', name: 'Uncategorized', color: '#999999' },
      players: uncategorizedPlayers
    };
  }

  // Render each category
  Object.values(groupedPlayers).forEach((group) => {
    if (group.players.length === 0) return;

    checkNewPage(20);

    // Category Header
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(group.category.color || '#333333');
    doc.text(`${group.category.name} (${group.players.length} players)`, margin, yPosition);
    yPosition += 7;

    // Category line separator
    doc.setDrawColor(group.category.color || '#333333');
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    // Players in this category - Grid Layout (3 per row)
    const cardsPerRow = 3;
    const cardWidth = (pageWidth - 2 * margin - 4) / cardsPerRow; // 4 = gaps between cards
    const cardHeight = 50;
    const gap = 2;

    let currentRowStartY = yPosition;

    group.players.forEach((player, index) => {
      const col = index % cardsPerRow;
      const row = Math.floor(index / cardsPerRow);

      // Check if we need a new page for this row (only check at start of row)
      if (col === 0) {
        if (checkNewPage(cardHeight + 5)) {
          currentRowStartY = yPosition;
        }
      }

      // Move to next row if starting a new one
      if (col === 0 && index > 0) {
        currentRowStartY += cardHeight + gap;
      }

      const cardX = margin + col * (cardWidth + gap);
      const cardY = currentRowStartY;

      // Player card background
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2, 2, 'FD');

      let contentY = cardY + 4;

      // Player Photo
      if (playerImages[player.id]) {
        try {
          const photoSize = 20;
          const photoX = cardX + (cardWidth - photoSize) / 2;
          doc.addImage(playerImages[player.id], 'JPEG', photoX, contentY, photoSize, photoSize);
          contentY += photoSize + 3;
        } catch (e) {
          console.error('Failed to add player photo:', e);
          contentY += 3;
        }
      } else {
        // Placeholder circle if no photo
        doc.setFillColor(200, 200, 200);
        const photoSize = 12;
        doc.circle(cardX + cardWidth / 2, contentY + photoSize / 2, photoSize / 2, 'F');
        contentY += photoSize + 3;
      }

      // Player Name (centered)
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      const nameLines = doc.splitTextToSize(player.name, cardWidth - 6);
      doc.text(nameLines[0], cardX + cardWidth / 2, contentY, { align: 'center' });
      contentY += 5;

      // Player Details (compact)
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);

      if (player.position) {
        const posText = player.position.substring(0, 20);
        doc.text(posText, cardX + cardWidth / 2, contentY, { align: 'center' });
        contentY += 3.5;
      }

      if (player.age) {
        doc.text(`Age: ${player.age}`, cardX + cardWidth / 2, contentY, { align: 'center' });
        contentY += 3.5;
      }

      if (player.contact_number) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 120, 0);
        doc.setFontSize(6.5);
        doc.text(player.contact_number, cardX + cardWidth / 2, contentY, { align: 'center' });
        contentY += 3.5;
      }

      // Price (bottom of card with background)
      doc.setFillColor(230, 255, 230);
      doc.roundedRect(cardX + 2, cardY + cardHeight - 9, cardWidth - 4, 7, 1, 1, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 128, 0);
      const priceText = `₹${(player.sold_price || player.base_price || 0).toLocaleString()}`;
      doc.text(priceText, cardX + cardWidth / 2, cardY + cardHeight - 4, { align: 'center' });
    });

    // Update yPosition to after the last row of cards
    const totalRows = Math.ceil(group.players.length / cardsPerRow);
    yPosition = currentRowStartY + (totalRows * (cardHeight + gap)) + 5;
  });

  // Footer
  checkNewPage(15);
  yPosition = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  const date = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Generated on ${date}`, pageWidth / 2, yPosition, { align: 'center' });

  // Save the PDF
  const fileName = `${team.name.replace(/[^a-z0-9]/gi, '_')}_Roster_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

/**
 * Generate a PDF document for player registrations
 * Includes player name, email, and mobile number
 * @param {Array} registrations - Array of registration objects
 * @param {Object} event - Event object with event details
 * @param {string} statusFilter - Filter by status (pending, approved, rejected, or 'all')
 */
export const generateRegistrationsPDF = async (registrations, event, statusFilter = 'all') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Load logos
  const powerAuctionLogo = await loadImage('/images/sports/logo-final.png');
  const eventLogo = await loadImage(event?.logo_url);

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace = 10) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Filter registrations by status
  let filteredRegistrations = registrations;
  if (statusFilter !== 'all') {
    filteredRegistrations = registrations.filter(reg => reg.status === statusFilter);
  }

  // PowerAuction Logo and Branding Header
  const powerLogoSize = 20;
  if (powerAuctionLogo) {
    try {
      doc.addImage(powerAuctionLogo, 'PNG', margin, yPosition, powerLogoSize, powerLogoSize);
    } catch (e) {
      console.error('Failed to add PowerAuction logo:', e);
    }
  }

  // PowerAuction Text Branding (centered)
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Power', pageWidth / 2 - 12, yPosition + 10, { align: 'right' });

  doc.setTextColor(220, 38, 38); // Red color
  doc.text('Auction', pageWidth / 2 - 12, yPosition + 10, { align: 'left' });

  yPosition += 14;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Powered by Turgut', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Separator line
  doc.setDrawColor(103, 126, 234);
  doc.setLineWidth(1);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Header with Event Logo
  const logoSize = 20;
  if (eventLogo) {
    try {
      doc.addImage(eventLogo, 'JPEG', pageWidth / 2 - logoSize / 2, yPosition, logoSize, logoSize);
      yPosition += logoSize + 5;
    } catch (e) {
      console.error('Failed to add event logo:', e);
    }
  }

  // Event Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(event?.name || 'Auction Event', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Subtitle
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  const statusTitle = statusFilter === 'all' ? 'All Registrations' :
    statusFilter === 'pending_approval' ? 'Pending Registrations' :
      statusFilter === 'approved' ? 'Approved Registrations' :
        statusFilter === 'rejected' ? 'Rejected Registrations' : 'Registrations';
  doc.text(statusTitle, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Summary Box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 15, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Registrations: ${filteredRegistrations.length}`, margin + 5, yPosition + 7);

  const date = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(`Generated: ${date}`, pageWidth - margin - 5, yPosition + 7, { align: 'right' });

  yPosition += 20;

  // Table Header
  checkNewPage(30);
  doc.setFillColor(103, 126, 234);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F');

  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');

  const col1X = margin + 5;
  const col2X = margin + 15;
  const col3X = margin + 70;
  const col4X = margin + 125;

  doc.text('#', col1X, yPosition + 6.5);
  doc.text('Player Name', col2X, yPosition + 6.5);
  doc.text('Email', col3X, yPosition + 6.5);
  doc.text('Mobile Number', col4X, yPosition + 6.5);

  yPosition += 10;

  // Table Rows
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  filteredRegistrations.forEach((registration, index) => {
    checkNewPage(12);

    // Alternating row colors
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F');

    // Row border
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);

    // Serial number
    doc.setFont('helvetica', 'bold');
    doc.text((index + 1).toString(), col1X, yPosition + 6.5);

    // Player name
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const name = registration.name || registration.player_name || 'N/A';
    doc.text(name.substring(0, 25), col2X, yPosition + 6.5);

    // Email
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const email = registration.email || 'N/A';
    doc.text(email.substring(0, 30), col3X, yPosition + 6.5);

    // Mobile number
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 120, 0);
    const mobile = registration.mobile || registration.mobile_number || registration.contact_number || 'N/A';
    doc.text(mobile, col4X, yPosition + 6.5);

    yPosition += 10;
  });

  // Final border
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);

  // Footer with PowerAuction Branding
  yPosition = pageHeight - 20;

  // Separator line
  doc.setDrawColor(103, 126, 234);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  // PowerAuction branding
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Power', pageWidth / 2 - 8, yPosition, { align: 'right' });
  doc.setTextColor(220, 38, 38);
  doc.text('Auction', pageWidth / 2 - 8, yPosition, { align: 'left' });

  yPosition += 4;
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text('Powered by Turgut', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 4;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  const timestamp = new Date().toLocaleString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Generated on ${timestamp}`, pageWidth / 2, yPosition, { align: 'center' });

  // Save the PDF
  const statusSuffix = statusFilter === 'all' ? 'All' :
    statusFilter === 'pending_approval' ? 'Pending' :
      statusFilter === 'approved' ? 'Approved' :
        statusFilter === 'rejected' ? 'Rejected' : 'Registrations';
  const fileName = `${event?.name?.replace(/[^a-z0-9]/gi, '_') || 'Event'}_${statusSuffix}_Registrations_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
