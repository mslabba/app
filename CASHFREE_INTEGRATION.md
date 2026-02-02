# Cashfree Payment Gateway Integration

## Overview
Integrated Cashfree payment gateway for collecting registration fees during player registration. When organizers enable payment collection for an auction, players must pay the registration fee before submitting their registration.

## Features Implemented

### 1. **Payment Gateway Configuration**
- Organizers can add Cashfree credentials (App ID and Secret Key) in Settings
- Supports both Sandbox (testing) and Production modes
- Credentials stored securely per organizer

### 2. **Payment Collection in Auction**
- Organizers can enable/disable payment collection per auction
- Set custom registration fee amount
- Payment settings saved with auction details

### 3. **Player Registration with Payment**
- **Payment Required**: Shows registration fee prominently before form
- **Cashfree Checkout**: Seamless payment experience using Cashfree SDK
- **Payment Verification**: Backend verifies payment before accepting registration
- **Secure Flow**: Payment order ID linked to registration to prevent fraud

### 4. **Payment Flow**
1. Player fills registration form
2. If payment enabled, clicking submit initiates Cashfree payment
3. Player completes payment on Cashfree secure checkout
4. Returns to registration page with payment confirmation
5. System verifies payment with Cashfree API
6. Registration completed only if payment verified

## Backend Implementation

### Models Added (`backend/models.py`)

#### PaymentOrderCreate
```python
class PaymentOrderCreate(BaseModel):
    event_id: str
    customer_name: str
    customer_email: str
    customer_phone: str
    amount: float
```

#### PaymentOrderResponse
```python
class PaymentOrderResponse(BaseModel):
    order_id: str
    payment_session_id: str
    order_amount: float
    order_currency: str
```

#### PaymentVerificationRequest
```python
class PaymentVerificationRequest(BaseModel):
    order_id: str
    event_id: str
```

#### PaymentVerificationResponse
```python
class PaymentVerificationResponse(BaseModel):
    payment_status: str
    order_id: str
    order_amount: float
    transaction_id: Optional[str] = None
```

#### Updated BankDetails
- Added `cashfree_app_id` field
- Added `cashfree_secret_key` field

#### Updated PublicPlayerRegistration
- Added `payment_order_id` field (optional)

### API Endpoints

#### POST `/api/payments/create-order`
Creates a Cashfree payment order for player registration

**Request Body:**
```json
{
  "event_id": "uuid",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "9876543210",
  "amount": 500
}
```

**Response:**
```json
{
  "order_id": "order_12345678_abcd1234",
  "payment_session_id": "session_xxxxx",
  "order_amount": 500,
  "order_currency": "INR"
}
```

**Flow:**
1. Validates event exists and payment is enabled
2. Retrieves organizer's Cashfree credentials
3. Creates payment order with Cashfree API
4. Stores order in `payment_orders` collection
5. Returns session ID for checkout

#### POST `/api/payments/verify`
Verifies payment status with Cashfree

**Request Body:**
```json
{
  "order_id": "order_12345678_abcd1234",
  "event_id": "uuid"
}
```

**Response:**
```json
{
  "payment_status": "PAID",
  "order_id": "order_12345678_abcd1234",
  "order_amount": 500,
  "transaction_id": "cf_order_xxxxx"
}
```

**Flow:**
1. Retrieves payment order from database
2. Gets Cashfree credentials
3. Queries Cashfree API for payment status
4. Updates local payment record
5. Returns verification result

#### POST `/api/auctions/{event_id}/register-player` (Updated)
Now checks for payment completion before registration

**Additional Logic:**
- If payment required, validates `payment_order_id` is provided
- Verifies payment status is PAID/SUCCESS
- Ensures payment not already used
- Links payment to registration
- Marks payment as used

## Frontend Implementation

### Settings Page (`/admin/settings`)

Added Cashfree credentials section:
- **Cashfree App ID** input field
- **Cashfree Secret Key** input field (password type)
- Link to Cashfree Dashboard
- Warning about sandbox vs production

### Public Registration Form

#### Payment Banner
When payment is enabled, shows:
- Registration fee amount prominently
- Payment gateway information
- Secure payment badge

#### Payment Integration
- **Cashfree SDK**: Loaded via CDN in `index.html`
- **initiateCashfreePayment()**: Creates order and opens checkout
- **verifyAndCompleteRegistration()**: Verifies payment after redirect
- **Smart Submit**: Detects if payment required and handles flow

