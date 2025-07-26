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
    envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function listTables() {
    try {
        console.log('🔍 Checking database tables...\n');

        // Try to query information_schema to get table list
        const { data, error } = await supabase.rpc('get_table_list');

        if (error) {
            console.log('❌ Could not use RPC function. Checking individual tables instead...\n');

            // Check each table we know exists
            const tablesToCheck = ['profiles', 'files', 'projects', 'project_assignments'];

            for (const table of tablesToCheck) {
                try {
                    const { data, error } = await supabase
                        .from(table)
                        .select('*')
                        .limit(1);

                    if (!error) {
                        console.log(`✅ Table "${table}" exists`);

                        // Get column info by trying to select with specific fields
                        const { data: sample } = await supabase
                            .from(table)
                            .select('*')
                            .limit(1);

                        if (sample && sample.length > 0) {
                            console.log(`   Columns: ${Object.keys(sample[0]).join(', ')}`);
                        } else {
                            console.log(`   (Empty table)`);
                        }
                    } else {
                        console.log(`❌ Table "${table}" does not exist or no access`);
                    }
                } catch (e) {
                    console.log(`❌ Table "${table}" does not exist or no access`);
                }
                console.log('');
            }
        } else {
            console.log('✅ Tables found:', data);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

listTables();
