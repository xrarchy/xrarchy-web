# TODO List

## ✅ COMPLETED
- [x] **Fixed files fetching error** - Enhanced error handling for project files query + separated profile lookups
- [x] **Added more location info** - Now displays location_name, address, description, and coordinates
- [x] **Fixed route flickering** - Optimized role checking and redirects to prevent UI flicker
- [x] **Fixed files console error** - Improved error logging and graceful fallbacks for file queries
- [x] **Fixed files schema mismatch** - Corrected database query to use actual column names (file_name, file_size, created_at)
- [x] **Admin Assign User like Archivist** - Enhanced user assignment to allow assigning ANY user (not just Admin/Archivist) with improved UI
- [x] **Fixed User project routing** - Fixed User dashboard routing to go to correct project detail page instead of Archivist files page
- [x] **Admin auto-assignment** - Creating admin is now automatically assigned to new projects as team member
- [x] **Admin Project full edit** - Complete admin project editing capabilities with comprehensive location fields (name, description, latitude, longitude, address, location_name, location_description) + build error resolution
- [x] **Admin can manage user Roles and data** - Enhanced user management interface with inline role editing, role change confirmation, and improved user permissions display
- [x] **Fix internal handle error properly while creating new project from mobile** - Enhanced mobile API error handling with proper error codes, location field support, validation, and comprehensive project management capabilities
- [x] **Fixed User web access control** - Corrected web interface so Users can only see projects they're assigned to (not all projects)

## 🔴 HIGH PRIORITY

## 🟡 MEDIUM PRIORITY  

## 🟠 LOW PRIORITY
- [ ] **Fix email confirmation route localhost issue** - Email confirmation should use proper domain 

NEW ISSUE : 

~~USER http://localhost:3000/ is able to see all the project even which they not assigned to~~ ✅ FIXED 