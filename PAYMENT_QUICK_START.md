# Quick Start: Cashfree Payment Integration

## For Organizers

### Step 1: Get Cashfree Credentials
1. Sign up at [cashfree.com](https://www.cashfree.com)
2. Go to Dashboard → Settings → API Keys
3. Copy your **App ID** and **Secret Key** (use Sandbox for testing)

### Step 2: Configure Payment Settings
1. Login to PowerAuction admin
2. Go to **Settings** (top navigation)
3. Scroll to "Cashfree Payment Gateway" section
4. Enter your **Cashfree App ID**
5. Enter your **Cashfree Secret Key**
6. Save bank details

### Step 3: Enable Payment for Auction
1. Go to **Auctions** → Create/Edit Auction
2. Scroll to "Payment Settings" section
3. Toggle **"Collect Payment on Registration"** ON
4. Enter **Registration Fee** amount (e.g., 500 for ₹500)
5. Save auction

### Step 4: Share Registration Link
1. On auction card, click **"Share Registration Link"**
2. Share link with players
3. Players will see payment requirement
4. Payment collected automatically during registration

## For Players

### Registration with Payment Flow

1. **Open Registration Link**
   - Provided by organizer

2. **See Payment Information**
   - Registration fee amount displayed prominently
   - Secure payment badge shown

3. **Fill Registration Form**
   - Name, Contact Number, and Email are required for payment
   - Complete other optional fields

4. **Click "Proceed to Pay ₹XXX"**
   - Creates payment order
   - Opens Cashfree secure checkout

5. **Complete Payment**
   - Choose payment method (Card/UPI/Net Banking)
   - Enter payment details
   - Confirm payment

6. **Automatic Return**
   - Redirected back to registration page
   - Payment verified automatically
   - Registration submitted

7. **Confirmation**
   - Success message shown
   - Organizer will review registration

## Payment Methods Supported

- 💳 **Credit/Debit Cards**
- 📱 **UPI** (Google Pay, PhonePe, Paytm, etc.)
- 🏦 **Net Banking**
- 💰 **Wallets**

## Testing with Sandbox

### Test Card Details
```
Card Number: 4111 1111 1111 1111
CVV: 123
Expiry: Any future date
OTP: 123456 (for test mode)
```

### Test UPI
```
VPA: success@upi
```

## Troubleshooting

### Payment Not Working?
1. ✅ Check Cashfree credentials in Settings
2. ✅ Verify payment is enabled for the auction
3. ✅ Ensure registration fee is set
4. ✅ Check Name, Email, Phone are filled correctly

### Payment Completed But Registration Failed?
1. Contact organizer with order ID
2. Check email for payment confirmation
3. Organizer can verify in Cashfree Dashboard

### Wrong Amount Charged?
1. Check auction's registration fee setting
2. Contact organizer to update if incorrect

## For Developers

### Switch to Production

1. **Get Production Credentials**
   - From Cashfree Dashboard → Production API Keys

2. **Update Settings**
   - Replace sandbox credentials with production ones

3. **Change Code** (frontend/src/pages/PublicPlayerRegistration.jsx)
   ```javascript
   const cashfree = window.Cashfree({
     mode: 'production'  // Change from 'sandbox'
   });
   ```

4. **Update Backend** (backend/server.py)
   ```python
   # Line ~3148 and ~3222
   cashfree_url = "https://api.cashfree.com/pg/orders"  
   # Change from sandbox.cashfree.com
   ```

### Environment Variables
```bash
# Backend .env
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

## Support

**Cashfree Support:**
- Email: care@cashfree.com
- Phone: +91 80 6191 7888
- Docs: https://docs.cashfree.com

**PowerAuction Support:**
- Check integration docs: CASHFREE_INTEGRATION.md
- Review payment logs in backend
