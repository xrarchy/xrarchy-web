# 📊 CORRECTED Database Schema - Using Existing Files Table

You're absolutely right! Since you already have a **`files`** table, we should use it instead of creating `project_files`. Here's the corrected schema:

## 🗂️ Updated Tables and Relationships

```
┌─────────────────────────┐
│        PROFILES         │ ← (Existing table)
│─────────────────────────│
│ • id (UUID, PK)         │
│ • email                 │
│ • role (Admin/Archivist │
│   /User)                │
│ • created_at            │
│ • updated_at            │
└─────────┬───────────────┘
          │
          │ (One profile can create many projects)
          │ (One profile can be assigned to many projects)
          │ (One profile can upload many files)
          │
┌─────────▼───────────────┐
│        PROJECTS         │ ← (New table)
│─────────────────────────│
│ • id (UUID, PK)         │
│ • name                  │
│ • description           │
│ • created_by (FK) ──────┼─── Links to profiles.id
│ • created_at            │
│ • updated_at            │
└─────────┬───────────────┘
          │
          │ (One project can have many assignments)
          │ (One project can have many files)
          │
          ├─────────────────────────────────────────────┐
          │                                             │
┌─────────▼───────────────┐                   ┌─────────▼───────────────┐
│  PROJECT_ASSIGNMENTS    │                   │        FILES            │ ← (Existing table)
│─────────────────────────│                   │─────────────────────────│    (We'll add project_id)
│ • id (UUID, PK)         │                   │ • id (UUID, PK)         │
│ • project_id (FK) ──────┼── Links to ──────▶│ • project_id (FK) ───── │ ← NEW COLUMN
│ • assigned_to (FK) ─────┼─┐   projects.id   │ • [existing columns]    │
│ • assigned_by (FK) ─────┼─┤                 │ • uploaded_by (FK) ─────┼─┐
│ • assigned_at           │ │                 │ • uploaded_at           │ │
│ UNIQUE(project_id,      │ │                 │                         │ │
│        assigned_to)     │ │                 └─────────────────────────┘ │
└─────────────────────────┘ │                                             │
          │                 │                                             │
          └─────────────────┼───── Both link to profiles.id ─────────────┘
                            │
                            └─── Links to profiles.id
```

## 🔧 What We Need to Do:

### **1. Add `project_id` to existing `files` table**
```sql
-- Add project_id column to existing files table
ALTER TABLE files ADD COLUMN project_id UUID REFERENCES projects(id);

-- Add index for performance
CREATE INDEX idx_files_project_id ON files(project_id);
```

### **2. Create only the new tables we need**
```sql
-- 1. Projects table (new)
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Project assignments table (new)
CREATE TABLE IF NOT EXISTS project_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES profiles(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, assigned_to)
);
```

## 📋 Questions About Your Existing Files Table:

**I need to know what columns your `files` table currently has. Can you tell me:**

1. What are the current column names in your `files` table?
2. Do you already have columns like:
   - `filename` or `name`?
   - `file_url` or `url` or `path`?
   - `uploaded_by` or `user_id`?
   - `uploaded_at` or `created_at`?
   - `file_size`?
   - `content_type` or `mime_type`?

Once I know the existing structure, I can:
- ✅ Add only the `project_id` column
- ✅ Create proper relationships
- ✅ Update our APIs to use the existing `files` table
- ✅ Keep all your existing file data

**This approach is much better because:**
- 🚀 **Reuses existing table** - No data migration needed
- 🔗 **Simple relationship** - Just add `project_id` foreign key
- 📁 **Unified file management** - All files in one table
- 🛡️ **Maintains existing data** - Nothing gets lost

What does your current `files` table structure look like?
