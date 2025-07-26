import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('=== User Registration Request ===');

  const { email, password, role } = await request.json();
  console.log('Registration attempt for:', email, 'with role:', role);

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const validRoles = ['Admin', 'Archivist', 'User'];
  const userRole = validRoles.includes(role) ? role : 'User';
  console.log('Final role:', userRole);

  // Check if user already exists in profiles table
  const supabaseAdmin = await createClient(true);
  console.log('Created admin client, checking for existing user...');

  try {
    // Check profiles table
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle no results

    console.log('Profile check result:', { existingProfile, profileCheckError });

    if (profileCheckError) {
      console.error('Profile check error:', profileCheckError.message);
      return NextResponse.json({ error: 'Database error checking existing user' }, { status: 500 });
    }

    if (existingProfile) {
      console.log('User already exists in profiles:', existingProfile);
      return NextResponse.json({ error: 'An account with this email already exists. Please use the login page.' }, { status: 400 });
    }

    // Skip Auth API checks due to database connectivity issues
    console.log('Skipping auth check due to known database issues, proceeding with registration...');

  } catch (error) {
    console.error('Database error finding user:', error);
    return NextResponse.json({ error: 'Database error checking existing user' }, { status: 500 });
  }

  // Sign up the user using admin client
  console.log('Starting user signup with admin client...');
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true // Auto-confirm email when creating via admin
  });

  console.log('Signup result:', {
    userId: data?.user?.id,
    userEmail: data?.user?.email,
    error: error?.message,
    fullError: error
  });

  if (error) {
    console.error('Sign-up error:', error.message);
    console.error('Full error object:', error);

    // Handle specific error cases
    if (error.message.includes('already registered') || error.message.includes('already been registered')) {
      return NextResponse.json({ error: 'An account with this email already exists. Please use the login page.' }, { status: 400 });
    }

    if (error.message.includes('Database error checking email') || error.code === 'unexpected_failure') {
      console.log('Auth system has connectivity issues. Attempting alternative user creation...');
      return NextResponse.json({
        error: 'Authentication system is temporarily unavailable. Please try again in a few minutes, or contact support if the issue persists.'
      }, { status: 503 });
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.user) {
    console.error('No user data returned from sign-up');
    return NextResponse.json({ error: 'User creation failed' }, { status: 500 });
  }

  // Use service role client to insert profile (bypassing RLS)
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: data.user.id,
      email,
      role: userRole,
    });

  if (profileError) {
    console.error('Profile insert error:', profileError.message);
    console.error('Full profile error:', profileError);

    // Handle duplicate key constraint
    if (profileError.message.includes('duplicate key') || profileError.message.includes('profiles_email_key')) {
      return NextResponse.json({ error: 'An account with this email already exists. Please use the login page.' }, { status: 400 });
    }

    // Handle foreign key constraint error (auth system connectivity issue)
    if (profileError.message.includes('foreign key constraint') || profileError.message.includes('profiles_id_fkey')) {
      console.error('Foreign key constraint error - likely auth system connectivity issue');

      // Clean up the auth user that was created but can't have a profile
      try {
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        console.log('Cleaned up orphaned auth user');
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }

      return NextResponse.json({
        error: 'Authentication system is experiencing connectivity issues. Please try again in a few minutes.'
      }, { status: 503 });
    }

    return NextResponse.json({ error: `Failed to create user profile: ${profileError.message}` }, { status: 500 });
  }

  return NextResponse.json({ user: data.user }, { status: 200 });
}
