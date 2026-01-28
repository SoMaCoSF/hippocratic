# Authentication System

## Overview

The Hippocratic application uses email/password authentication with email verification for the data ingest page. This ensures only authorized personnel can upload and modify facility data.

## Features

- ✅ Email/password login
- ✅ Email verification with unique keys
- ✅ Time-limited verification tokens (15 minutes)
- ✅ Session tokens (24 hours)
- ✅ Protected ingest page
- ✅ Logout functionality

## Flow

### 1. Login Request
User enters email and password → System validates email against authorized list → Generates verification key → Sends email with verification link

### 2. Email Verification
User clicks link or enters key → System validates key → Creates session token → Stores in localStorage → Grants access

### 3. Session Management
- Session tokens expire after 24 hours
- Tokens stored in localStorage
- Automatic verification on page load
- Logout clears token

## Configuration

### Environment Variables

```bash
# Required for production
AUTHORIZED_EMAILS=admin@hippocratic.app,user@example.com
NEXT_PUBLIC_APP_URL=https://hippocratic.vercel.app

# Optional: Email service (future)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@hippocratic.app
SMTP_PASS=your-password
```

### Authorized Emails

Add authorized emails to `.env.local`:

```bash
AUTHORIZED_EMAILS=admin@hippocratic.app,analyst@example.com,investigator@example.com
```

Or in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add `AUTHORIZED_EMAILS` with comma-separated email addresses

## API Endpoints

### POST `/api/auth/login`

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent",
  "verificationKey": "abc123..." // Only in development
}
```

**Verification Request:**
```json
{
  "verificationKey": "abc123..."
}
```

**Response:**
```json
{
  "success": true,
  "token": "xyz789...",
  "email": "user@example.com"
}
```

### GET `/api/auth/login`

Verify existing token.

**Headers:**
```
Authorization: Bearer xyz789...
```

**Response:**
```json
{
  "valid": true,
  "email": "user@example.com"
}
```

## Components

### `AuthGuard`

Wrapper component that protects routes requiring authentication.

**Usage:**
```tsx
import { AuthGuard } from "@/app/components/AuthGuard";

export default function ProtectedPage() {
  return (
    <AuthGuard>
      <YourProtectedContent />
    </AuthGuard>
  );
}
```

**Features:**
- Shows login form if not authenticated
- Handles email/password submission
- Manages verification flow
- Auto-verifies from URL parameter (`?verify=key`)
- Provides logout button

## Security Considerations

### Current Implementation (Development)

⚠️ **Not production-ready!** Current implementation:
- In-memory token storage (lost on server restart)
- Simple SHA-256 password hashing (use bcrypt in production)
- Verification keys shown in console (for testing)
- No rate limiting
- No CSRF protection

### Production Recommendations

1. **Database Storage**
   - Store tokens in Turso SQLite or Redis
   - Store hashed passwords with bcrypt (cost factor 12+)
   - Track login attempts and failed verifications

2. **Email Service**
   - Integrate SendGrid, AWS SES, or similar
   - Use HTML email templates
   - Track email delivery status

3. **Security Enhancements**
   - Add rate limiting (max 5 attempts per hour)
   - Implement CSRF tokens
   - Use HTTP-only cookies instead of localStorage
   - Add 2FA option
   - Log all authentication events
   - Add IP-based restrictions

4. **Token Management**
   - Rotate tokens regularly
   - Implement refresh tokens
   - Add token revocation endpoint
   - Track active sessions

## Development

### Testing Authentication

1. **Start dev server:**
   ```bash
   cd hippocratic/web
   npm run dev
   ```

2. **Navigate to ingest page:**
   ```
   http://localhost:3000/ingest
   ```

3. **Login with authorized email:**
   - Email: `admin@hippocratic.app`
   - Password: any password (not validated in dev)

4. **Check console for verification key:**
   ```
   ========================================
   VERIFICATION EMAIL
   ========================================
   To: admin@hippocratic.app
   ...
   ```

5. **Verification happens automatically** (key shown in UI in dev mode)

### Adding New Authorized Users

**Development:**
```bash
# .env.local
AUTHORIZED_EMAILS=admin@hippocratic.app,newuser@example.com
```

**Production (Vercel):**
1. Go to Vercel Dashboard
2. Select Project → Settings → Environment Variables
3. Update `AUTHORIZED_EMAILS`
4. Redeploy

## Future Enhancements

- [ ] Role-based access control (admin, analyst, viewer)
- [ ] Audit log for all data changes
- [ ] Password reset flow
- [ ] Account management page
- [ ] Email notification preferences
- [ ] API key generation for programmatic access
- [ ] OAuth integration (Google, Microsoft)
- [ ] Multi-factor authentication
- [ ] Session management dashboard

## Troubleshooting

### "Unauthorized email address"
- Check `AUTHORIZED_EMAILS` environment variable
- Ensure email is in the comma-separated list
- No spaces around commas

### "Invalid or expired verification key"
- Keys expire after 15 minutes
- Request new verification email
- Check for typos in manual entry

### "Token expired"
- Session tokens expire after 24 hours
- Login again to get new token

### Token not persisting
- Check browser localStorage
- Ensure cookies/storage not blocked
- Try different browser

## Support

For access issues, contact your system administrator or the Hippocratic development team.
