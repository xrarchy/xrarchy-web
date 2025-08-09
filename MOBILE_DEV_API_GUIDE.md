# Archy XR Mobile API - Developer Guide

## 🎯 Overview

This guide explains the complete API flow, user roles, and permissions for mobile app developers integrating with the Archy XR backend.

## 👥 User Roles & Permissions

### 🔴 **Admin Role**
**Highest level access - Full system control**

**Capabilities:**
- ✅ View ALL projects in the system
- ✅ Create new projects
- ✅ Update any project details
- ✅ Delete projects
- ✅ Assign users to projects
- ✅ Upload files to any project
- ✅ View files in any project
- ✅ Manage user accounts

**Use Cases:**
- System administrators
- Project managers
- IT staff

### 🟡 **Archivist Role**
**Medium level access - Project-focused work**

**Capabilities:**
- ✅ View projects they are assigned to
- ❌ Cannot create new projects
- ❌ Cannot update project details
- ❌ Cannot delete projects
- ✅ Upload files to assigned projects
- ✅ View files in assigned projects
- ✅ Manage their own profile

**Use Cases:**
- Content creators
- Data entry specialists
- Project contributors

### 🟢 **User Role**
**Basic level access - Limited project access**

**Capabilities:**
- ✅ View projects they are assigned to
- ❌ Cannot create new projects
- ❌ Cannot update project details
- ❌ Cannot delete projects
- ✅ View files in assigned projects
- ❌ Cannot upload files (read-only access)
- ✅ Manage their own profile

**Use Cases:**
- Viewers
- Clients
- Read-only stakeholders

## 🔐 Authentication Flow

### **Step 1: User Registration**
```http
POST /api/mobile/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "role": "User" // or "Archivist" (Admin cannot be registered via API)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to confirm your account.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "User",
      "emailConfirmed": false,
      "createdAt": "2025-01-01T00:00:00Z"
    },
    "requiresEmailConfirmation": true
  }
}
```

### **Step 2: Email Confirmation**
- User receives email with confirmation link
- User clicks link to confirm email
- Account becomes active

### **Step 3: Login**
```http
POST /api/mobile/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "User",
      "emailConfirmed": true,
      "createdAt": "2025-01-01T00:00:00Z"
    },
    "session": {
      "accessToken": "eyJ...",
      "refreshToken": "abc123...",
      "expiresAt": 1640995200,
      "expiresIn": 3600
    }
  }
}
```

### **Step 4: Store Tokens**
```javascript
// Store tokens securely in your mobile app
const accessToken = response.data.session.accessToken;
const refreshToken = response.data.session.refreshToken;
const userRole = response.data.user.role;

// Use accessToken for all subsequent API calls
```

## 📱 Mobile App Implementation

### **Authentication Headers**
All protected endpoints require:
```http
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### **Token Management**
```javascript
// Check if token is expired
const isTokenExpired = (expiresAt) => {
  return Date.now() / 1000 > expiresAt;
};

