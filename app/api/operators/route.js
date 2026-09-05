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

    // Normalize mobile_no / mobile_number for consistency
    const operators = (data || []).map((op) => ({
      ...op,
      mobile_no: op.mobile_no || op.mobile_number || null,
      mobile_number: op.mobile_no || op.mobile_number || null,
    }));

    return NextResponse.json({ success: true, operators });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, mobile_no, mobile_number } = body;
    const resolvedMobile = mobile_no || mobile_number || null;

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
    if (resolvedMobile) {
      profileData.mobile_no = resolvedMobile;
    }
    if (userId) {
      profileData.id = userId;
    }

    let { data, error } = await supabase
      .from('profiles')
      .upsert([profileData], { onConflict: 'email' })
      .select()
      .single();

    if (error && error.message?.includes('schema cache')) {
      delete profileData.mobile_no;
      profileData.mobile_number = resolvedMobile;
      const retry = await supabase
        .from('profiles')
        .upsert([profileData], { onConflict: 'email' })
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    return NextResponse.json({
      success: true,
      operator: {
        ...data,
        mobile_no: data?.mobile_no || data?.mobile_number || resolvedMobile,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, is_active, email, password, mobile_no, mobile_number, role } = body;
    const resolvedMobile = mobile_no !== undefined ? mobile_no : mobile_number;

    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });

    const supabase = getSupabaseServerClient();

    const authUpdates = {};
    if (password && password.trim()) authUpdates.password = password.trim();
    if (email) authUpdates.email = email;

    if (Object.keys(authUpdates).length > 0) {
      await supabase.auth.admin.updateUserById(id, authUpdates).catch((e) => {
        console.warn('[operators] Auth admin updateUserById warning:', e.message);
      });
    }

    const updates = {};
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (resolvedMobile !== undefined) {
      updates.mobile_no = resolvedMobile;
    }

    let { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error && error.message?.includes('schema cache')) {
      delete updates.mobile_no;
      if (resolvedMobile !== undefined) updates.mobile_number = resolvedMobile;
      const retry = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    return NextResponse.json({
      success: true,
      operator: {
        ...data,
        mobile_no: data?.mobile_no || data?.mobile_number || resolvedMobile,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });

    const supabase = getSupabaseServerClient();

    // Hard delete from database
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) throw profileError;

    // Clean up auth user
    await supabase.auth.admin.deleteUser(id).catch((e) => {
      console.warn('[operators] Auth deleteUser warning:', e.message);
    });

    return NextResponse.json({ success: true, message: 'Operator permanently deleted from database' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
