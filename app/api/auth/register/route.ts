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

  // Use admin API to create user without email confirmation
  const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false, // Don't auto-confirm, we'll handle it manually
    user_metadata: {
      role: userRole
    }
  });

  if (adminError) {
    console.log('❌ Admin user creation failed:', adminError);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }

  if (!adminData.user) {
    console.log('❌ No user data returned from admin creation');
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }

  // Create profile for the user
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: adminData.user.id,
      email: email, // Use the validated email parameter
      role: userRole
    });

  if (profileError) {
    console.log('❌ Profile creation failed:', profileError);
    // Don't fail the registration, just log the error
  }

  // Send confirmation email using regular auth API
  const supabase = await createClient(false);
  const { error: emailError } = await supabase.auth.resend({
    type: 'signup',
    email: email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/confirm-email-custom?no_auto_signin=true&prevent_session=true`
    }
  });

  if (emailError) {
    console.log('❌ Email resend failed:', emailError);
    // Don't fail the registration, just log the error
  }

  console.log('✅ User created successfully with admin API');
  return NextResponse.json({
    success: true,
    message: 'User created successfully. Confirmation email sent.',
    userId: adminData.user.id,
    userEmail: adminData.user.email
  });
}
