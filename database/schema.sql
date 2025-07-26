-- Database Schema for Archy XR Web Project Management
-- Run these commands in your Supabase SQL Editor

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived'))
);

-- 2. Project User Assignments (Junction Table)
CREATE TABLE IF NOT EXISTS project_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'Member' CHECK (role IN ('Project Lead', 'Member', 'Viewer')),
    assigned_by UUID REFERENCES profiles(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id) -- Prevents duplicate assignments
);

-- 3. Project Files Table
CREATE TABLE IF NOT EXISTS project_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- Supabase storage path
    file_size BIGINT NOT NULL,
    content_type VARCHAR(255),
    uploaded_by UUID REFERENCES profiles(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

-- 4. Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_users_project_id ON project_users(project_id);
CREATE INDEX IF NOT EXISTS idx_project_users_user_id ON project_users(user_id);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);

-- 5. Row Level Security (RLS) Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Projects Policies
-- Admin can see all projects
CREATE POLICY "Admin can view all projects" ON projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'Admin'
        )
    );

-- Users can see projects they're assigned to
CREATE POLICY "Users can view assigned projects" ON projects
    FOR SELECT USING (
        id IN (
            SELECT project_id FROM project_users 
            WHERE user_id = auth.uid()
        )
    );

-- Only Admin can create projects
CREATE POLICY "Admin can create projects" ON projects
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'Admin'
        )
    );

-- Admin and Archivist can update projects they created or are assigned to
CREATE POLICY "Admin/Archivist can update projects" ON projects
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role IN ('Admin', 'Archivist'))
        )
        AND (
            created_by = auth.uid() 
            OR id IN (
                SELECT project_id FROM project_users 
                WHERE user_id = auth.uid() AND role = 'Project Lead'
            )
        )
    );

-- Only Admin can delete projects
CREATE POLICY "Admin can delete projects" ON projects
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'Admin'
        )
    );

-- Project Users Policies
-- Users can see project assignments for projects they have access to
CREATE POLICY "Users can view project assignments" ON project_users
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE id IN (
                SELECT project_id FROM project_users 
                WHERE user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'Admin'
            )
        )
    );

-- Admin and Archivist can assign users to projects
CREATE POLICY "Admin/Archivist can assign users" ON project_users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('Admin', 'Archivist')
        )
    );

-- Project Files Policies
-- Users can view files for projects they have access to
CREATE POLICY "Users can view project files" ON project_files
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM project_users 
            WHERE user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'Admin'
        )
    );

-- Project members can upload files
CREATE POLICY "Project members can upload files" ON project_files
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT project_id FROM project_users 
            WHERE user_id = auth.uid()
            AND role IN ('Project Lead', 'Member')
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('Admin', 'Archivist')
        )
    );

-- File uploaders and Project Leads can delete files
CREATE POLICY "Users can delete their files" ON project_files
    FOR DELETE USING (
        uploaded_by = auth.uid()
        OR project_id IN (
            SELECT project_id FROM project_users 
            WHERE user_id = auth.uid() AND role = 'Project Lead'
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'Admin'
        )
    );

-- 6. Functions for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Triggers for auto-updating updated_at
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Storage bucket for project files (run this in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('project-files', 'project-files', false);

-- 9. Storage policies (run after creating bucket)
-- CREATE POLICY "Project members can upload files" ON storage.objects
--     FOR INSERT WITH CHECK (
--         bucket_id = 'project-files'
--         AND auth.role() = 'authenticated'
--     );

-- CREATE POLICY "Project members can view files" ON storage.objects
--     FOR SELECT USING (
--         bucket_id = 'project-files'
--         AND auth.role() = 'authenticated'
--     );
