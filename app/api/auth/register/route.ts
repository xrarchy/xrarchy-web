import { createSupabaseClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { email, password, role } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const validRoles = ['Admin', 'Archivist', 'User'];
  const userRole = validRoles.includes(role) ? role : 'User';

  const supabase = await createSupabaseClient();

  // Check if user already exists in profiles table
  const supabaseAdmin = await createSupabaseClient(true);
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('email', email)
    .single();

  if (existingProfile) {
    return NextResponse.json({ error: 'An account with this email already exists. Please use the login page.' }, { status: 400 });
  }

  // Sign up the user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${new URL(request.url).origin}/confirm`,
    },
  });

  if (error) {
    console.error('Sign-up error:', error.message);

    // Handle specific error cases
    if (error.message.includes('already registered')) {
      return NextResponse.json({ error: 'An account with this email already exists. Please use the login page.' }, { status: 400 });
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

    // Handle duplicate key constraint
    if (profileError.message.includes('duplicate key') || profileError.message.includes('profiles_email_key')) {
      return NextResponse.json({ error: 'An account with this email already exists. Please use the login page.' }, { status: 400 });
    }

    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ user: data.user }, { status: 200 });
}