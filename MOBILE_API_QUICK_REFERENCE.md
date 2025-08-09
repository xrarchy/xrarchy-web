# Archy XR Mobile API - Quick Reference

## 🚀 Base URL
```
http://localhost:3000/api/mobile
```

## 🔑 Authentication Header
```http
Authorization: Bearer {accessToken}
```

## 👥 User Roles Summary

| Role | Projects | Files | Admin Actions |
|------|----------|-------|---------------|
| **Admin** | ✅ All projects<br/>✅ Create/Update/Delete | ✅ Upload/View all | ✅ Full access |
| **Archivist** | ✅ Assigned only<br/>❌ No create/update | ✅ Upload/View assigned | ❌ No admin access |
| **User** | ✅ Assigned only<br/>❌ No create/update | ✅ View only assigned<br/>❌ No upload | ❌ No admin access |

## 📱 Essential Endpoints

### Authentication
```http
POST /auth/register     # Register new user
POST /auth/login        # Login user
POST /auth/refresh      # Refresh token
GET  /auth/profile      # Get user profile
POST /auth/logout       # Logout user
```

### Projects
```http
GET  /projects          # List accessible projects
POST /projects          # Create project (Admin only)
GET  /projects/{id}     # Get project details
PUT  /projects/{id}     # Update project (Admin only)
```

### Files
```http
GET  /projects/{id}/files    # List project files
POST /projects/{id}/files    # Upload file (Admin/Archivist only)
```

## 🔒 Permission Matrix

| Action | Admin | Archivist | User |
|--------|-------|-----------|------|
| View assigned projects | ✅ | ✅ | ✅ |
| View all projects | ✅ | ❌ | ❌ |
| Create projects | ✅ | ❌ | ❌ |
| Update projects | ✅ | ❌ | ❌ |
| Delete projects | ✅ | ❌ | ❌ |
| Upload files | ✅ | ✅ | ❌ |
| View files | ✅ | ✅ | ✅ |

## 📊 Response Format

### Success
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

### Error
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## ⚠️ Common Error Codes

- `MISSING_AUTH_HEADER` - No authorization header
- `INVALID_TOKEN` - Token expired/invalid
- `INSUFFICIENT_PERMISSIONS` - User lacks permissions
- `PROJECT_ACCESS_DENIED` - Not assigned to project
- `FILE_TOO_LARGE` - File > 10MB

## 🎯 Mobile Implementation Tips

### Token Storage
```javascript
// Store securely
const tokens = {
  accessToken: response.data.session.accessToken,
  refreshToken: response.data.session.refreshToken,
  expiresAt: response.data.session.expiresAt
};
```

### Role-Based UI
```javascript
const showCreateButton = user.role === 'Admin';
const showUploadButton = ['Admin', 'Archivist'].includes(user.role);
const showReadOnly = user.role === 'User';
```

### API Call Pattern
```javascript
const apiCall = async (endpoint, options = {}) => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error);
  }
  
  return data.data;
};
```

## 🧪 Test Credentials

### Admin
- Email: `cinani1527@cotasen.com`
- Password: `cinani1527`

### Archivist
- Email: `widijiy440@discrip.com`
- Password: `widijiy440`

### User (for testing)
- Email: `postman-test@example.com`
- Password: `postman123`

## 📋 Development Checklist

- [ ] Implement secure token storage
- [ ] Add automatic token refresh
- [ ] Handle role-based UI rendering
- [ ] Implement proper error handling
- [ ] Add offline capability (optional)
- [ ] Test with all user roles
- [ ] Validate file upload limits (10MB)
- [ ] Handle network errors gracefully

## 🔄 Typical App Flow

1. **App Start** → Check stored tokens
2. **Login** → Get tokens + user role
3. **Main Screen** → Load projects based on role
4. **Project View** → Show files + actions based on permissions
5. **File Upload** → Only if user has upload permissions
6. **Token Refresh** → Auto-refresh when needed
7. **Logout** → Clear tokens + redirect

Ready to build! 🚀