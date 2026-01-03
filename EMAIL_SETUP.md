# Email Configuration Guide

## Zoho SMTP Setup for PowerAuction

This guide explains how to configure email sending from `bid@thepowerauction.com` using Zoho Mail.

### Prerequisites

1. A Zoho Mail account with `bid@thepowerauction.com`
2. Access to your backend server environment variables

### Configuration Steps

#### 1. Get Zoho SMTP Credentials

1. Log in to your Zoho Mail account
2. Go to Settings → Mail Accounts → SMTP Settings
3. Note down the following:
   - **SMTP Host**: `smtppro.zoho.in` (for India region)
   - **SMTP Port**: `465` (SSL) or `587` (TLS/STARTTLS)
   - **Username**: `bid@thepowerauction.com`
   - **Require Authentication**: Yes

#### 2. Generate App-Specific Password (Recommended)

For better security, use an app-specific password instead of your main password:

1. Go to Zoho Accounts → Security → App-Specific Passwords
2. Click "Generate New Password"
3. Name it "PowerAuction Backend"
4. Copy the generated password

#### 3. Configure Backend Environment Variables

Edit your backend `.env` file and add:

```bash
SMTP_USER=bid@thepowerauction.com
SMTP_PASSWORD=your_app_specific_password_here
```

**Security Note:** Never commit the `.env` file to version control!

#### 4. Deploy Backend

Deploy your backend with the new environment variables:

```bash
cd backend
# If using Railway
railway up

# If using another platform, set environment variables through their dashboard
```

### Email Features

The system now sends professional branded emails for:

1. **Password Reset**
   - Triggered when user clicks "Forgot Password"
   - Sends a secure one-time reset link valid for 1 hour
   - Professional HTML email with PowerAuction branding

2. **Welcome Email** (Optional)
   - Can be enabled for new user registrations
   - Includes getting started information

### Testing

To test the email functionality:

1. Go to the login page: https://thepowerauction.com/login
2. Click "Forgot Password?"
3. Enter your email address
4. Check your inbox for the reset email from `bid@thepowerauction.com`

### Email Template Customization

The email templates are located in `backend/email_service.py`. You can customize:

- Email subject lines
- HTML styling and branding
- Email content and messaging
- Links and buttons

### Troubleshooting

**Issue: Emails not sending**
- Verify SMTP credentials are correct
- Check if SMTP_PASSWORD is set in environment variables
- Ensure you're using the correct SMTP server: `smtppro.zoho.in` (India region)
- Ensure port 465 (SSL) is not blocked by firewall
- Try port 587 (TLS) as alternative if SSL is blocked

**Issue: Emails going to spam**
- Configure SPF records for your domain
- Set up DKIM authentication in Zoho
- Add DMARC policy
- Contact Zoho support for deliverability assistance

**Issue: "Authentication failed" error**
- Verify you're using app-specific password, not main password
- Check if 2FA is enabled (requires app-specific password)
- Ensure SMTP is enabled in Zoho Mail settings

### Production Recommendations

1. **Use App-Specific Passwords**: Never use your main Zoho password
2. **Monitor Email Logs**: Check backend logs for email delivery status
3. **Set Up SPF/DKIM**: Configure domain authentication for better deliverability
4. **Rate Limiting**: Implement rate limiting for password reset requests
5. **Token Storage**: In production, use Redis or database instead of in-memory token storage

### Support

For issues with:
- Email configuration: Check Zoho Mail support documentation
- PowerAuction features: Contact the development team
- Backend deployment: Refer to your hosting platform's documentation

---

## API Endpoints

### POST `/api/auth/forgot-password`
Request password reset email

**Parameters:**
- `email` (query param): User's email address

**Response:**
```json
{
  "message": "Password reset email sent successfully"
}
```

### POST `/api/auth/reset-password`
Reset password using token

**Parameters:**
- `token` (query param): Reset token from email
- `new_password` (query param): New password (min 6 characters)

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

---

**Last Updated:** December 2025
