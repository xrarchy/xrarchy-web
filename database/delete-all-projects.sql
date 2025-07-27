-- DELETE ALL PROJECTS AND RELATED DATA
-- WARNING: This will permanently delete all projects, assignments, and project files
-- Run this in Supabase SQL Editor

-- 1. Delete all files associated with projects
DELETE FROM files WHERE project_id IS NOT NULL;

-- 2. Delete all project assignments (foreign key constraints require this first)
DELETE FROM project_assignments;

-- 3. Delete all projects
DELETE FROM projects;

-- 4. Reset any sequences if needed (optional)
-- This ensures clean IDs for future projects
-- ALTER SEQUENCE IF EXISTS projects_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS project_assignments_id_seq RESTART WITH 1;

-- 5. Verify deletion (these should return 0 rows)
SELECT COUNT(*) as remaining_projects FROM projects;
SELECT COUNT(*) as remaining_assignments FROM project_assignments;
SELECT COUNT(*) as remaining_project_files FROM files WHERE project_id IS NOT NULL;