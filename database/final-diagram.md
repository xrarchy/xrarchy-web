# 📊 FINAL Database Schema - Using Your Existing Files Table

## 🗂️ Correct Tables and Relationships

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
│        PROJECTS         │ ← (NEW table)
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
│  PROJECT_ASSIGNMENTS    │                   │        FILES            │ ← (YOUR existing table)
│─────────────────────────│                   │─────────────────────────│    (We add project_id + uploaded_by)
│ • id (UUID, PK)         │                   │ • id (UUID, PK)         │
│ • project_id (FK) ──────┼── Links to ──────▶│ • created_at            │
│ • assigned_to (FK) ─────┼─┐   projects.id   │ • name (filename)       │
│ • assigned_by (FK) ─────┼─┤                 │ • url (file path)       │
│ • assigned_at           │ │                 │ • size (file size)      │
│ UNIQUE(project_id,      │ │                 │ • project_id (FK) ───── │ ← NEW COLUMN
│        assigned_to)     │ │                 │ • uploaded_by (FK) ──── │ ← NEW COLUMN
└─────────────────────────┘ │                 └─────────────────────────┘ │
          │                 │                           │                 │
          └─────────────────┼───── Both link to ───────┼─────────────────┘
                            │      profiles.id          │
                            └───────────────────────────┘
```

## 🔧 What Gets Added to Your Existing Files Table:

```sql
-- Your current files table columns:
• id (UUID, PK)         ← Already exists ✅
• created_at            ← Already exists ✅  
• name                  ← Already exists ✅ (this is filename)
• url                   ← Already exists ✅ (this is file path/URL)
• size                  ← Already exists ✅ (file size in bytes)

-- What we're adding:
• project_id (FK)       ← NEW - Links to projects.id
• uploaded_by (FK)      ← NEW - Links to profiles.id (who uploaded)
```

## 📋 Perfect! Your Structure Maps To:

| Your Column | Our Usage | Type |
|-------------|-----------|------|
| `id` | File unique ID | UUID (PK) |
| `created_at` | When file was uploaded | Timestamp |
| `name` | Filename (e.g., "model.fbx") | Text |
| `url` | Supabase storage URL/path | Text |
| `size` | File size in bytes | Bigint |
| `project_id` | Which project owns this file | UUID (FK) ← NEW |
| `uploaded_by` | Who uploaded this file | UUID (FK) ← NEW |

## 🎯 This Design Gives You:

✅ **Reuses your existing files table** - No data loss
✅ **Admin creates projects** (`projects` table)
✅ **Admin/Archivist assigns users** (`project_assignments` table)
✅ **Files linked to projects** (add `project_id` to `files`)
✅ **Track who uploaded** (add `uploaded_by` to `files`)
✅ **Clean relationships** with proper foreign keys
✅ **Secure permissions** with RLS policies

## 🚀 Ready to implement?

The SQL is in `database/final-schema.sql`. This will:
1. Create `projects` table
2. Create `project_assignments` table  
3. Add `project_id` and `uploaded_by` columns to your existing `files` table
4. Set up all the relationships and security policies

Perfect fit with your existing structure! 🎯
