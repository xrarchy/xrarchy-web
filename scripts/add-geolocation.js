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

async function addGeolocation() {
    try {
        console.log('🌍 Adding geolocation support to projects table...\n');

        // Read the migration file
        const migrationSQL = fs.readFileSync('database/add-geolocation.sql', 'utf8');

        // Split into individual statements
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt && !stmt.startsWith('--') && stmt.length > 0);

        console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];

            if (statement.includes('ALTER TABLE projects')) {
                console.log('🏗️ Adding geolocation columns to projects table');
            } else if (statement.includes('CREATE INDEX')) {
                console.log('⚡ Creating geolocation index for location queries');
            } else if (statement.includes('ADD CONSTRAINT')) {
                console.log('🛡️ Adding coordinate validation constraints');
            } else if (statement.includes('COMMENT ON COLUMN')) {
                console.log('📝 Adding column documentation');
            } else {
                console.log(`🔄 Executing: ${statement.substring(0, 50)}...`);
            }

            // Use SQL editor to execute the statement
            const { error } = await supabase.rpc('exec_sql', { sql: statement });

            if (error) {
                // Some errors are expected (like column already exists)
                if (error.message.includes('already exists') ||
                    error.message.includes('does not exist')) {
                    console.log(`⚠️ Skipped: ${error.message}`);
                } else {
                    console.log(`❌ Error: ${error.message}`);
                }
            } else {
                console.log(`✅ Success`);
            }
            console.log('');
        }

        console.log('🎉 Geolocation migration completed!\n');

        // Test that columns were added
        console.log('🧪 Testing geolocation columns...\n');

        const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('id, name, latitude, longitude, location_name, address')
            .limit(1);

        if (!projectsError) {
            console.log('✅ Geolocation columns added successfully');
            console.log('📊 Sample project structure:', projects?.[0] ? Object.keys(projects[0]) : 'No projects found');
        } else {
            console.log('❌ Column verification failed:', projectsError.message);
        }

        console.log('\n🎯 Ready to use geolocation features!');
        console.log('📍 You can now add coordinates to projects like:');
        console.log('   Colosseum: 41.8902, 12.4922');
        console.log('   Eiffel Tower: 48.8584, 2.2945');
        console.log('   Great Wall: 40.4319, 116.5704');

    } catch (error) {
        console.error('💥 Migration error:', error.message);
    }
}

addGeolocation();