// Refresh token when needed
const refreshAccessToken = async (refreshToken) => {
  const response = await fetch('/api/mobile/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  const data = await response.json();
  if (data.success) {
    // Update stored tokens
    return data.data.session;
  }
  throw new Error('Token refresh failed');
};
```

## 🔄 API Endpoints by Role

### **🔐 Authentication Endpoints (All Roles)**

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/mobile/auth/register` | POST | Register new user | ❌ |
| `/api/mobile/auth/login` | POST | User login | ❌ |
| `/api/mobile/auth/refresh` | POST | Refresh access token | ❌ |
| `/api/mobile/auth/profile` | GET | Get user profile | ✅ |
| `/api/mobile/auth/profile` | PUT | Update profile | ✅ |
| `/api/mobile/auth/logout` | POST | Logout user | ✅ |

### **📁 Project Endpoints**

| Endpoint | Method | Admin | Archivist | User | Description |
|----------|--------|-------|-----------|------|-------------|
| `/api/mobile/projects` | GET | ✅ All projects | ✅ Assigned only | ✅ Assigned only | List projects |
| `/api/mobile/projects` | POST | ✅ | ❌ | ❌ | Create project |
| `/api/mobile/projects/{id}` | GET | ✅ | ✅ If assigned | ✅ If assigned | Get project details |
| `/api/mobile/projects/{id}` | PUT | ✅ | ❌ | ❌ | Update project |
| `/api/mobile/projects/{id}` | DELETE | ✅ | ❌ | ❌ | Delete project |

### **📎 File Endpoints**

| Endpoint | Method | Admin | Archivist | User | Description |
|----------|--------|-------|-----------|------|-------------|
| `/api/mobile/projects/{id}/files` | GET | ✅ | ✅ If assigned | ✅ If assigned | List project files |
| `/api/mobile/projects/{id}/files` | POST | ✅ | ✅ If assigned | ❌ | Upload file |

## 🎯 Role-Based UI Implementation

### **Admin User Interface**
```javascript
const AdminDashboard = ({ user }) => {
  return (
    <div>
      {/* Show all features */}
      <CreateProjectButton />
      <AllProjectsList />
      <ProjectManagement />
      <FileUpload />
      <UserManagement />
    </div>
  );
};
```

### **Archivist User Interface**
```javascript
const ArchivistDashboard = ({ user }) => {
  return (
    <div>
      {/* Show assigned projects only */}
      <AssignedProjectsList />
      <FileUpload /> {/* Only for assigned projects */}
      <ProfileManagement />
      {/* Hide: Create Project, Delete Project, User Management */}
    </div>
  );
};
```

### **User Interface**
```javascript
const UserDashboard = ({ user }) => {
  return (
    <div>
      {/* Read-only access */}
      <AssignedProjectsList />
      <ViewFiles /> {/* Read-only */}
      <ProfileManagement />
      {/* Hide: Create Project, Upload Files, Delete, Edit */}
    </div>
  );
};
```

## 🔒 Permission Checking

### **Frontend Permission Helper**
```javascript
const checkPermission = (userRole, action, resource) => {
  const permissions = {
    Admin: {
      projects: ['create', 'read', 'update', 'delete'],
      files: ['upload', 'read', 'delete'],
      users: ['manage']
    },
    Archivist: {
      projects: ['read'], // only assigned
      files: ['upload', 'read'], // only assigned projects
      users: []
    },
    User: {
      projects: ['read'], // only assigned
      files: ['read'], // only assigned projects
      users: []
    }
  };
  
  return permissions[userRole]?.[resource]?.includes(action) || false;
};

// Usage
const canCreateProject = checkPermission(user.role, 'create', 'projects');
const canUploadFiles = checkPermission(user.role, 'upload', 'files');
```

## 📊 API Response Patterns

### **Success Response**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### **Error Response**
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

### **Common Error Codes**
- `MISSING_AUTH_HEADER` - No authorization header
- `INVALID_TOKEN` - Token expired or invalid
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `PROJECT_ACCESS_DENIED` - User not assigned to project
- `FILE_TOO_LARGE` - File exceeds 10MB limit
- `PROJECT_NOT_FOUND` - Project doesn't exist

## 🚀 Implementation Examples

### **Project List with Role-Based Filtering**
```javascript
const fetchProjects = async (accessToken) => {
  const response = await fetch('/api/mobile/projects', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (data.success) {
    // data.data.projects contains only projects user can access
    // data.data.userRole tells you the user's role
    return {
      projects: data.data.projects,
      userRole: data.data.userRole,
      totalCount: data.data.totalCount
    };
  }
  
  throw new Error(data.error);
};
```

### **File Upload with Permission Check**
```javascript
const uploadFile = async (projectId, file, accessToken, userRole) => {
  // Check permission first
  if (!checkPermission(userRole, 'upload', 'files')) {
    throw new Error('You do not have permission to upload files');
  }
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', file.name);
  
  const response = await fetch(`/api/mobile/projects/${projectId}/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData
  });
  
  const data = await response.json();
  
  if (data.success) {
    return data.data.file;
  }
  
  throw new Error(data.error);
};
```

## 🎯 Mobile App Flow Summary

### **App Startup**
1. Check for stored tokens
2. If tokens exist, validate with `/api/mobile/auth/profile`
3. If invalid, redirect to login
4. If valid, load user role and configure UI

### **Main App Flow**
1. **Login** → Get tokens and user role
2. **Configure UI** → Show/hide features based on role
3. **Load Projects** → Fetch accessible projects
4. **Project Details** → Show files and details
5. **File Operations** → Upload (if permitted) or view
6. **Token Management** → Auto-refresh when needed

### **Logout Flow**
1. Call `/api/mobile/auth/logout`
2. Clear stored tokens
3. Clear user data
4. Redirect to login screen

This guide provides everything your mobile development team needs to implement role-based access control and integrate with the Archy XR API! 🚀