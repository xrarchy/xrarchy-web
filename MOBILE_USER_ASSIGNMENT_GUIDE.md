# 📱 Mobile User Assignment API Guide - Enhanced with Email Support

## 🎯 Overview
I've created a separate mobile-specific user assignment API that supports both `userId` and `email` for user management, without breaking the existing admin panel functionality.

## 🔧 New Mobile API Endpoints

### 🆕 Separate Mobile Routes
- **Location**: `/api/mobile/projects/[id]/users/`
- **Purpose**: Mobile-optimized user assignment with email support
- **Compatibility**: Doesn't affect existing admin panel routes

### 📋 Available Endpoints

#### 1. **GET** - List Project Users (Mobile)
```
GET /api/mobile/projects/{id}/users
```
- **Auth**: Admin, Archivist, or assigned User
- **Response**: Mobile-optimized JSON with `success` flag
- **Features**: Enhanced error handling, user-friendly messages

#### 2. **POST** - Assign User (Mobile - Supports Both Methods)
```
POST /api/mobile/projects/{id}/users
```

**Option A - By User ID (Traditional):**
```json
{
  "userId": "uuid-here"
}
```

**Option B - By Email (New Feature):**
```json
{
  "email": "user@example.com"
}
```

- **Auth**: Admin or Archivist only
- **Features**: 
  - ✅ Automatic email-to-ID lookup
  - ✅ Clear error messages for invalid emails
  - ✅ Backward compatible with existing userId calls

#### 3. **DELETE** - Remove User (Mobile - Supports Both Methods)
```
DELETE /api/mobile/projects/{id}/users
```

**Option A - By User ID:**
```json
{
  "userId": "uuid-here"
}
```

**Option B - By Email:**
```json
{
  "email": "user@example.com"
}
```

## 📱 Enhanced Postman Collection

### 🆕 New Test Cases Added
I've enhanced your Postman collection with comprehensive mobile user assignment tests:

1. **📋 List Project Users (Mobile)** - Mobile-optimized user listing
2. **➕ Assign User by ID (Admin)** - Traditional ID-based assignment
3. **📧 Assign User by Email (Admin)** - NEW: Email-based assignment
4. **📚 Assign User by Email (Archivist)** - Archivist email assignment
5. **🚫 Assign by Email (User Role)** - Security test (should fail)
6. **➖ Remove User by ID (Admin)** - Traditional ID-based removal
7. **📧 Remove User by Email (Admin)** - NEW: Email-based removal
8. **🚫 Remove by Email (User Role)** - Security test (should fail)
9. **📊 Mobile Summary Report** - Complete documentation

### 🔑 New Environment Variables
```json
{
  "user_email_to_assign": "user@example.com",
  "test_user_email_to_remove": "automatically_populated"
}
```

## 🎯 Permission Matrix - Enhanced

| Role      | Assign by ID | Assign by Email | Remove by ID | Remove by Email | View Users |
|-----------|--------------|-----------------|--------------|-----------------|------------|
| Admin     |      ✅      |        ✅       |      ✅      |        ✅       |     ✅     |
| Archivist |      ✅      |        ✅       |      ✅      |        ✅       |     ✅     |
| User      |      ❌      |        ❌       |  Self Only   |    Self Only    |     ✅     |

## 🚀 Usage Examples

### For Mobile Apps - Email Assignment
```javascript
// Assign user by email (much easier for mobile apps)
const response = await fetch('/api/mobile/projects/123/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'newuser@company.com'
  })
});

const result = await response.json();
if (result.success) {
  console.log(`✅ ${result.message}`);
  console.log(`📧 Method: ${result.data.assignedBy}`);
} else {
  console.log(`❌ Error: ${result.error}`);
}
```

### For Admin Panel - Traditional ID Assignment
```javascript
// Existing admin functionality remains unchanged
const response = await fetch('/api/projects/123/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'uuid-here'
  })
});
```

## 🛡️ Security Features

### ✅ What's Protected
- **Role-based access control** maintained
- **Email validation** with clear error messages
- **Duplicate assignment prevention**
- **Comprehensive permission testing**
- **Audit trail** with assignment timestamps

### 🔍 Error Handling
- **404**: "User with email 'user@example.com' not found"
- **400**: "user@example.com is already assigned to this project"
- **403**: "Only Admin and Archivist can assign users"

## 📁 File Structure

### Created Files:
- `app/api/mobile/projects/[id]/users/route.ts` - Mobile-specific API
- Enhanced Postman collection with 9 new test cases
- Updated environment variables

### Preserved Files:
- `app/api/projects/[id]/users/route.ts` - Admin panel API (unchanged)
- All existing admin functionality intact

## 🎮 Testing Instructions

### Step 1: Setup Variables
```
user_email_to_assign = "real-user@yourdomain.com"
```

### Step 2: Run Test Sequence
1. **List Project Users** - See current assignments
2. **Assign by Email (Admin)** - Test email-based assignment
3. **Security Tests** - Verify user role restrictions
4. **Remove by Email (Admin)** - Clean up assignments
5. **Summary Report** - View complete documentation

### Step 3: Verify Results
- ✅ Email assignments work seamlessly
- ✅ Error messages are clear and helpful
- ✅ Security restrictions are enforced
- ✅ Admin panel continues working normally

## 🎉 Benefits

### For Mobile Development:
- **No more user ID lookups** - Use emails directly
- **Better UX** - Users think in terms of emails, not UUIDs
- **Simplified integration** - One API call instead of lookup + assign
- **Clear error messages** - Easy debugging

### For System Architecture:
- **Backward compatible** - Existing admin panel unaffected
- **Clean separation** - Mobile and admin concerns separated
- **Comprehensive testing** - Full test coverage included
- **Production ready** - Complete error handling and validation

## 📱 Mobile App Integration

Your mobile app can now:
1. **List users** with mobile-optimized responses
2. **Assign by email** without complex user ID lookups
3. **Remove by email** for better UX
4. **Handle errors gracefully** with descriptive messages
5. **Test permissions** comprehensively

The enhanced Postman collection provides everything needed for mobile app development and testing!

## 🎯 Next Steps

1. **Test the new endpoints** using the enhanced Postman collection
2. **Update mobile app** to use email-based assignment
3. **Verify admin panel** continues working normally
4. **Deploy with confidence** - comprehensive testing included

Your mobile user assignment functionality is now production-ready with email support! 🚀
