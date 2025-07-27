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

async function fixRLS() {
    console.log('🔧 Fixing RLS policies for files table...');

    const sqlStatements = [
        // Add project_role column if missing
        `ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS project_role VARCHAR(50) DEFAULT 'Member';`,

        // Enable RLS on files table
        `ALTER TABLE files ENABLE ROW LEVEL SECURITY;`,

        // Drop existing policies
        `DROP POLICY IF EXISTS "files_select_policy" ON files;`,
        `DROP POLICY IF EXISTS "files_insert_policy" ON files;`,
        `DROP POLICY IF EXISTS "files_update_policy" ON files;`,
        `DROP POLICY IF EXISTS "files_delete_policy" ON files;`,

        // Add missing columns
        `ALTER TABLE files ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);`,
        `ALTER TABLE files ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES profiles(id);`,

        // Create indexes
        `CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);`,
        `CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);`,

        // SELECT policy
        `CREATE POLICY "files_select_policy" ON files
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
                OR
                (project_id IS NOT NULL AND project_id IN (
                    SELECT project_id FROM project_assignments WHERE assigned_to = auth.uid()
                ))
                OR
                uploaded_by = auth.uid()
                OR
                (project_id IS NULL AND auth.uid() IS NOT NULL)
            );`,

        // INSERT policy
        `CREATE POLICY "files_insert_policy" ON files
            FOR INSERT WITH CHECK (
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
                OR
                (project_id IS NOT NULL AND project_id IN (
                    SELECT pa.project_id 
                    FROM project_assignments pa 
                    WHERE pa.assigned_to = auth.uid() 
                    AND (pa.project_role IS NULL OR pa.project_role != 'Viewer')
                ))
                OR
                (project_id IS NULL AND auth.uid() IS NOT NULL)
            );`,

        // UPDATE policy
        `CREATE POLICY "files_update_policy" ON files
            FOR UPDATE USING (
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
                OR
                uploaded_by = auth.uid()
            );`,

        // DELETE policy
        `CREATE POLICY "files_delete_policy" ON files
            FOR DELETE USING (
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
                OR
                uploaded_by = auth.uid()
                OR
                (project_id IS NOT NULL AND project_id IN (
                    SELECT pa.project_id 
                    FROM project_assignments pa 
                    WHERE pa.assigned_to = auth.uid() 
                    AND pa.project_role = 'Project Lead'
                ))
            );`
    ];

    let successCount = 0;
    for (let i = 0; i < sqlStatements.length; i++) {
        const sql = sqlStatements[i];
        console.log(`Executing statement ${i + 1}/${sqlStatements.length}...`);

        if (await executeSql(sql)) {
            successCount++;
        } else {
            console.error(`Failed to execute statement ${i + 1}`);
        }
    }

    console.log(`✅ Completed: ${successCount}/${sqlStatements.length} statements executed successfully`);

    if (successCount === sqlStatements.length) {
        console.log('🎉 RLS policies fixed! File uploads should now work.');
    } else {
        console.log('⚠️  Some statements failed. Check the errors above.');
    }
}

fixRLS();