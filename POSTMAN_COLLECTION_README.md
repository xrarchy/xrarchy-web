# Archy XR Mobile API v2.0 - Postman Collection & Environment

## 📋 Overview

This updated Postman collection and environment reflects the corrected access control implementation for the Archy XR Mobile API. The collection has been completely rewritten to focus on testing the corrected permission system and includes comprehensive verification of all access control scenarios.

## 🔑 Key Changes in v2.0

### Access Control Corrections
- **Users** can now view ALL projects (not just assigned ones) but cannot modify any projects
- **Archivists** can only view assigned projects and cannot modify any projects  
- **Admins** maintain full access to all operations
- Fixed database schema issues (removed non-existent `status` column)
- Enhanced error handling with proper HTTP status codes

### API Improvements
- Corrected mobile projects browse endpoint (`/api/mobile/projects/browse`)
- Fixed mobile projects list endpoint (`/api/mobile/projects`)
- Resolved TypeScript compilation issues
- Added comprehensive debug logging

## 📊 Access Control Matrix

| Role      | View Projects | Create Projects | Modify Projects | Delete Projects |
|-----------|---------------|-----------------|-----------------|------------------|
| Admin     | All projects  | ✅ Yes         | ✅ Yes         | ✅ Yes          |
| User      | All projects  | ❌ No          | ❌ No          | ❌ No           |
| Archivist | Only assigned | ❌ No          | ❌ No          | ❌ No           |

## 🚀 How to Use

### 1. Import Collection & Environment
1. Import `Archy_XR_Mobile_API_v2.postman_collection.json` into Postman
2. Import `Archy_XR_Mobile_API_v2.postman_environment.json` into Postman
3. Select the "Archy XR Mobile API Environment - v2.0" environment

### 2. Test User Credentials
The environment includes pre-configured test users:

- **Admin**: `cinani1527@cotasen.com` / `cinani1527`
- **User**: `caxax53312@cronack.com` / `caxax53312`  
- **Archivist**: `ratbblkjiu@wnbaldwy.com` / `ratbblkjiu`

### 3. Running Tests

#### Quick Access Control Verification
1. Run all requests in "🔐 Authentication" folder to get tokens
2. Run all requests in "🔒 Access Control Tests" folder
3. Check console output for verification results

#### Comprehensive Testing
1. **Authentication**: Login all user types
2. **Access Control Tests**: Verify permission matrix
3. **Project Browse & Discovery**: Test browse functionality
4. **Project Management**: Test creation/modification restrictions
5. **File Management**: Test file access permissions
6. **Complete Workflow**: Run end-to-end scenarios

## 🔍 Test Scenarios Covered

### Access Control Verification
- ✅ Admin can access all projects
- ✅ User can view all projects but cannot create/modify any
- ✅ Archivist can only view assigned projects and cannot create/modify any
- ✅ Proper HTTP 403 responses for unauthorized operations

### Browse vs Assigned Projects
- ✅ Browse endpoint shows ALL projects with access indicators
- ✅ Assigned projects endpoint shows only user's assigned projects
- ✅ Clear differentiation between view access and assignment status

### Error Handling
- ✅ Invalid token handling
- ✅ Missing authentication headers
- ✅ Proper HTTP status codes (401, 403, 404, 500)
- ✅ Descriptive error messages with error codes

## 📁 Collection Structure

### 🔐 Authentication
- Login endpoints for all user roles
- Token management and validation

### 🔒 Access Control Tests
- Comprehensive permission verification
- Role-based access testing
- Security boundary validation
- Access control matrix verification

### 📁 Project Browse & Discovery
- Browse all projects endpoint testing
- Search functionality testing
- Role-specific project visibility verification

### 📋 Project Management
- Project listing (assigned only)
- Project creation (Admin only)
- Modification restriction testing

### 📎 File Management
- File listing and access testing
- Permission-based file operations

### 🚀 Complete Workflow Test
- End-to-end mobile app workflow demonstration
- Integration testing scenarios

## 🛠️ Environment Variables

### Base Configuration
- `base_url`: Development server URL (localhost:3000)

### User Credentials
- `admin_email`, `admin_password`: Admin user credentials
- `user_email`, `user_password`: Regular user credentials  
- `archivist_email`, `archivist_password`: Archivist credentials

### Auto-populated Tokens
- `admin_token`, `user_token`, `archivist_token`: Access tokens
- `admin_refresh`, `user_refresh`, `archivist_refresh`: Refresh tokens

### Test Data
- Location coordinates for test projects (Eiffel Tower, Colosseum, Great Wall)
- Sample project and file IDs for testing

## 🔧 Development Setup

1. Ensure the development server is running on `localhost:3000`
2. Database should have the corrected schema (no `status` column in projects table)
3. Test users should exist in the database with appropriate roles

## ✅ Verification Checklist

Run the collection and verify:

- [ ] All user types can login successfully
- [ ] Admin can access all projects via browse endpoint
- [ ] User can view all projects but creation returns 403
- [ ] Archivist can only see assigned projects (may be 0)
- [ ] Archivist project creation returns 403
- [ ] Browse endpoint returns proper `canAccess` and `isAssigned` flags
- [ ] No database schema errors in server logs
- [ ] All API responses include proper success/error structure

## 🐛 Troubleshooting

### Common Issues
1. **403 errors for Admin**: Check admin token is valid and user has Admin role
2. **Database errors**: Ensure projects table doesn't have status column
3. **User can create projects**: Verify access control logic is correctly implemented
4. **Archivist sees all projects**: Check browse endpoint logic for role restrictions

### Server Logs
Monitor server console for:
- API request logging
- Database query errors
- Authentication failures
- Access control debug messages

---

**Updated**: August 10, 2025  
**Version**: 2.0  
**Status**: Ready for Production Testing ✅
