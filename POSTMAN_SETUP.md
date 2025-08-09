# Archy XR Mobile API - Postman Collection Setup

## 📦 Files Included

1. `Archy_XR_Mobile_API.postman_collection.json` - Complete API collection
2. `Archy_XR_Mobile_API.postman_environment.json` - Environment variables
3. `POSTMAN_SETUP.md` - This setup guide

## 🚀 Quick Setup

### Step 1: Import Collection
1. Open Postman
2. Click **Import** button
3. Select `Archy_XR_Mobile_API.postman_collection.json`
4. Click **Import**

### Step 2: Import Environment
1. Click **Import** button again
2. Select `Archy_XR_Mobile_API.postman_environment.json`
3. Click **Import**

### Step 3: Select Environment
1. In the top-right corner, select **Archy XR Mobile API Environment**
2. Ensure your Next.js server is running: `npm run dev`

## 📋 Collection Structure

### 🔐 Authentication
- **Register User** - Create new user account
- **Confirm Email (Helper)** - Manual email confirmation for testing
- **Login User** - Standard user login
- **Login Admin** - Admin user login (separate token)
- **Login Archivist** - Archivist user login (separate token)
- **Get Profile** - Current user profile
- **Refresh Token** - JWT token refresh
- **Logout** - End session

### 📁 Projects
- **List Projects** - Get accessible projects
- **Create Project (Admin)** - Create new project (admin only)
- **Get Project Details** - Detailed project info
- **Update Project (Admin)** - Modify project (admin only)

### 📎 Files
- **List Project Files** - Get files in project
- **Upload File** - Upload file to project (10MB limit)

### 🔒 Permission Tests
- **User Try Create Project (Should Fail)** - Test access control
- **Invalid Token Test** - Security validation

## 🎯 Pre-configured Credentials

The collection includes working credentials:

### **Admin User**
- Email: `cinani1527@cotasen.com`
- Password: `cinani1527`
- Role: Admin

### **Archivist User**
- Email: `widijiy440@discrip.com`
- Password: `widijiy440`
- Role: Archivist

### **Test User**
- Email: `postman-test@example.com`
- Password: `postman123`
- Role: User (for registration testing)

## 🧪 Testing Flow

### **Complete Authentication Test**
1. **Register User** - Creates test user
2. **Confirm Email (Helper)** - Confirms email
3. **Login User** - Gets JWT tokens
4. **Get Profile** - Verifies login

### **Admin Operations Test**
1. **Login Admin** - Admin authentication
2. **Create Project (Admin)** - Creates new project
3. **List Projects** - Shows all projects
4. **Update Project (Admin)** - Modifies project

### **Archivist Test**
1. **Login Archivist** - Archivist authentication
2. **List Projects** - Shows assigned projects
3. **Get Project Details** - Project information

### **File Management Test**
1. **List Project Files** - Shows project files
2. **Upload File** - Upload test file (select file manually)

### **Permission Testing**
1. **User Try Create Project (Should Fail)** - Tests access control
2. **Invalid Token Test** - Tests security

## 🔧 Environment Variables

### **Automatic Variables** (Set by requests)
- `access_token` - User JWT token
- `admin_token` - Admin JWT token
- `archivist_token` - Archivist JWT token
- `project_id` - Current project ID
- `user_id`, `user_email`, `user_role` - User info

### **Pre-configured Variables**
- `base_url` - http://localhost:3000
- `admin_email` - cinani1527@cotasen.com
- `admin_password` - cinani1527
- `archivist_email` - widijiy440@discrip.com
- `archivist_password` - widijiy440

## ✅ Success Indicators

### **Authentication Working**
- Login requests return `"success": true`
- Tokens are automatically saved to environment
- Profile requests show user details

### **Projects Working**
- List shows accessible projects based on role
- Admin can create/update projects
- Users get permission denied for admin operations

### **Files Working**
- List shows project files (may be empty initially)
- Upload accepts files up to 10MB

### **Security Working**
- Invalid tokens return `INVALID_TOKEN` error
- Non-admin users can't create projects
- Missing auth headers return `MISSING_AUTH_HEADER`

## 🚨 Troubleshooting

### **"Cannot connect" errors**
- Ensure Next.js server is running: `npm run dev`
- Check server is accessible at http://localhost:3000

### **"INVALID_TOKEN" errors**
- Login again to get fresh tokens
- Check environment variables are set

### **"INSUFFICIENT_PERMISSIONS" errors**
- Use correct login (Admin for admin operations)
- Check user role in response

### **Environment variables not working**
- Select correct environment in dropdown
- Check variable names match exactly

## 🎉 Ready to Test!

1. **Import both files** into Postman
2. **Select the environment**
3. **Start with "Login Archivist"** to test your specific case
4. **Check console output** for detailed logs
5. **Verify tokens are saved** in environment variables

The Archivist login should work perfectly with the pre-configured credentials! 🚀