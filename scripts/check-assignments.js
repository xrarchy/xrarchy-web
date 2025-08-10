const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserAssignments() {
  try {
    console.log('🔍 Checking user project assignments...');

    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`\n👥 Found ${users.users.length} users:\n`);

    for (const user of users.users) {
      const role = user.user_metadata?.role || 'Unknown';
      console.log(`📧 ${user.email} (${role})`);

      // Check assignments for this user
      const { data: assignments, error: assignError } = await supabase
        .from('project_assignments')
        .select(`
          project_id,
          projects:project_id (
            id,
            name
          )
        `)
        .eq('assigned_user_id', user.id);

      if (assignError) {
        console.error(`   ❌ Error checking assignments: ${assignError.message}`);
        continue;
      }

      if (!assignments || assignments.length === 0) {
        console.log('   📝 No project assignments');
      } else {
        console.log(`   📝 Assigned to ${assignments.length} project(s):`);
        assignments.forEach(assign => {
          const projectName = assign.projects?.name || 'Unknown Project';
          console.log(`      • ${projectName} (${assign.project_id})`);
        });
      }
      console.log('');
    }

    // Also show total project count
    const { count: totalProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total projects in database: ${totalProjects || 0}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserAssignments();
