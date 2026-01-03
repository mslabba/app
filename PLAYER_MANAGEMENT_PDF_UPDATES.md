# Player Management PDF Export Updates

## Summary
Enhanced the Player Management module to support mobile number field and improved PDF export functionality with filtered results support.

## Changes Made

### 1. Mobile Number Field Addition

#### Frontend Form (`PlayerManagement.jsx`)
- **Added `contact_number` field** to the player form state
- **Form Input**: Added mobile number input field in the player creation/edit dialog
  - Placed alongside CricHeroes link field for better organization
  - Placeholder: "e.g., +91 98765 43210"
  
#### Data Management
- Updated `formData` state to include `contact_number`
- Updated `resetForm()` function to reset contact number
- Updated `handleEdit()` function to populate contact number when editing
- Contact number is sent to backend when creating/updating players

#### Player Card Display
- Mobile number now displays in the player card view
- Format: "Mobile: {player.contact_number}"
- Only shows if contact number exists

### 2. PDF Export Enhancements

#### Filtered Results Support
- **PDF now exports filtered players**: When filters are active (search, category, or status), only filtered players are exported
- Export button dynamically shows count when filters are active: `Export PDF (X)` where X is the filtered count
- Tooltip shows whether exporting filtered or all players

#### PDF Filename Updates
- Filenames now include status filter in the name
- Format: `players-{status}-{date}.pdf` or `players-{date}.pdf`
- Examples:
  - `players-sold-2025-12-23.pdf` - Only sold players
  - `players-available-2025-12-23.pdf` - Only available players
  - `players-unsold-2025-12-23.pdf` - Only unsold players
  - `players-2025-12-23.pdf` - All players (no filter)

#### Mobile Number in PDF
- Mobile numbers now included in player cards within the PDF
- Displayed below specialty information
- Font size: 6.5pt (slightly smaller for compact display)
- Only shows if player has a contact number

#### Toast Notifications
- Export success message indicates if filtered results were exported
- Format: "PDF generated with X players (filtered results)!" or "PDF generated with X players!"

### 3. Status Filter Integration

The status filter was already implemented and now fully integrates with PDF export:
- **Available**: Players ready for bidding
- **Current**: Player currently in auction
- **Sold**: Players purchased by teams
- **Unsold**: Players not purchased after bidding

## Backend Support

The backend already supports the `contact_number` field:
- Defined in `Player` model in `backend/models.py`
- Field name: `contact_number` (Optional[str])
- Also used in `PublicPlayerRegistration` model

## User Benefits

1. **Mobile Number Tracking**: Event organizers can now track player contact information
2. **Filtered Exports**: Export specific player groups (sold, unsold, available, current)
3. **Better Organization**: PDF names clearly indicate content
4. **Complete Information**: Player cards include all essential contact details

## Usage Instructions

### Adding Mobile Number
1. Click "Add Player" or edit existing player
2. Enter mobile number in the "Mobile Number" field
3. Format: Any format accepted (e.g., +91 98765 43210, 9876543210)
4. Save player

### Exporting Filtered Results
1. Use search bar to find specific players
2. Apply category filter to filter by player category
3. Apply status filter (Available, Current, Sold, Unsold)
4. Click "Export PDF" button
5. Only filtered results will be exported
6. PDF filename will reflect the status filter applied

### Viewing Mobile Numbers
- Mobile numbers appear in player cards below "Previous Team"
- Mobile numbers appear in exported PDFs below specialty information

## Technical Details

### PDF Card Layout (per player)
- Photo (18mm x 18mm)
- Name (8.5pt, bold, centered)
- Position (7pt, normal, centered)
- Specialty (7pt, italic, centered)
- **Mobile Number (6.5pt, normal, centered)** ← NEW

### Filter Logic
- Filters combine with AND logic (search + category + status)
- Export button shows count when filters active
- Clear filters button resets all filters

## Files Modified

1. `/Users/mslabba/Sites/auction-app/frontend/src/pages/PlayerManagement.jsx`
   - Added contact_number to form state
   - Added mobile number input field
   - Updated PDF generation to include mobile numbers
   - Updated PDF export to respect filters
   - Enhanced export button with filter indication
   - Added mobile number to player card display

## Testing Checklist

- [ ] Add player with mobile number
- [ ] Edit player mobile number
- [ ] View mobile number in player card
- [ ] Export all players - verify mobile numbers in PDF
- [ ] Filter by status "Sold" - export PDF
- [ ] Filter by status "Available" - export PDF
- [ ] Filter by status "Unsold" - export PDF
- [ ] Filter by status "Current" - export PDF
- [ ] Verify PDF filename includes status
- [ ] Verify export button shows filtered count
- [ ] Clear filters and verify export button resets

## Date
December 23, 2025
