const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSqlFile(filePath) {
    try {
        const sqlContent = fs.readFileSync(filePath, 'utf8');
        console.log(`Running SQL from ${filePath}...`);

        const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });

        if (error) {
            console.error('SQL execution error:', error);
            return false;
        }

        console.log('SQL executed successfully');
        return true;
    } catch (err) {
        console.error('File read error:', err);
        return false;
    }
}

// Get SQL file path from command line argument
const sqlFile = process.argv[2];
if (!sqlFile) {
    console.error('Usage: node run-sql.js <path-to-sql-file>');
    process.exit(1);
}

runSqlFile(sqlFile);