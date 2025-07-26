-- SAFE Schema - Won't Break Existing Functionality
-- Based on your files table: id, created_at, name, url, size
-- This script is designed to be safe and non-destructive

-- 1. Create Projects Table (new table, won't affect existing)
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Project Assignments Table (new table, won't affect existing)
CREATE TABLE IF NOT EXISTS project_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES profiles(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, assigned_to)
);

-- 3. SAFELY add project_id to existing files table (nullable, won't break existing files)
ALTER TABLE files ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- 4. SAFELY add uploaded_by to track who uploaded (nullable, won't break existing files)
ALTER TABLE files ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES profiles(id);

-- 5. Indexes for performance (safe to add)
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_assigned_to ON project_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);

-- 6. Row Level Security (only for new tables initially)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
-- DON'T touch files table RLS yet - we'll do this manually later if needed

-- 7. RLS Policies for Projects (new table, safe)
CREATE POLICY "projects_admin_all" ON projects FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
);

CREATE POLICY "projects_users_view_assigned" ON projects FOR SELECT USING (
    id IN (SELECT project_id FROM project_assignments WHERE assigned_to = auth.uid())
);

-- 8. RLS Policies for Project Assignments (new table, safe)
CREATE POLICY "assignments_admin_archivist_manage" ON project_assignments FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'Archivist'))
);

CREATE POLICY "assignments_users_view_own" ON project_assignments FOR SELECT USING (
    assigned_to = auth.uid()
);

-- 9. DON'T MODIFY FILES TABLE RLS POLICIES YET
-- We'll leave existing files table RLS policies unchanged for now
-- You can update them manually later if needed

-- 10. Trigger for updated_at on projects (only affects new table)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SAFETY NOTES:
-- ✅ New columns in files table are NULLABLE - existing files won't break
-- ✅ No RLS changes to files table - existing file access won't change
-- ✅ Only new tables get new policies
-- ✅ All existing functionality should continue to work
-- ✅ You can test new project features without affecting file operations
