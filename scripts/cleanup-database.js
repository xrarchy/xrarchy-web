const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanupDatabase() {
  console.log('🧹 Starting complete database cleanup...');
  console.log('⚠️  This will remove all project data and user assignments');

  try {
    // Clean up in dependency order (child tables first)
    console.log('\n🗑️  Cleaning project files...');
    const { error: filesError } = await supabase
      .from('project_files')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (filesError) {
      console.error('❌ Error cleaning project_files:', filesError);
    } else {
      console.log('✅ Project files cleaned');
    }

    console.log('\n🗑️  Cleaning project assignments...');
    const { error: assignmentsError } = await supabase
      .from('project_assignments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (assignmentsError) {
      console.error('❌ Error cleaning project_assignments:', assignmentsError);
    } else {
      console.log('✅ Project assignments cleaned');
    }

    console.log('\n🗑️  Cleaning projects...');
    const { error: projectsError } = await supabase
      .from('projects')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (projectsError) {
      console.error('❌ Error cleaning projects:', projectsError);
    } else {
      console.log('✅ Projects cleaned');
    }

    console.log('\n🗑️  Cleaning user profiles...');
    // Keep only the admin user profile
    const { data: adminUser, error: adminError } = await supabase.auth.admin.listUsers();
    let adminUserId = null;

    if (!adminError && adminUser.users.length > 0) {
      const admin = adminUser.users.find(u => u.email === 'cinani1527@cotasen.com');
      if (admin) {
        adminUserId = admin.id;
        console.log(`👑 Found admin user ID: ${adminUserId}`);
      }
    }

    if (adminUserId) {
      const { error: profilesError } = await supabase
        .from('user_profiles')
        .delete()
        .neq('id', adminUserId); // Keep only admin profile

      if (profilesError) {
        console.error('❌ Error cleaning user_profiles:', profilesError);
      } else {
        console.log('✅ User profiles cleaned (admin preserved)');
      }
    } else {
      // If no admin found, clean all profiles
      const { error: profilesError } = await supabase
        .from('user_profiles')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (profilesError) {
        console.error('❌ Error cleaning user_profiles:', profilesError);
      } else {
        console.log('✅ All user profiles cleaned');
      }
    }

    // Verify cleanup
    console.log('\n🔍 Verifying database state...');

    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });

    const { count: assignmentCount } = await supabase
      .from('project_assignments')
      .select('*', { count: 'exact', head: true });

    const { count: fileCount } = await supabase
      .from('project_files')
      .select('*', { count: 'exact', head: true });

    const { count: profileCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    console.log('\n📊 Final database state:');
    console.log(`📁 Projects: ${projectCount || 0}`);
    console.log(`👥 Project assignments: ${assignmentCount || 0}`);
    console.log(`📎 Project files: ${fileCount || 0}`);
    console.log(`👤 User profiles: ${profileCount || 0}`);

    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('✅ Ready for fresh data');

  } catch (error) {
    console.error('❌ Fatal error during database cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupDatabase()
  .then(() => {
    console.log('\n✅ Database cleanup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database cleanup failed:', error);
    process.exit(1);
  });
