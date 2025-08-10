# Role-Based Access Control Database Policies

## 🎯 Overview

This document outlines the Supabase Row Level Security (RLS) policies that enforce the three-tier role-based access control system in your application.

## 👥 User Roles

### 🔴 Admin Role
- **Full system access** - Can perform all operations
- **No restrictions** - Bypass most RLS policies
- **User management** - Can assign roles and manage users

### 🟡 Archivist Role  
- **Project-focused access** - Only assigned projects
- **Can edit projects** - Update project details and upload files
- **Cannot create/delete** - No project creation or deletion rights

### 🔵 User Role
- **Read-only access** - View assigned projects only
- **No modifications** - Cannot edit, create, or delete
- **Limited file access** - View files in assigned projects

## 🗄️ Database Table Policies

### `projects` Table

#### SELECT Policy
```sql
-- Admin: See all projects
-- Archivist/User: Only assigned projects
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
OR
id IN (SELECT project_id FROM project_assignments WHERE assigned_to = auth.uid())
```

#### INSERT Policy
```sql
-- Only Admin can create projects
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
```

#### UPDATE Policy
```sql
-- Admin: Update all projects
-- Archivist: Update assigned projects only
-- User: No update access
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
OR
(
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
    AND id IN (SELECT project_id FROM project_assignments WHERE assigned_to = auth.uid())
)
```

#### DELETE Policy
```sql
-- Only Admin can delete projects
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
```

### `project_assignments` Table

#### SELECT Policy
```sql
-- Admin: See all assignments
-- Others: See their assignments + assignments for projects they're in
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
OR assigned_to = auth.uid()
OR project_id IN (SELECT project_id FROM project_assignments WHERE assigned_to = auth.uid())
```

#### INSERT/UPDATE/DELETE Policies
```sql
-- Only Admin can manage project assignments
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
```

### `files` Table

#### SELECT Policy
```sql
-- Admin: See all files
-- Others: Files in assigned projects + files they uploaded
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
OR (project_id IN (SELECT project_id FROM project_assignments WHERE assigned_to = auth.uid()))
OR uploaded_by = auth.uid()
```

#### INSERT Policy
```sql
-- Admin: Upload anywhere
-- Archivist: Upload to assigned projects
-- User: No upload access
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
OR (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
    AND project_id IN (SELECT project_id FROM project_assignments WHERE assigned_to = auth.uid())
)
```

#### UPDATE Policy
```sql
-- Admin: Update all files
-- Archivist: Update files in assigned projects
-- All: Update files they uploaded
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
OR (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
    AND project_id IN (SELECT project_id FROM project_assignments WHERE assigned_to = auth.uid())
)
OR uploaded_by = auth.uid()
```

#### DELETE Policy
```sql
-- Admin: Delete all files
-- Archivist: Delete files in assigned projects
-- All: Delete files they uploaded
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
OR (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
    AND project_id IN (SELECT project_id FROM project_assignments WHERE assigned_to = auth.uid())
)
OR uploaded_by = auth.uid()
```

### `profiles` Table

#### SELECT Policy
```sql
-- Admin: See all profiles
-- Others: See own profile + profiles of project members
role = 'Admin'
OR id = auth.uid()
OR id IN (
    SELECT assigned_to FROM project_assignments 
    WHERE project_id IN (SELECT project_id FROM project_assignments WHERE assigned_to = auth.uid())
)
```

#### INSERT Policy
```sql
-- Allow new user registration
id = auth.uid()
```

#### UPDATE Policy
```sql
-- Admin: Update all profiles
-- Others: Update own profile only
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
OR id = auth.uid()
```

#### DELETE Policy
```sql
-- Only Admin can delete profiles
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
```

## 📈 Performance Indexes

The following indexes are created to optimize RLS policy performance:

```sql
-- Profile role lookups
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_id ON profiles(id);

-- Assignment lookups  
CREATE INDEX idx_project_assignments_assigned_to ON project_assignments(assigned_to);
CREATE INDEX idx_project_assignments_project_id ON project_assignments(project_id);

-- Project and file lookups
CREATE INDEX idx_projects_id ON projects(id);
CREATE INDEX idx_files_project_id ON files(project_id);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
```

## 🔒 Security Benefits

1. **Server-side Enforcement**: All access control happens at the database level
2. **Tamper Resistant**: Users cannot bypass restrictions through API manipulation
3. **Performance Optimized**: Indexed queries ensure fast policy evaluation
4. **Comprehensive Coverage**: Every table has appropriate role-based restrictions
5. **Scalable Design**: Easy to add new roles or modify permissions

## 🚀 Deployment

Run the update script to apply all policies:

```bash
node scripts/update-rls-policies.js
```

This will:
- Enable RLS on all tables
- Drop existing policies
- Create new role-based policies
- Add performance indexes
- Verify successful deployment

## ✅ Testing

After applying policies, test with users of different roles:

1. **Admin User**: Should see all projects, create/edit/delete access
2. **Archivist User**: Should see only assigned projects, edit access
3. **Regular User**: Should see only assigned projects, read-only access

The policies work in conjunction with your frontend role-based UI to provide complete access control.
