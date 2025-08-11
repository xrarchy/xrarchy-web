const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function addLocationColumns() {
    console.log('🚀 Adding latitude and longitude columns to files table...\n');

    try {
        // Check if columns already exist
        const { data: existingColumns, error: checkError } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'files')
            .eq('table_schema', 'public')
            .in('column_name', ['latitude', 'longitude']);

        if (checkError) {
            console.error('❌ Error checking existing columns:', checkError);
            return;
        }

        const existingColumnNames = existingColumns?.map(col => col.column_name) || [];
        const latExists = existingColumnNames.includes('latitude');
        const lngExists = existingColumnNames.includes('longitude');

        console.log(`📊 Current status:`);
        console.log(`   - Latitude column exists: ${latExists}`);
        console.log(`   - Longitude column exists: ${lngExists}\n`);

        // Add latitude column if it doesn't exist
        if (!latExists) {
            console.log('➕ Adding latitude column...');
            const { error: latError } = await supabase.rpc('exec_sql', {
                sql: 'ALTER TABLE public.files ADD COLUMN latitude DECIMAL(10, 8) DEFAULT NULL;'
            });

            if (latError) {
                console.error('❌ Error adding latitude column:', latError);
                return;
            }
            console.log('✅ Latitude column added successfully');
        } else {
            console.log('ℹ️  Latitude column already exists');
        }

        // Add longitude column if it doesn't exist
        if (!lngExists) {
            console.log('➕ Adding longitude column...');
            const { error: lngError } = await supabase.rpc('exec_sql', {
                sql: 'ALTER TABLE public.files ADD COLUMN longitude DECIMAL(11, 8) DEFAULT NULL;'
            });

            if (lngError) {
                console.error('❌ Error adding longitude column:', lngError);
                return;
            }
            console.log('✅ Longitude column added successfully');
        } else {
            console.log('ℹ️  Longitude column already exists');
        }

        // Add comments to document the columns
        if (!latExists || !lngExists) {
            console.log('\n📝 Adding column comments...');

            if (!latExists) {
                await supabase.rpc('exec_sql', {
                    sql: "COMMENT ON COLUMN public.files.latitude IS 'Latitude coordinate where the file was captured/created (optional)';"
                });
            }

            if (!lngExists) {
                await supabase.rpc('exec_sql', {
                    sql: "COMMENT ON COLUMN public.files.longitude IS 'Longitude coordinate where the file was captured/created (optional)';"
                });
            }

            console.log('✅ Column comments added');
        }

        // Verify the updated table structure
        console.log('\n📋 Updated files table schema:');
        const { data: updatedSchema, error: schemaError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, column_default')
            .eq('table_name', 'files')
            .eq('table_schema', 'public')
            .order('ordinal_position');

        if (schemaError) {
            console.error('❌ Error fetching updated schema:', schemaError);
            return;
        }

        updatedSchema?.forEach((col, index) => {
            const isNew = ['latitude', 'longitude'].includes(col.column_name);
            const marker = isNew ? '🆕' : '   ';
            console.log(`${marker} ${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
        });

        console.log('\n🎉 Database migration completed successfully!');
        console.log('📱 Mobile and web APIs are now ready to accept latitude/longitude parameters');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
addLocationColumns();
