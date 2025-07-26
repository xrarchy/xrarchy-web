-- RECOMMENDED: Start with Minimal Schema
-- You can always upgrade to full schema later

-- 1. Projects (Admin creates)
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Project Assignments (Admin/Archivist assigns)
CREATE TABLE IF NOT EXISTS project_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES profiles(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, assigned_to)
);

-- 3. Project Files
CREATE TABLE IF NOT EXISTS project_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    content_type VARCHAR(255),
    uploaded_by UUID REFERENCES profiles(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Basic RLS Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Projects: Admin can do everything, assigned users can view
CREATE POLICY "projects_policy" ON projects FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
    OR id IN (SELECT project_id FROM project_assignments WHERE assigned_to = auth.uid())
);

-- Assignments: Admin/Archivist can manage, users can view their assignments
CREATE POLICY "assignments_policy" ON project_assignments FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'Archivist'))
    OR assigned_to = auth.uid()
);

-- Files: Assigned users can upload/view, Admin can do everything
CREATE POLICY "files_policy" ON project_files FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
    OR project_id IN (SELECT project_id FROM project_assignments WHERE assigned_to = auth.uid())
);

-- Indexes for performance
CREATE INDEX idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX idx_project_assignments_assigned_to ON project_assignments(assigned_to);
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
