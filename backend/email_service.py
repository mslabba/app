import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import secrets
import os
from typing import Optional

# Zoho SMTP Configuration (India)
SMTP_HOST = "smtppro.zoho.in"
SMTP_PORT = 465  # SSL port (use 587 for TLS)
SMTP_USER = os.getenv("SMTP_USER", "bid@thepowerauction.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "msl@OP12")  # Set this in environment variables or fallback
FROM_EMAIL = "bid@thepowerauction.com"
FROM_NAME = "PowerAuction"

# Store reset tokens temporarily (in production, use Redis or database)
password_reset_tokens = {}


def generate_reset_token(email: str) -> str:
    """Generate a secure password reset token"""
    token = secrets.token_urlsafe(32)
    expiry = datetime.now() + timedelta(hours=1)  # Token expires in 1 hour
    password_reset_tokens[token] = {
        "email": email,
        "expiry": expiry
    }
    return token


def verify_reset_token(token: str) -> Optional[str]:
    """Verify reset token and return email if valid"""
    token_data = password_reset_tokens.get(token)
    if not token_data:
        return None
    
    if datetime.now() > token_data["expiry"]:
        # Token expired
        del password_reset_tokens[token]
        return None
    
    return token_data["email"]


def send_password_reset_email(email: str, reset_link: str) -> bool:
    """Send password reset email via Zoho SMTP"""
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Reset Your PowerAuction Password"
        message["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        message["To"] = email

        # HTML email body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .logo {{
                    font-size: 32px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }}
                .logo .power {{
                    color: white;
                }}
                .logo .auction {{
                    color: #dc2626;
                }}
                .tagline {{
                    font-size: 12px;
                    opacity: 0.9;
                }}
                .content {{
                    background: #ffffff;
                    padding: 40px 30px;
                    border: 1px solid #e5e7eb;
                }}
                .button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 15px 40px;
                    text-decoration: none;
                    border-radius: 8px;
                    margin: 20px 0;
                    font-weight: bold;
                }}
                .footer {{
                    background: #f9fafb;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #6b7280;
                    border-radius: 0 0 10px 10px;
                }}
                .warning {{
                    background: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 15px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">
                        <span class="power">Power</span><span class="auction">Auction</span>
                    </div>
                    <div class="tagline">Powered by Turgut</div>
                </div>
                
                <div class="content">
                    <h2 style="color: #667eea; margin-top: 0;">Reset Your Password</h2>
                    
                    <p>Hello,</p>
                    
                    <p>We received a request to reset the password for your PowerAuction account associated with <strong>{email}</strong>.</p>
                    
                    <p>Click the button below to reset your password:</p>
                    
                    <div style="text-align: center;">
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons.
                    </div>
                    
                    <p>If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #667eea;">{reset_link}</p>
                    
                    <p style="margin-top: 30px;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                </div>
                
                <div class="footer">
                    <p><strong>PowerAuction</strong> - Professional Sports Auction Management</p>
                    <p>This is an automated message. Please do not reply to this email.</p>
                    <p style="margin-top: 10px;">© {datetime.now().year} PowerAuction. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Plain text version (fallback)
        text_body = f"""
        PowerAuction - Reset Your Password
        
        We received a request to reset the password for your PowerAuction account.
        
        Email: {email}
        
        Click the link below to reset your password:
        {reset_link}
        
        This link will expire in 1 hour.
        
        If you didn't request a password reset, please ignore this email.
        
        ---
        PowerAuction - Powered by Turgut
        © {datetime.now().year} All rights reserved.
        """

        # Attach both versions
        part1 = MIMEText(text_body, "plain")
        part2 = MIMEText(html_body, "html")
        message.attach(part1)
        message.attach(part2)

        # Send email via Zoho SMTP with timeout
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=30) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)
        
        print(f"Password reset email sent successfully to {email}")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"SMTP Authentication failed for {email}: {str(e)}")
        return False
    except smtplib.SMTPException as e:
        print(f"SMTP error sending email to {email}: {str(e)}")
        return False
    except Exception as e:
        print(f"Failed to send email to {email}: {str(e)}")
        return False


def send_welcome_email(email: str, name: str) -> bool:
    """Send welcome email to new users (optional)"""
    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = "Welcome to PowerAuction!"
        message["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        message["To"] = email

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; }}
                .footer {{ background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;"><span style="color: white;">Power</span><span style="color: #dc2626;">Auction</span></h1>
                    <p style="margin: 5px 0 0 0; font-size: 12px;">Powered by Turgut</p>
                </div>
                <div class="content">
                    <h2 style="color: #667eea;">Welcome to PowerAuction, {name}! 🎉</h2>
                    <p>Thank you for joining PowerAuction, the ultimate platform for sports auction management.</p>
                    <p>You can now access all features including real-time bidding, team management, and analytics.</p>
                    <p>Get started by logging into your account at <a href="https://thepowerauction.com">PowerAuction</a></p>
                </div>
                <div class="footer">
                    <p>© {datetime.now().year} PowerAuction. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        message.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=30) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)
        
        return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"SMTP Authentication failed: {str(e)}")
        return False
    except smtplib.SMTPException as e:
        print(f"SMTP error: {str(e)}")
        return False
    except Exception as e:
        print(f"Failed to send welcome email: {str(e)}")
        return False


