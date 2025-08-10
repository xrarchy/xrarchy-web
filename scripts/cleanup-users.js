const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanupUsers() {
  console.log('🧹 Starting user cleanup...');
  console.log('⚠️  This will delete ALL users except cinani1527@cotasen.com');

  try {
    // First, let's see what users we have
    console.log('\n📋 Current users in database:');
    const { data: currentUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }

    console.log(`📊 Total users found: ${currentUsers.users.length}`);
    currentUsers.users.forEach(user => {
      console.log(`👤 ${user.email} (${user.id}) - Role: ${user.user_metadata?.role || 'none'}`);
    });

    // Find users to delete (all except admin)
    const usersToDelete = currentUsers.users.filter(
      user => user.email !== 'cinani1527@cotasen.com'
    );

    console.log(`\n🗑️  Users to be deleted: ${usersToDelete.length}`);

    if (usersToDelete.length === 0) {
      console.log('✅ No users to delete. Only admin user exists.');
      return;
    }

    // Show users that will be deleted
    usersToDelete.forEach(user => {
      console.log(`❌ Will delete: ${user.email} (${user.id})`);
    });

    console.log('\n⏳ Starting deletion process...');

    // Delete users one by one
    let deletedCount = 0;
    let errorCount = 0;

    for (const user of usersToDelete) {
      try {
        console.log(`🗑️  Deleting user: ${user.email}...`);

        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

        if (deleteError) {
          console.error(`❌ Failed to delete ${user.email}:`, deleteError.message);
          errorCount++;
        } else {
          console.log(`✅ Deleted: ${user.email}`);
          deletedCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`❌ Error deleting ${user.email}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n📈 Cleanup Summary:');
    console.log(`✅ Successfully deleted: ${deletedCount} users`);
    console.log(`❌ Failed to delete: ${errorCount} users`);
    console.log(`👑 Admin user preserved: cinani1527@cotasen.com`);

    // Verify final state
    console.log('\n🔍 Verifying final state...');
    const { data: finalUsers, error: finalError } = await supabase.auth.admin.listUsers();

    if (finalError) {
      console.error('❌ Error verifying final state:', finalError);
      return;
    }

    console.log(`📊 Final user count: ${finalUsers.users.length}`);
    finalUsers.users.forEach(user => {
      console.log(`👤 Remaining: ${user.email} (${user.user_metadata?.role || 'none'})`);
    });

    if (finalUsers.users.length === 1 && finalUsers.users[0].email === 'cinani1527@cotasen.com') {
      console.log('\n🎉 SUCCESS! Database cleaned successfully.');
      console.log('✅ Only admin user remains: cinani1527@cotasen.com');
    } else {
      console.log('\n⚠️  Warning: Unexpected final state. Please verify manually.');
    }

  } catch (error) {
    console.error('❌ Fatal error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupUsers()
  .then(() => {
    console.log('\n✅ User cleanup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
