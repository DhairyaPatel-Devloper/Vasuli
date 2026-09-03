import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'operator')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, operators: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;
    if (!email) {
      return NextResponse.json({ success: false, error: 'email is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    let userId = null;
    if (password) {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'operator' },
      });

      if (authError && !authError.message.includes('already registered')) {
        console.warn('[operators] Auth admin createUser warning:', authError.message);
      }
      if (authUser?.user) {
        userId = authUser.user.id;
      }
    }

    const profileData = {
      email,
      role: 'operator',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    if (userId) {
      profileData.id = userId;
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert([profileData], { onConflict: 'email' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, operator: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, is_active, email, password } = body;
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });

    const supabase = getSupabaseServerClient();

    if (password) {
      await supabase.auth.admin.updateUserById(id, { password }).catch((e) => {
        console.warn('[operators] Auth admin password update warning:', e.message);
      });
    }

    const updates = {};
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (email) updates.email = email;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, operator: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

