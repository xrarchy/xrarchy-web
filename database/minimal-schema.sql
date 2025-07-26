-- Minimal Schema Based on Your Requirements
-- This is the simplified version you described

-- 1. Projects Table (Admin only can create)
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES profiles(id), -- Only Admin
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Project Assignments (Admin or Archivist can assign)
CREATE TABLE IF NOT EXISTS project_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES profiles(id), -- Admin or Archivist
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, assigned_to)
);

-- 3. Project Files
CREATE TABLE IF NOT EXISTS project_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    project_name VARCHAR(255), -- Redundant but you mentioned it
    filename VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL, -- Supabase storage URL
    file_size BIGINT,
    uploaded_by UUID REFERENCES profiles(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Key Questions for You to Consider:
-- 1. Do assigned users have different roles (Lead vs Member vs Viewer)?
-- 2. Can assigned users upload files or only view them?
-- 3. Who can delete files - only uploader or project creator too?
-- 4. Do you need project status/description fields?
-- 5. Should files be organized in folders within projects?