ADMIN_NOTIFICATION_EMAIL = os.getenv("ADMIN_NOTIFICATION_EMAIL", "powerauction@inraylabs.com")


def send_new_user_registration_notification(user_data: dict) -> bool:
    """Send admin email notification to powerauction@inraylabs.com when a new user registers"""
    try:
        display_name = user_data.get("display_name", "N/A")
        email = user_data.get("email", "N/A")
        mobile_number = user_data.get("mobile_number", "N/A")
        role = user_data.get("role", "event_organizer")
        created_at = user_data.get("created_at", datetime.now().isoformat())

        message = MIMEMultipart("alternative")
        message["Subject"] = f"[PowerAuction] New User Registered: {display_name}"
        message["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        message["To"] = ADMIN_NOTIFICATION_EMAIL

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }}
                .header {{ background: #1e293b; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }}
                .content {{ padding: 20px; background: #ffffff; }}
                .field {{ margin-bottom: 12px; }}
                .label {{ font-weight: bold; color: #475569; }}
                .value {{ color: #0f172a; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>⚡ PowerAuction - New Registration</h2>
                </div>
                <div class="content">
                    <p>A new user has just created an account on PowerAuction:</p>
                    <div class="field"><span class="label">Full Name:</span> <span class="value">{display_name}</span></div>
                    <div class="field"><span class="label">Email:</span> <span class="value">{email}</span></div>
                    <div class="field"><span class="label">Mobile Number:</span> <span class="value">{mobile_number}</span></div>
                    <div class="field"><span class="label">Role:</span> <span class="value">{role}</span></div>
                    <div class="field"><span class="label">Time:</span> <span class="value">{created_at}</span></div>
                </div>
            </div>
        </body>
        </html>
        """

        message.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=30) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)

        print(f"Admin registration notification sent to {ADMIN_NOTIFICATION_EMAIL} for user {email}")
        return True
    except Exception as e:
        print(f"Failed to send registration admin notification: {str(e)}")
        return False


def send_contact_form_notification(contact_data: dict) -> bool:
    """Send admin email notification to powerauction@inraylabs.com when a new contact / demo request form is submitted"""
    try:
        name = contact_data.get("name", "N/A")
        email = contact_data.get("email", "N/A")
        mobile = contact_data.get("mobile", "N/A")
        organization = contact_data.get("organization", "N/A")
        sport = contact_data.get("sport", "N/A")
        user_message = contact_data.get("message", "N/A")
        submitted_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        message = MIMEMultipart("alternative")
        message["Subject"] = f"[PowerAuction] New Demo Request: {name}{f' ({organization})' if organization else ''}"
        message["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        message["To"] = ADMIN_NOTIFICATION_EMAIL

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }}
                .header {{ background: #0284c7; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }}
                .content {{ padding: 20px; background: #ffffff; }}
                .field {{ margin-bottom: 12px; }}
                .label {{ font-weight: bold; color: #475569; }}
                .value {{ color: #0f172a; }}
                .msg-box {{ background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px; margin-top: 10px; borderRadius: 4px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>📬 PowerAuction - New Contact / Demo Request</h2>
                </div>
                <div class="content">
                    <p>A new demo request was submitted on PowerAuction:</p>
                    <div class="field"><span class="label">Name:</span> <span class="value">{name}</span></div>
                    <div class="field"><span class="label">Work Email:</span> <span class="value">{email}</span></div>
                    <div class="field"><span class="label">Mobile:</span> <span class="value">{mobile}</span></div>
                    <div class="field"><span class="label">Organization / League:</span> <span class="value">{organization}</span></div>
                    <div class="field"><span class="label">Primary Sport:</span> <span class="value">{sport}</span></div>
                    <div class="field"><span class="label">Submitted At:</span> <span class="value">{submitted_at}</span></div>
                    <div class="field">
                        <span class="label">Message / Details:</span>
                        <div class="msg-box">{user_message}</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        message.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=30) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)

        print(f"Admin contact notification sent to {ADMIN_NOTIFICATION_EMAIL} for demo request from {email}")
        return True
    except Exception as e:
        print(f"Failed to send contact admin notification: {str(e)}")
        return False

