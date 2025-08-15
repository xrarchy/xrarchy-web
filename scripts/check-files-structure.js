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

async function checkTableStructure() {
    try {
        console.log('🔍 Checking files table structure...\n');

        // Try to insert a dummy record to see what fields are expected
        const testData = {
            filename: 'test.txt',
            file_url: 'test-url',
            uploaded_by: 'test-user',
            latitude: null,
            longitude: null,
            height: null,
            rotation: null
        };

        const { data, error } = await supabase
            .from('files')
            .insert(testData)
            .select();

        if (error) {
            console.log('❌ Insert failed (this helps us see the table structure):');
            console.log('Error message:', error.message);
            console.log('Error details:', error.details);
            console.log('Error hint:', error.hint);
        } else {
            console.log('✅ Insert succeeded, table structure allows:', Object.keys(data[0]));

            // Clean up the test record
            await supabase
                .from('files')
                .delete()
                .eq('file_url', 'test-url');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkTableStructure();
