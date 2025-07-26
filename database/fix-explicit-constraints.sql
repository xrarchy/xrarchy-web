-- Additional fix: Ensure foreign key constraints have exact names Supabase expects

-- Drop and recreate the table with explicit constraint names
DROP TABLE IF EXISTS project_assignments CASCADE;

CREATE TABLE project_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL,
    assigned_user_id UUID NOT NULL,
    assigned_by UUID,
    project_role VARCHAR(50) DEFAULT 'Member',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, assigned_user_id)
);

-- Add foreign key constraints with explicit names
ALTER TABLE project_assignments 
ADD CONSTRAINT project_assignments_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE project_assignments 
ADD CONSTRAINT project_assignments_assigned_user_id_fkey 
FOREIGN KEY (assigned_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE project_assignments 
ADD CONSTRAINT project_assignments_assigned_by_fkey 
FOREIGN KEY (assigned_by) REFERENCES profiles(id);

-- Add indexes for performance
CREATE INDEX idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX idx_project_assignments_assigned_user_id ON project_assignments(assigned_user_id);
CREATE INDEX idx_project_assignments_assigned_by ON project_assignments(assigned_by);

-- Row Level Security
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Project Assignments
CREATE POLICY "assignments_admin_archivist_manage" ON project_assignments FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'Archivist'))
);

CREATE POLICY "assignments_users_view_own" ON project_assignments FOR SELECT USING (
    assigned_user_id = auth.uid()
);

-- Recreate the projects policy that was dropped
DROP POLICY IF EXISTS "projects_users_view_assigned" ON projects;
CREATE POLICY "projects_users_view_assigned" ON projects FOR SELECT USING (
    id IN (SELECT project_id FROM project_assignments WHERE assigned_user_id = auth.uid())
);
