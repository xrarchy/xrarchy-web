# Mobile API Updates & Postman Collection

## 📱 NEW FEATURES IMPLEMENTED

### 1. **Browse All Projects** (`/api/mobile/projects/browse`)
- ✅ **NEW ENDPOINT**: Users can now browse ALL projects in the system, not just assigned ones
- **Key Features**:
  - Shows all projects with pagination (`?page=1&limit=20`)
  - Search functionality (`?search=tower`)
  - Clear indicators for:
    - `isAssigned`: Whether user is assigned to the project
    - `canAccess`: Whether user can access project details
    - `userRole`: User's role (Admin/Archivist/User)
  - **Admin users**: Can access all projects
  - **Regular users**: Can browse all but only access assigned ones

### 2. **Enhanced Location Support**
- ✅ All mobile endpoints now support comprehensive location data:
  - `latitude` & `longitude` coordinates with validation
  - `location_name` - Human readable location name
  - `address` - Full address
  - `location_description` - Detailed description
- ✅ Coordinate validation (lat: -90 to 90, lng: -180 to 180)

### 3. **Improved Error Handling**
- ✅ Structured error responses with error codes:
  - `MISSING_AUTH_HEADER`
  - `INVALID_TOKEN`
  - `INVALID_LATITUDE`/`INVALID_LONGITUDE`
  - `INSUFFICIENT_PERMISSIONS`
  - `PROJECT_ACCESS_DENIED`
- ✅ User-friendly error messages for mobile apps

## 📋 EXISTING MOBILE API STRUCTURE

### Authentication (`/api/mobile/auth/`)
- ✅ `POST /register` - Create new user account
- ✅ `POST /login` - Authenticate user
- ✅ `GET /profile` - Get user profile & stats
- ✅ `PUT /profile` - Update user profile (password)
- ✅ `POST /refresh` - Refresh access token
- ✅ `POST /logout` - Sign out user

### Project Management (`/api/mobile/projects/`)
- ✅ `GET /` - List assigned projects (existing behavior)
- ✅ `POST /` - Create project (Admin only)
- ✅ `GET /browse` - **NEW**: Browse all projects with access indicators
- ✅ `GET /:id` - Get project details
- ✅ `PUT /:id` - Update project (Admin only)
- ✅ `DELETE /:id` - Delete project (Admin only)

### File Management (`/api/mobile/projects/:id/files/`)
- ✅ `GET /` - List project files
- ✅ `POST /` - Upload file to project
- ✅ `GET /:fileId/download` - Get download URL or stream file

## 🎯 KEY POLICY CHANGES

### **Browse vs Assigned Projects**
1. **Regular Project List** (`/api/mobile/projects`):
   - Shows only projects user is assigned to
   - Traditional behavior for "My Projects"

2. **Browse All Projects** (`/api/mobile/projects/browse`):
   - Shows ALL projects in the system
   - Includes `isAssigned` and `canAccess` flags
   - Supports search and pagination
   - Allows users to discover available projects

### **Access Control**
- **Admin**: Full access to all projects and management functions
- **Archivist/User**: Can browse all projects but only access assigned ones
- **File Access**: Requires project assignment (except Admin)

## 📊 POSTMAN COLLECTION UPDATES

### **New Test Sections Added**:

1. **🔍 Project Discovery**:
   - User Browse All Projects
   - Admin Browse All Projects  
   - Search Projects
   - Compare Assigned vs Browse functionality

2. **🚀 Complete Mobile Workflow**:
   - End-to-end mobile app testing flow
   - Project creation via mobile API
   - Verification of browse functionality

3. **Enhanced Authentication Tests**:
   - Profile management
   - Token refresh flows
   - Error handling validation

### **New Environment Variables**:
- `browse_project_id` - For browse testing
- `mobile_new_project_id` - Mobile-created projects
- `workflow_project_id` - Workflow testing
- Location coordinates for multiple landmarks

## 🔧 TESTING RECOMMENDATIONS

### **Complete Mobile Workflow Test**:
1. Register → Login → Get Profile
2. List Assigned Projects (limited view)
3. Browse All Projects (discovery view)
4. Access project details (with permission checks)
5. File operations (upload/download)
6. Token refresh → Logout

### **Permission Testing**:
- Test browse endpoint with different user roles
- Verify access control on project details
- Confirm file access restrictions

### **Search & Discovery**:
- Test search functionality across projects
- Verify pagination works correctly
- Test location-based filtering

## ✅ PRODUCTION READY

The mobile API now provides:
- **Complete feature parity** with web interface
- **Enhanced discovery** - users can find all available projects
- **Clear permission indicators** - users know what they can access
- **Comprehensive error handling** - mobile-friendly error responses
- **Location-rich data** - full geographic information
- **Secure file operations** - protected downloads with proper auth

All endpoints are tested and ready for mobile app integration.
