import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { executeWithCredential } from '@/lib/credential-resolver';

export async function POST(request) {
  try {
    const { leakId } = await request.json();
    if (!leakId) {
      return NextResponse.json({ success: false, error: 'leakId is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Fetch leak
    const { data: leak, error: leakError } = await supabase
      .from('leaks')
      .select('*')
      .eq('id', leakId)
      .single();

    if (leakError || !leak) {
      return NextResponse.json({ success: false, error: 'Leak not found' }, { status: 404 });
    }

    // Validate customer email exists
    if (!leak.customer_email) {
      return NextResponse.json({ success: false, error: 'No customer email on this leak' }, { status: 400 });
    }

    const customerName = leak.customer_name || 'Valued Customer';
    const amount = leak.amount || 0;
    const razorpayId = leak.razorpay_payment_id || '';

    // Send email via credential-resolver
    const credentialResult = await executeWithCredential(
      'email',
      async (apiKey) => {
        const resend = new Resend(apiKey);

        const { data, error } = await resend.emails.send({
          from: 'Vasuli <onboarding@resend.dev>', // Replace with your verified domain in production
          to: leak.customer_email,
          subject: `Payment Follow-up — ₹${amount}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hi ${customerName},</h2>
              <p>We noticed a pending payment of <strong>₹${amount}</strong> associated with your account.</p>
              <p>Our agent will be reaching out to you shortly to help resolve this.</p>
              <p>Reference ID: <strong>${razorpayId}</strong></p>
              <br/>
              <p>If you have any questions, please reply to this email.</p>
              <p>— Vasuli Team</p>
            </div>
          `,
        });

        if (error) throw new Error(error.message);
        return { emailId: data.id };
      },
      leakId,
      'Resend'
    );

    if (!credentialResult.success) {
      return NextResponse.json(
        { success: false, error: credentialResult.error, escalated: credentialResult.escalated },
        { status: credentialResult.escalated ? 200 : 500 }
      );
    }

    const { emailId } = credentialResult.data;

    // Update leak record status and chosen_action in Supabase
    await supabase
      .from('leaks')
      .update({
        status: 'notified',
        chosen_action: 'send_email',
      })
      .eq('id', leakId);

    // Audit log
    await supabase.from('audit_log').insert([{
      leak_id: leakId,
      event_timestamp: new Date().toISOString(),
      event_type: 'notified',
      detail: `Email sent to ${leak.customer_email} (Resend ID: ${emailId})`,
      outcome: 'Email Delivered',
    }]);

    return NextResponse.json({
      success: true,
      leakId,
      emailId,
      sentTo: leak.customer_email,
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