#### Submit Button
- Shows "Proceed to Pay ₹XXX" when payment required
- Shows "Submit Registration" when no payment
- Disabled during payment processing

## Firestore Collections

### `payment_orders`
```json
{
  "order_id": "order_12345678_abcd1234",
  "event_id": "event_uuid",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "9876543210",
  "amount": 500,
  "currency": "INR",
  "status": "PAID",
  "payment_session_id": "session_xxxxx",
  "created_at": "ISO timestamp",
  "verified_at": "ISO timestamp",
  "transaction_id": "cf_order_xxxxx",
  "registration_completed": true,
  "registration_id": "registration_uuid"
}
```

### `player_registrations` (Updated)
Now includes:
```json
{
  "id": "uuid",
  "event_id": "uuid",
  "name": "Player Name",
  "payment_order_id": "order_12345678_abcd1234",
  // ... other fields
}
```

## Configuration

### Environment Variables

#### Backend (.env)
```bash
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

### Cashfree Modes

#### Sandbox (Testing)
- Use in Settings: Sandbox App ID and Secret Key
- API Base URL: `https://sandbox.cashfree.com/pg/orders`
- Test cards available in Cashfree documentation

#### Production (Live)
- Use in Settings: Production App ID and Secret Key  
- API Base URL: `https://api.cashfree.com/pg/orders`
- Change mode in code: `cashfree = window.Cashfree({ mode: 'production' })`

## Testing Flow

### Setup
1. Go to Settings (`/admin/settings`)
2. Add Cashfree Sandbox credentials
3. Save bank details

### Create Paid Event
1. Go to Event Management
2. Create/Edit auction
3. Enable "Collect Payment on Registration"
4. Set registration fee (e.g., ₹500)
5. Save auction

### Test Registration
1. Open public registration link
2. See payment fee banner
3. Fill registration form
4. Click "Proceed to Pay ₹500"
5. Complete payment on Cashfree checkout
6. Verify redirect and registration completion

## Security Features

1. **Payment Verification**: Backend verifies payment with Cashfree API before registration
2. **Single Use**: Payment order can only be used once for registration
3. **Event Validation**: Payment must match the event
4. **Credentials Security**: Secret keys stored encrypted in Firestore
5. **Status Tracking**: Payment status tracked at each step

## Error Handling

### Payment Creation Failures
- Missing Cashfree credentials
- Invalid event or payment settings
- Cashfree API errors

### Payment Verification Failures
- Invalid order ID
- Payment not completed
- Payment already used
- Cashfree verification failed

### User-Friendly Messages
- Clear error messages displayed
- Guidance on next steps
- Support contact information

## Files Modified

### Backend
- `/backend/models.py` - Added payment models
- `/backend/server.py` - Added payment endpoints and updated registration

### Frontend
- `/frontend/public/index.html` - Added Cashfree SDK
- `/frontend/src/pages/Settings.jsx` - Added Cashfree credentials fields
- `/frontend/src/pages/PublicPlayerRegistration.jsx` - Integrated payment flow

## Production Checklist

Before going live:

- [ ] Get Production Cashfree credentials
- [ ] Update Cashfree mode to 'production' in frontend code
- [ ] Change API URLs to production endpoints
- [ ] Test with real payment in production mode
- [ ] Set up payment webhooks (optional)
- [ ] Configure return URLs correctly
- [ ] Add customer support contact
- [ ] Test error scenarios
- [ ] Monitor payment logs
- [ ] Set up payment reconciliation

## Cashfree Documentation

- API Reference: https://www.cashfree.com/docs/api-reference/overview
- Checkout SDK: https://docs.cashfree.com/docs/web-integration
- Dashboard: https://www.cashfree.com/dashboard
- Test Cards: https://docs.cashfree.com/docs/test-environment

## Support

For payment-related issues:
1. Check Cashfree credentials in Settings
2. Verify payment status in Cashfree Dashboard
3. Check backend logs for API errors
4. Contact Cashfree support for payment gateway issues

## Future Enhancements

1. **Payment Webhooks**: Real-time payment status updates
2. **Refund Support**: Handle registration cancellations
3. **Payment History**: Show payment transactions to organizers
4. **Multiple Payment Methods**: UPI, Wallets, EMI options
5. **Invoice Generation**: PDF receipts for players
6. **Payment Analytics**: Revenue reports and insights
7. **Partial Payments**: Installment options
8. **Discounts/Coupons**: Promotional offers
