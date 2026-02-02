# Payment Integration Feature

## Overview
Added comprehensive payment collection functionality for player registrations with bank details management for payment withdrawal.

## Features Implemented

### 1. **Auction Payment Settings**
- **Toggle Payment Collection**: Option to enable/disable payment collection during auction creation
- **Registration Fee**: Ability to set a custom registration fee amount
- **Location**: Added to auction creation/edit dialog in Event Management page

### 2. **Bank Details Management**
- **Settings Page**: New dedicated page for organizers to manage bank account details
- **Fields Captured**:
  - Bank Name
  - Account Holder Name
  - Account Number
  - IFSC Code
  - SWIFT Code (Optional)
  - Branch Name
  - UPI ID (Optional)

### 3. **Backend Updates**

#### Models (`backend/models.py`)
- **PaymentSettings**: New model with `collect_payment` (bool) and `registration_fee` (int)
- **BankDetailsCreate**: Model for creating/updating bank details
- **BankDetails**: Complete bank details model with timestamps
- Updated `EventCreate` and `Event` models to include `payment_settings`

#### API Endpoints (`backend/server.py`)
- **POST /api/settings/bank-details**: Create or update bank details
- **GET /api/settings/bank-details**: Retrieve organizer's bank details
- Updated **POST /api/auctions**: Now saves payment_settings with event
- Updated **PUT /api/auctions/{event_id}**: Now updates payment_settings

### 4. **Frontend Updates**

#### Event Management Page (`frontend/src/pages/EventManagement.jsx`)
- Added payment settings section in auction creation dialog
- Toggle switch for enabling payment collection
- Conditional registration fee input field
- Icons: DollarSign for payment section

#### Settings Page (`frontend/src/pages/Settings.jsx`)
- Complete bank details form
- Auto-loads existing bank details on page load
- Save/Update functionality
- Visual feedback for users
- Icons: Landmark, CreditCard, Building2, MapPin, DollarSign

#### Navigation (`frontend/src/components/Navbar.jsx`)
- Added "Settings" link in navbar (Landmark icon)
- Available for Super Admins and Event Organizers

#### Routing (`frontend/src/App.js`)
- Added `/admin/settings` route
- Protected route requiring Super Admin privileges

## Database Schema

### Firestore Collections

#### `bank_details`
```json
{
  "id": "uuid",
  "user_id": "firebase_uid",
  "bank_name": "string",
  "account_holder_name": "string",
  "account_number": "string",
  "ifsc_code": "string",
  "swift_code": "string",
  "branch_name": "string",
  "upi_id": "string",
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp"
}
```

#### `events` (updated)
```json
{
  "id": "uuid",
  "name": "string",
  "date": "string",
  // ... other fields
  "payment_settings": {
    "collect_payment": boolean,
    "registration_fee": number
  }
}
```

## User Flow

### For Organizers:
1. **Set Bank Details** (One-time setup)
   - Navigate to Settings from navbar
   - Fill in bank account details
   - Save bank details

2. **Enable Payment Collection** (Per Auction)
   - Create/Edit auction
   - Toggle "Collect Payment on Registration"
   - Enter registration fee amount
   - Save auction

3. **Payment Collection**
   - When players register via public registration link
   - If payment enabled, they must pay the registration fee
   - Collected payments will be transferred to the organizer's bank account

### For Players:
1. Access public registration link
2. If payment is enabled for that auction:
   - See registration fee amount
   - Complete payment during registration
   - Register as player after successful payment

## UI Components Used
- **Switch**: Toggle for payment collection
- **Input**: Text and number inputs for forms
- **Label**: Form labels
- **Button**: Submit buttons
- **Card**: Content containers
- **Icons**: DollarSign, Landmark, CreditCard, Building2, MapPin

## Security Considerations
- Bank details accessible only by the organizer who created them
- Protected routes ensure only authenticated users can access
- Firebase authentication and authorization
- Sensitive data stored securely in Firestore

## Next Steps (Future Enhancements)
1. **Payment Gateway Integration**: Integrate with Razorpay/Stripe for actual payment processing
2. **Payment Verification**: Add payment verification workflow
3. **Transaction History**: Show payment transaction logs
4. **Withdrawal Management**: Add withdrawal request functionality
5. **Email Notifications**: Send payment confirmation emails to players
6. **Payment Status**: Track payment status (pending, completed, failed)

## Files Modified

### Backend
- `/backend/models.py` - Added PaymentSettings and BankDetails models
- `/backend/server.py` - Added bank details endpoints and updated auction endpoints

### Frontend
- `/frontend/src/pages/EventManagement.jsx` - Added payment settings to auction form
- `/frontend/src/pages/Settings.jsx` - New settings page for bank details
- `/frontend/src/App.js` - Added settings route
- `/frontend/src/components/Navbar.jsx` - Added settings link

## Testing Checklist
- [ ] Create auction with payment enabled
- [ ] Create auction without payment enabled
- [ ] Update auction payment settings
- [ ] Add bank details in Settings page
- [ ] Update existing bank details
- [ ] View bank details after saving
- [ ] Verify payment settings saved in Firestore
- [ ] Verify bank details saved in Firestore
- [ ] Check Settings link in navbar
- [ ] Test protected route access

## Deployment Notes
Backend changes require redeployment to Railway. Run:
```bash
cd backend
railway up
```

Frontend changes will be deployed automatically or run:
```bash
cd frontend
npm run build
```
