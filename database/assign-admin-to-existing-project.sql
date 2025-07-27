-- Assign Admin user to the existing project that's failing
-- Run this in Supabase SQL Editor

-- Assign the Admin user to the project they're trying to upload to
INSERT INTO project_assignments (project_id, assigned_user_id, assigned_by, assigned_at)
VALUES (
    '79d39890-99ce-4783-9dcc-61f9b4136c10',
    'a68acf4f-44ba-49cf-ad76-20a6d2fc01ce',
    'a68acf4f-44ba-49cf-ad76-20a6d2fc01ce',
    NOW()
) ON CONFLICT (project_id, assigned_user_id) DO NOTHING;

-- Verify the assignment was created
SELECT 
    pa.project_id,
    pa.assigned_user_id,
    p.email as user_email,
    p.role as user_role,
    proj.name as project_name
FROM project_assignments pa
JOIN profiles p ON pa.assigned_user_id = p.id
JOIN projects proj ON pa.project_id = proj.id
WHERE pa.project_id = '79d39890-99ce-4783-9dcc-61f9b4136c10'
AND pa.assigned_user_id = 'a68acf4f-44ba-49cf-ad76-20a6d2fc01ce';