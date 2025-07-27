# Email Confirmation Flow

## Overview

The email confirmation system has been redesigned to handle Supabase email confirmation links properly while preserving existing admin sessions and providing clear user feedback.

## Flow Description

### 1. Email Confirmation Link Structure

When a user registers, Supabase sends an email with a confirmation link that looks like:
```
https://your-project.supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=http://localhost:3000/api/auth/confirm-email-custom?no_auto_signin=true&prevent_session=true
```

### 2. Custom Redirect Handler (`/api/auth/confirm-email-custom`)

- Receives the redirect from Supabase
- Cannot access URL hash fragments (server-side limitation)
- Redirects to `/confirm` page with parameters

### 3. Confirmation Page (`/confirm`)

The confirmation page handles multiple scenarios:

#### A. Hash Fragment Processing (Primary Method)
- Extracts JWT tokens from URL hash fragment (`#access_token=...&refresh_token=...`)
- Calls `/api/auth/confirm-email` API with tokens
- Preserves existing admin sessions
- Shows success/error messages

#### B. URL Parameter Processing (Fallback)
- Handles tokens passed as URL parameters
- Supports legacy confirmation methods

#### C. Direct Success/Error Handling
- Handles direct success/error responses from API
- Shows appropriate messages

### 4. Confirmation API (`/api/auth/confirm-email`)

#### JWT Token Processing
- Uses `setSession()` to verify JWT tokens from email links
- Extracts user information from verified session
- Confirms email using admin API
- Returns success/error responses

#### Code-based Processing
- Uses `exchangeCodeForSession()` for code-based confirmation
- Handles standard Supabase confirmation codes

### 5. Session Management

#### Admin Session Preservation
- Detects if user is currently logged in as admin
- Preserves admin session during confirmation process
- Shows admin email in confirmation page
- No session interference for admin users

#### Non-Admin Users
- No session is set during confirmation
- Users must log in after confirmation
- Clean separation between confirmation and authentication

## Key Features

### ✅ Session Safety
- Admin sessions are preserved during confirmation
- No accidental session overwrites
- Clear separation between confirmation and login

### ✅ Error Handling
- Expired link detection
- Invalid token handling
- Clear error messages
- User-friendly fallbacks

### ✅ User Experience
- Loading states during confirmation
- Success/error feedback
- Automatic redirects to login
- Manual action buttons

### ✅ Security
- Token verification before confirmation
- Admin-only email confirmation
- No session leaks
- Proper error sanitization

## Testing Scenarios

### 1. Fresh Confirmation (No Admin Session)
1. User clicks email confirmation link
2. Redirects to `/confirm` page
3. Tokens extracted from hash fragment
4. Email confirmed via API
5. Success message shown
6. Redirects to login page

### 2. Admin User Confirming Another User
1. Admin is logged in
2. Admin clicks confirmation link for another user
3. Admin session detected and preserved
4. Other user's email confirmed
5. Admin session remains intact
6. Success message shown

### 3. Expired Link
1. User clicks expired confirmation link
2. Error detected during verification
3. Expired link message shown
4. User can register again or try login

### 4. Already Confirmed Email
1. User clicks confirmation link for already confirmed email
2. System detects email is already confirmed
3. Success message shown
4. Redirects to login page

## Configuration

### Environment Variables
- `NEXT_PUBLIC_SITE_URL`: Base URL for redirects
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

### Middleware Configuration
- Confirmation routes (`/confirm`, `/api/auth/confirm`) are excluded from authentication checks
- Prevents interference with confirmation process

## Troubleshooting

### Common Issues

1. **"Email link is invalid or has expired"**
   - Link has expired (default: 1 hour)
   - User needs to register again

2. **"No confirmation tokens found"**
   - Malformed confirmation link
   - Check email link format

3. **Admin session lost during confirmation**
   - Check middleware configuration
   - Verify session preservation logic

4. **Confirmation succeeds but user can't login**
   - Check if email was actually confirmed in database
   - Verify admin API permissions

### Debug Steps

1. Check browser console for confirmation process logs
2. Verify API responses in Network tab
3. Check server logs for confirmation API calls
4. Verify database email confirmation status
5. Test with fresh registration and confirmation link 