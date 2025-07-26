const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables from .env file
const envFile = fs.readFileSync('.env', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL,
    envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runSchema() {
    try {
        console.log('🚀 Running safe schema creation...\n');

        // Read the schema file
        const schemaSQL = fs.readFileSync('database/final-schema.sql', 'utf8');

        // Split into individual statements
        const statements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt && !stmt.startsWith('--') && stmt.length > 0);

        console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];

            if (statement.includes('CREATE TABLE')) {
                const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
                console.log(`📊 Creating table: ${tableName}`);
            } else if (statement.includes('ALTER TABLE')) {
                const tableName = statement.match(/ALTER TABLE (\w+)/)?.[1];
                console.log(`🔧 Modifying table: ${tableName}`);
            } else if (statement.includes('CREATE INDEX')) {
                const indexName = statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1];
                console.log(`⚡ Creating index: ${indexName}`);
            } else if (statement.includes('CREATE POLICY')) {
                const policyName = statement.match(/CREATE POLICY "([^"]+)"/)?.[1];
                console.log(`🔐 Creating policy: ${policyName}`);
            } else if (statement.includes('CREATE OR REPLACE FUNCTION')) {
                console.log(`⚙️ Creating function: update_updated_at_column`);
            } else if (statement.includes('CREATE TRIGGER')) {
                console.log(`🎯 Creating trigger: update_projects_updated_at`);
            } else {
                console.log(`🔄 Executing: ${statement.substring(0, 50)}...`);
            }

            const { error } = await supabase.rpc('exec_sql', { sql: statement });

            if (error) {
                console.log(`❌ Error: ${error.message}`);
                // Continue with other statements
            } else {
                console.log(`✅ Success`);
            }
            console.log('');
        }

        console.log('🎉 Schema execution completed!\n');

        // Test that tables were created
        console.log('🧪 Testing table creation...\n');

        const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('*')
            .limit(1);

        if (!projectsError) {
            console.log('✅ Projects table created successfully');
        } else {
            console.log('❌ Projects table issue:', projectsError.message);
        }

        const { data: assignments, error: assignmentsError } = await supabase
            .from('project_assignments')
            .select('*')
            .limit(1);

        if (!assignmentsError) {
            console.log('✅ Project assignments table created successfully');
        } else {
            console.log('❌ Project assignments table issue:', assignmentsError.message);
        }

        console.log('\n🎯 Ready to test project management features!');

    } catch (error) {
        console.error('💥 Script error:', error.message);
    }
}

runSchema();
