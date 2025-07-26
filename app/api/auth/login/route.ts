import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Check if email is confirmed
  if (data.user && !data.user.email_confirmed_at) {
    // Sign out the user since email is not confirmed
    await supabase.auth.signOut();
    return NextResponse.json({
      error: 'Please confirm your email address before logging in. Check your email for the confirmation link.'
    }, { status: 400 });
  }

  return NextResponse.json({ user: data.user, session: data.session }, { status: 200 });
}
