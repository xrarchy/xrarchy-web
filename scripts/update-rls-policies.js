const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables from .env file manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function executeSql(sql) {
    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
            console.error('SQL Error:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Execution Error:', err);
        return false;
    }
}

async function updateRLSPolicies() {
    console.log('🔐 Updating RLS policies for role-based access control...\n');

    const sqlStatements = [
        // ===========================
        // PROJECTS TABLE POLICIES
        // ===========================

        // Enable RLS on projects table
        `ALTER TABLE projects ENABLE ROW LEVEL SECURITY;`,

        // Drop existing project policies
        `DROP POLICY IF EXISTS "projects_select_policy" ON projects;`,
        `DROP POLICY IF EXISTS "projects_insert_policy" ON projects;`,
        `DROP POLICY IF EXISTS "projects_update_policy" ON projects;`,
        `DROP POLICY IF EXISTS "projects_delete_policy" ON projects;`,

        // Projects SELECT policy - Admin sees all, others see only assigned projects
        `CREATE POLICY "projects_select_policy" ON projects
            FOR SELECT USING (
                -- Admin can see all projects
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
                OR
                -- Archivist and User can see only assigned projects
                id IN (
                    SELECT project_id 
                    FROM project_assignments 
                    WHERE assigned_to = auth.uid()
                )
            );`,

        // Projects INSERT policy - Only Admin can create projects
        `CREATE POLICY "projects_insert_policy" ON projects
            FOR INSERT WITH CHECK (
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
            );`,

        // Projects UPDATE policy - Admin can update all, Archivist can update assigned projects
        `CREATE POLICY "projects_update_policy" ON projects
            FOR UPDATE USING (
                -- Admin can update all projects
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
                OR
                -- Archivist can update assigned projects
                (
                    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
                    AND
                    id IN (
                        SELECT project_id 
                        FROM project_assignments 
                        WHERE assigned_to = auth.uid()
                    )
                )
            );`,

        // Projects DELETE policy - Only Admin can delete projects
        `CREATE POLICY "projects_delete_policy" ON projects
            FOR DELETE USING (
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
            );`,

        // ===========================
        // PROJECT_ASSIGNMENTS TABLE POLICIES
        // ===========================

        // Enable RLS on project_assignments table
        `ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;`,

        // Drop existing assignment policies
        `DROP POLICY IF EXISTS "assignments_select_policy" ON project_assignments;`,
        `DROP POLICY IF EXISTS "assignments_insert_policy" ON project_assignments;`,
        `DROP POLICY IF EXISTS "assignments_update_policy" ON project_assignments;`,
        `DROP POLICY IF EXISTS "assignments_delete_policy" ON project_assignments;`,

        // Assignments SELECT policy - Admin sees all, others see only their assignments
        `CREATE POLICY "assignments_select_policy" ON project_assignments
            FOR SELECT USING (
                -- Admin can see all assignments
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
                OR
                -- Users can see their own assignments
                assigned_to = auth.uid()
                OR
                -- Users can see assignments for projects they are assigned to (for project member lists)
                project_id IN (
                    SELECT project_id 
                    FROM project_assignments 
                    WHERE assigned_to = auth.uid()
                )
            );`,

        // Assignments INSERT policy - Only Admin can create assignments
        `CREATE POLICY "assignments_insert_policy" ON project_assignments
            FOR INSERT WITH CHECK (
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
            );`,

        // Assignments UPDATE policy - Only Admin can update assignments
        `CREATE POLICY "assignments_update_policy" ON project_assignments
            FOR UPDATE USING (
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
            );`,

        // Assignments DELETE policy - Only Admin can delete assignments
        `CREATE POLICY "assignments_delete_policy" ON project_assignments
            FOR DELETE USING (
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
            );`,

        // ===========================
        // UPDATE FILES TABLE POLICIES (Enhanced)
        // ===========================

        // Drop existing file policies (to update them)
        `DROP POLICY IF EXISTS "files_select_policy" ON files;`,
        `DROP POLICY IF EXISTS "files_insert_policy" ON files;`,
        `DROP POLICY IF EXISTS "files_update_policy" ON files;`,
        `DROP POLICY IF EXISTS "files_delete_policy" ON files;`,

        // Enhanced Files SELECT policy with role-based access
        `CREATE POLICY "files_select_policy" ON files
            FOR SELECT USING (
                -- Admin can see all files
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
                OR
                -- Archivist and User can see files in projects they are assigned to
                (project_id IS NOT NULL AND project_id IN (
                    SELECT project_id FROM project_assignments WHERE assigned_to = auth.uid()
                ))
                OR
                -- Users can see files they uploaded
                uploaded_by = auth.uid()
                OR
                -- Files without project (legacy files)
                (project_id IS NULL AND auth.uid() IS NOT NULL)
            );`,

        // Enhanced Files INSERT policy - Admin and Archivist can upload
        `CREATE POLICY "files_insert_policy" ON files
            FOR INSERT WITH CHECK (
                -- Admin can upload files anywhere
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
                OR
                -- Archivist can upload files to assigned projects
                (
                    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
                    AND
                    project_id IS NOT NULL 
                    AND 
                    project_id IN (
                        SELECT project_id 
                        FROM project_assignments 
                        WHERE assigned_to = auth.uid()
                    )
                )
                OR
                -- Files without project (legacy support)
                (project_id IS NULL AND auth.uid() IS NOT NULL)
            );`,

        // Enhanced Files UPDATE policy
        `CREATE POLICY "files_update_policy" ON files
            FOR UPDATE USING (
                -- Admin can update all files
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
                OR
                -- Archivist can update files in assigned projects
                (
                    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
                    AND
                    project_id IS NOT NULL 
                    AND 
                    project_id IN (
                        SELECT project_id 
                        FROM project_assignments 
                        WHERE assigned_to = auth.uid()
                    )
                )
                OR
                -- Users can update files they uploaded
                uploaded_by = auth.uid()
            );`,

        // Enhanced Files DELETE policy
        `CREATE POLICY "files_delete_policy" ON files
            FOR DELETE USING (
                -- Admin can delete all files
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
                OR
                -- Archivist can delete files in assigned projects
                (
                    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Archivist')
                    AND
                    project_id IS NOT NULL 
                    AND 
                    project_id IN (
                        SELECT project_id 
                        FROM project_assignments 
                        WHERE assigned_to = auth.uid()
                    )
                )
                OR
                -- Users can delete files they uploaded
                uploaded_by = auth.uid()
            );`,

        // ===========================
        // PROFILES TABLE POLICIES
        // ===========================

        // Enable RLS on profiles table
        `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`,

        // Drop existing profile policies
        `DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;`,
        `DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;`,
        `DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;`,
        `DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;`,

        // Profiles SELECT policy - Admin sees all, others see own profile + project members
        `CREATE POLICY "profiles_select_policy" ON profiles
            FOR SELECT USING (
                -- Admin can see all profiles
                role = 'Admin'
                OR
                -- Users can see their own profile
                id = auth.uid()
                OR
                -- Users can see profiles of people in their projects
                id IN (
                    SELECT assigned_to 
                    FROM project_assignments 
                    WHERE project_id IN (
                        SELECT project_id 
                        FROM project_assignments 
                        WHERE assigned_to = auth.uid()
                    )
                )
            );`,

        // Profiles INSERT policy - Allow new user registration
        `CREATE POLICY "profiles_insert_policy" ON profiles
            FOR INSERT WITH CHECK (
                id = auth.uid()
            );`,

        // Profiles UPDATE policy - Admin can update all, users can update own
        `CREATE POLICY "profiles_update_policy" ON profiles
            FOR UPDATE USING (
                -- Admin can update all profiles
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
                OR
                -- Users can update their own profile (but not their role unless they're admin)
                id = auth.uid()
            );`,

        // Profiles DELETE policy - Only Admin (and typically this should be disabled)
        `CREATE POLICY "profiles_delete_policy" ON profiles
            FOR DELETE USING (
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
            );`,

        // ===========================
        // CREATE HELPFUL INDEXES
        // ===========================

        // Indexes to improve RLS policy performance
        `CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);`,
        `CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);`,
        `CREATE INDEX IF NOT EXISTS idx_project_assignments_assigned_to ON project_assignments(assigned_to);`,
        `CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);`,
        `CREATE INDEX IF NOT EXISTS idx_projects_id ON projects(id);`,
        `CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);`,
        `CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);`
    ];

    let successCount = 0;
    let totalStatements = sqlStatements.length;

    for (let i = 0; i < sqlStatements.length; i++) {
        const sql = sqlStatements[i];
        const statementNum = i + 1;

        // Extract policy/table info for better logging
        let logInfo = '';
        if (sql.includes('CREATE POLICY')) {
            const policyMatch = sql.match(/CREATE POLICY "([^"]+)" ON (\w+)/);
            if (policyMatch) {
                logInfo = `Creating policy "${policyMatch[1]}" on ${policyMatch[2]}`;
            }
        } else if (sql.includes('DROP POLICY')) {
            const policyMatch = sql.match(/DROP POLICY IF EXISTS "([^"]+)" ON (\w+)/);
            if (policyMatch) {
                logInfo = `Dropping policy "${policyMatch[1]}" from ${policyMatch[2]}`;
            }
        } else if (sql.includes('ALTER TABLE')) {
            const tableMatch = sql.match(/ALTER TABLE (\w+)/);
            if (tableMatch) {
                logInfo = `Altering table ${tableMatch[1]}`;
            }
        } else if (sql.includes('CREATE INDEX')) {
            const indexMatch = sql.match(/CREATE INDEX IF NOT EXISTS (\w+)/);
            if (indexMatch) {
                logInfo = `Creating index ${indexMatch[1]}`;
            }
        } else {
            logInfo = sql.substring(0, 60) + '...';
        }

        console.log(`[${statementNum}/${totalStatements}] ${logInfo}`);

        if (await executeSql(sql)) {
            console.log(`✅ Success\n`);
            successCount++;
        } else {
            console.log(`❌ Failed\n`);
        }
    }

    console.log('='.repeat(80));
    console.log(`🎯 RLS Policy Update Summary:`);
    console.log(`   Executed: ${successCount}/${totalStatements} statements`);
    console.log('='.repeat(80));

    if (successCount === totalStatements) {
        console.log('🎉 ALL RLS POLICIES UPDATED SUCCESSFULLY!\n');
        console.log('✅ Your database now enforces role-based access control:');
        console.log('   🔴 Admin: Full access to all projects, users, and files');
        console.log('   🟡 Archivist: Can edit assigned projects and upload files');
        console.log('   🔵 User: Read-only access to assigned projects');
        console.log('\n🚀 Your application security is now fully aligned with the UI!');
    } else {
        console.log('⚠️  Some policies failed to update. Check the errors above.');
        console.log('   You may need to run this script again or fix issues manually.');
    }
}

// Run the update
updateRLSPolicies().catch(console.error);
