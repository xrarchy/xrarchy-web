# 👥 User Assignment API Guide

## Overview
Your Postman collection already mentions user assignment APIs in the description, but the actual endpoints weren't included. This guide provides complete implementation details and testing instructions.

## 🔧 Available APIs

### 1. List Project Users
- **Endpoint**: `GET /api/projects/{id}/users`
- **Description**: Get all users assigned to a project
- **Authorization**: Admin, Archivist, or assigned User
- **Response**: Array of user assignments with details

### 2. Assign User to Project
- **Endpoint**: `POST /api/projects/{id}/users`
- **Description**: Assign a user to a project
- **Authorization**: Admin or Archivist only
- **Body**: `{ "userId": "user-id-here" }`

### 3. Remove User from Project
- **Endpoint**: `DELETE /api/projects/{id}/users`
- **Description**: Remove a user from a project
- **Authorization**: Admin or Archivist only
- **Body**: `{ "userId": "user-id-here" }`

## 🎯 Permission Matrix

| Role      | List Users | Assign Users | Remove Users |
|-----------|------------|--------------|--------------|
| Admin     | ✅         | ✅           | ✅           |
| Archivist | ✅         | ✅           | ✅           |
| User      | ✅         | ❌           | Self Only    |

## 🚀 How to Add to Your Postman Collection

### Option 1: Use the Pre-Built Section
I've created a complete `user-assignment-postman-section.json` file with 8 comprehensive test cases. You can:

1. Open your main Postman collection file
2. Find the "File Management" section (around line 1107)
3. Insert the contents of `user-assignment-postman-section.json` before it
4. Add proper JSON formatting (commas, brackets)

### Option 2: Manual Addition
Import these endpoints individually in Postman:

#### 📋 List Project Users
```javascript
// URL: {{base_url}}/api/projects/{{admin_project_id}}/users
// Method: GET
// Auth: Bearer {{admin_token}}

// Test Script:
const response = pm.response.json();
pm.test('Project users listed successfully', () => {
    pm.expect(response).to.have.property('assignments');
});
```

#### ➕ Assign User (Admin)
```javascript
// URL: {{base_url}}/api/projects/{{admin_project_id}}/users
// Method: POST
// Auth: Bearer {{admin_token}}
// Body: {"userId": "{{user_id_to_assign}}"}

// Test Script:
const response = pm.response.json();
if (response.success) {
    console.log('✅ User Assignment Success');
    pm.environment.set('assigned_user_id', response.assignment.assigned_user.id);
}
```

#### 🚫 Assign User (User Role - Should Fail)
```javascript
// URL: {{base_url}}/api/projects/{{admin_project_id}}/users
// Method: POST
// Auth: Bearer {{user_token}}
// Body: {"userId": "{{user_id_to_assign}}"}

// Test Script:
pm.test('Regular users cannot assign users', () => {
    pm.expect(pm.response.code).to.equal(403);
});
```

## 🔑 Required Environment Variables

Add these to your Postman environment:

```json
{
  "user_id_to_assign": "Get this from admin users list",
  "assigned_user_id": "Set automatically by assignment tests", 
  "test_user_to_remove": "Set automatically by user list tests"
}
```

## 📊 Test Cases Included

1. **📋 List Project Users** - View all assigned users
2. **➕ Assign User (Admin)** - Admin assigns user successfully
3. **➕ Assign User (Archivist)** - Archivist assigns user
4. **🚫 Assign User (User Role)** - User role blocked (security test)
5. **➖ Remove User (Admin)** - Admin removes user successfully
6. **➖ Remove User (Archivist)** - Archivist removes user
7. **🚫 Remove User (User Role)** - User role blocked (security test)
8. **📊 Summary Report** - Complete permission matrix and docs

## 🎮 How to Use

### Step 1: Setup Environment Variables
1. Run the "Admin Users List" endpoint to get user IDs
2. Set `user_id_to_assign` to a valid user ID
3. The other variables will be set automatically by the tests

### Step 2: Execute Test Sequence
1. **List Project Users** - See current assignments
2. **Assign User (Admin)** - Add a user to the project
3. **Security Tests** - Verify user role cannot assign/remove
4. **Remove User (Admin)** - Clean up test assignments
5. **Summary Report** - View complete documentation

### Step 3: Verify Results
- Check console logs for detailed test results
- Verify 403 errors for unauthorized actions
- Confirm successful assignments/removals return proper data

## 🔒 Security Features

- **Role-based access control**: Only Admin/Archivist can manage assignments
- **Duplicate prevention**: Cannot assign same user twice
- **Audit trail**: All assignments tracked with timestamps
- **Permission validation**: Comprehensive security testing included

## 🐛 Troubleshooting

### Common Issues:
1. **403 Forbidden**: Check user role permissions
2. **400 Bad Request**: User already assigned or invalid user ID
3. **404 Not Found**: Project or user doesn't exist

### Debug Steps:
1. Verify authentication tokens are valid
2. Check user roles in admin panel
3. Confirm project IDs exist
4. Review console logs for detailed error messages

## 📁 File Location
The complete user assignment section is available in:
`user-assignment-postman-section.json`

This contains all 8 test cases ready for integration into your main collection.
