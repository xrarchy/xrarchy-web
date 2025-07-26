# 📊 Database Schema Diagram - Minimal Project Management

## 🗂️ Tables and Their Relationships

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
│  PROJECT_ASSIGNMENTS    │                   │    PROJECT_FILES        │
│─────────────────────────│                   │─────────────────────────│
│ • id (UUID, PK)         │                   │ • id (UUID, PK)         │
│ • project_id (FK) ──────┼── Links to ──────▶│ • project_id (FK)       │
│ • assigned_to (FK) ─────┼─┐   projects.id   │ • filename              │
│ • assigned_by (FK) ─────┼─┤                 │ • file_url              │
│ • assigned_at           │ │                 │ • file_size             │
│ UNIQUE(project_id,      │ │                 │ • content_type          │
│        assigned_to)     │ │                 │ • uploaded_by (FK) ─────┼─┐
└─────────────────────────┘ │                 │ • uploaded_at           │ │
          │                 │                 └─────────────────────────┘ │
          └─────────────────┼───── Both link to profiles.id ─────────────┘
                            │
                            └─── Links to profiles.id
```

## 🔗 Relationship Details

### **1. PROFILES → PROJECTS (One-to-Many)**
```
profiles.id → projects.created_by
• One Admin can create multiple projects
• Each project has one creator
```

### **2. PROJECTS → PROJECT_ASSIGNMENTS (One-to-Many)**
```
projects.id → project_assignments.project_id
• One project can have multiple assigned users
• Each assignment belongs to one project
```

### **3. PROFILES → PROJECT_ASSIGNMENTS (One-to-Many)**
```
profiles.id → project_assignments.assigned_to    (who is assigned)
profiles.id → project_assignments.assigned_by    (who did the assigning)
• One user can be assigned to multiple projects
• One Admin/Archivist can assign multiple users
```

### **4. PROJECTS → PROJECT_FILES (One-to-Many)**
```
projects.id → project_files.project_id
• One project can have multiple files
• Each file belongs to one project
```

### **5. PROFILES → PROJECT_FILES (One-to-Many)**
```
profiles.id → project_files.uploaded_by
• One user can upload multiple files
• Each file has one uploader
```

## 📋 Data Flow Example

```
Example Scenario:
┌─────────────────────────────────────────────────────────────────┐
│ 1. Admin creates "Building XR Model" project                   │
│    profiles(admin@company.com) → projects(Building XR Model)   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Admin assigns John and Sarah to the project                 │
│    project_assignments:                                        │
│    • project_id: Building XR Model                             │
│    • assigned_to: john@company.com                             │
│    • assigned_by: admin@company.com                            │
│                                                                 │
│    • project_id: Building XR Model                             │
│    • assigned_to: sarah@company.com                            │
│    • assigned_by: admin@company.com                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. John uploads files to the project                           │
│    project_files:                                              │
│    • project_id: Building XR Model                             │
│    • filename: "model_v1.fbx"                                  │
│    • file_url: "supabase-storage-url"                          │
│    • uploaded_by: john@company.com                             │
└─────────────────────────────────────────────────────────────────┘
```

## 🔐 Permission Flow

```
WHO CAN DO WHAT:

┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    ADMIN    │    │   ARCHIVIST     │    │   USER/MEMBER   │
├─────────────┤    ├─────────────────┤    ├─────────────────┤
│ ✅ Create    │    │ ❌ Create       │    │ ❌ Create       │
│   projects  │    │   projects      │    │   projects      │
│             │    │                 │    │                 │
│ ✅ Assign    │    │ ✅ Assign       │    │ ❌ Assign       │
│   users     │    │   users         │    │   users         │
│             │    │                 │    │                 │
│ ✅ View all  │    │ ✅ View         │    │ ✅ View         │
│   projects  │    │   assigned      │    │   assigned      │
│             │    │   projects      │    │   projects only │
│             │    │                 │    │                 │
│ ✅ Upload    │    │ ✅ Upload       │    │ ✅ Upload       │
│   files     │    │   files to      │    │   files to      │
│             │    │   assigned      │    │   assigned      │
│             │    │   projects      │    │   projects only │
└─────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 Key Benefits of This Design

✅ **Simple & Clean** - Easy to understand and implement
✅ **Scalable** - Can add more features later
✅ **Secure** - Row Level Security policies protect data
✅ **Flexible** - Admin/Archivist can manage, users can participate
✅ **Audit Trail** - Track who created/assigned/uploaded what and when

This design gives you exactly what you asked for:
- Admin creates projects
- Admin/Archivist assigns users
- Assigned users can upload/view files
- Clean relationships without over-engineering
