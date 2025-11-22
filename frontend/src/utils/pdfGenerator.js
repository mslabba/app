import jsPDF from 'jspdf';

/**
 * Generate a PDF document for team player roster
 * Groups players by category and includes contact information
 * @param {Object} team - Team object with name, budget, etc.
 * @param {Array} players - Array of player objects
 * @param {Array} categories - Array of category objects
 * @param {Object} event - Event object with event details
 */
export const generateTeamRosterPDF = (team, players, categories, event) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const lineHeight = 7;
  let yPosition = margin;

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

  // Header - Event Name
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(event?.name || 'Auction Event', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Team Name
  doc.setFontSize(22);
  doc.setTextColor(team.color || '#667eea');
  doc.text(team.name, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Subtitle
  doc.setFontSize(12);
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

    checkNewPage(15);

    // Category Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(group.category.color || '#333333');
    doc.text(`${group.category.name} (${group.players.length} players)`, margin, yPosition);
    yPosition += 8;

    // Category line separator
    doc.setDrawColor(group.category.color || '#333333');
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    // Players in this category
    group.players.forEach((player, index) => {
      checkNewPage(35);

      // Player card background
      const cardHeight = 30;
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, cardHeight, 2, 2, 'FD');

      // Player number badge
      doc.setFillColor(group.category.color || '#667eea');
      doc.circle(margin + 5, yPosition + 6, 4, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text((index + 1).toString(), margin + 5, yPosition + 7.5, { align: 'center' });

      // Player Name
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(player.name, margin + 12, yPosition + 7);

      // Player Details Row 1
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);

      let detailY = yPosition + 13;
      let detailX = margin + 12;

      if (player.position) {
        doc.text(`Position: ${player.position}`, detailX, detailY);
        detailX += 60;
      }

      if (player.age) {
        doc.text(`Age: ${player.age}`, detailX, detailY);
      }

      // Player Details Row 2
      detailY += 6;
      detailX = margin + 12;

      if (player.specialty) {
        const specialtyText = `Specialty: ${player.specialty}`;
        doc.text(specialtyText.substring(0, 50) + (specialtyText.length > 50 ? '...' : ''), detailX, detailY);
      }

      // Player Details Row 3 - Contact and Price
      detailY += 6;
      detailX = margin + 12;

      if (player.contact_number) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 100, 0);
        doc.text(`Phone: ${player.contact_number}`, detailX, detailY);
        detailX += 60;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
      }

      // Price information (right aligned)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 128, 0);
      const priceText = `₹${(player.sold_price || player.base_price || 0).toLocaleString()}`;
      doc.text(priceText, pageWidth - margin - 5, yPosition + 7, { align: 'right' });

      if (player.sold_price) {
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text('Bought', pageWidth - margin - 5, yPosition + 12, { align: 'right' });
      }

      yPosition += cardHeight + 3;
    });

    yPosition += 5;
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
