// api/book.js — Vercel serverless function
// Handles booking submission, saves to Supabase, sends email + text

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    clientName, clientPhone, clientEmail,
    service, addons, inspoStyle, notes,
    bookingDate, bookingTime,
    subscribeText, subscribeEmail
  } = req.body;

  // Basic validation
  if (!clientName || !clientPhone || !service || !bookingDate || !bookingTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY   = process.env.RESEND_API_KEY;
  const MINH_EMAIL   = process.env.MINH_EMAIL;
  const MINH_PHONE   = process.env.MINH_PHONE; // your Google Voice number for receiving
  const GV_NUMBER    = process.env.GV_NUMBER;  // Google Voice sending number

  try {
    // ── 1. Check if slot is already taken ──────────────────────────────
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/blocked_slots?booking_date=eq.${encodeURIComponent(bookingDate)}&booking_time=eq.${encodeURIComponent(bookingTime)}`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const existing = await checkRes.json();
    if (existing.length > 0) {
      return res.status(409).json({ error: 'SLOT_TAKEN', message: 'Sorry, that time was just booked! Please pick another.' });
    }

    // ── 2. Save booking to Supabase ────────────────────────────────────
    const bookingRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail || null,
        service,
        addons: addons || null,
        inspo_style: inspoStyle || null,
        notes: notes || null,
        booking_date: bookingDate,
        booking_time: bookingTime,
        status: 'pending',
        subscribe_text: subscribeText || false,
        subscribe_email: subscribeEmail || false
      })
    });
    const [booking] = await bookingRes.json();

    // ── 3. Block the slot ──────────────────────────────────────────────
    await fetch(`${SUPABASE_URL}/rest/v1/blocked_slots`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        booking_date: bookingDate,
        booking_time: bookingTime,
        booking_id: booking.id
      })
    });

    // ── 4. Save subscriber if opted in ────────────────────────────────
    if (subscribeText || subscribeEmail) {
      await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: clientName,
          phone: subscribeText ? clientPhone : null,
          email: subscribeEmail ? clientEmail : null,
          subscribe_text: subscribeText || false,
          subscribe_email: subscribeEmail || false
        })
      });
    }

    // ── 5. Send confirmation email to CLIENT (via Resend) ──────────────
    if (clientEmail) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Nails by Minh <booking@nailsbyminh.com>',
          to: clientEmail,
          subject: `✅ Booking confirmed — ${bookingDate} at ${bookingTime}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="font-size:22px;margin-bottom:4px">You're booked! 💅</h2>
              <p style="color:#666;margin-bottom:20px">Here's your appointment summary:</p>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:8px 0;color:#999;font-size:13px;border-bottom:1px solid #eee;width:40%">Service</td><td style="padding:8px 0;font-size:13px;border-bottom:1px solid #eee">${service}</td></tr>
                ${addons ? `<tr><td style="padding:8px 0;color:#999;font-size:13px;border-bottom:1px solid #eee">Add-ons</td><td style="padding:8px 0;font-size:13px;border-bottom:1px solid #eee">${addons}</td></tr>` : ''}
                <tr><td style="padding:8px 0;color:#999;font-size:13px;border-bottom:1px solid #eee">Date</td><td style="padding:8px 0;font-size:13px;border-bottom:1px solid #eee">${bookingDate}</td></tr>
                <tr><td style="padding:8px 0;color:#999;font-size:13px;border-bottom:1px solid #eee">Time</td><td style="padding:8px 0;font-size:13px;border-bottom:1px solid #eee">${bookingTime}</td></tr>
                <tr><td style="padding:8px 0;color:#999;font-size:13px;border-bottom:1px solid #eee">Location</td><td style="padding:8px 0;font-size:13px;border-bottom:1px solid #eee">Nails by Minh · Station 7</td></tr>
                ${notes ? `<tr><td style="padding:8px 0;color:#999;font-size:13px">Notes</td><td style="padding:8px 0;font-size:13px">${notes}</td></tr>` : ''}
              </table>
              <p style="font-size:12px;color:#999;margin-top:20px">Need to cancel? Reply to this email or text (408) 831-0316 at least 24 hours before your appointment.</p>
              <p style="font-size:13px;color:#c9a87c;margin-top:16px">See you soon! ✨<br><strong>Minh</strong></p>
            </div>
          `
        })
      });
    }

    // ── 6. Notify MINH by email ────────────────────────────────────────
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Booking Alert <booking@nailsbyminh.com>',
        to: MINH_EMAIL,
        subject: `🔔 New booking — ${clientName} on ${bookingDate} at ${bookingTime}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="font-size:20px;margin-bottom:16px">New booking! 🎉</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#999;font-size:13px;border-bottom:1px solid #eee;width:40%">Client</td><td style="padding:8px 0;font-size:13px;font-weight:600;border-bottom:1px solid #eee">${clientName}</td></tr>
              <tr><td style="padding:8px 0;color:#999;font-size:13px;border-bottom:1px solid #eee">Phone</td><td style="padding:8px 0;font-size:13px;border-bottom:1px solid #eee">${clientPhone}</td></tr>
              ${clientEmail ? `<tr><td style="padding:8px 0;color:#999;font-size:13px;border-bottom:1px solid #eee">Email</td><td style="padding:8px 0;font-size:13px;border-bottom:1px solid #eee">${clientEmail}</td></tr>` : ''}
              <tr><td style="padding:8px 0;color:#999;font-size:13px;border-bottom:1px solid #eee">Service</td><td style="padding:8px 0;font-size:13px;border-bottom:1px solid #eee">${service}</td></tr>
              ${addons ? `<tr><td style="padding:8px 0;color:#999;font-size:13px;border-bottom:1px solid #eee">Add-ons</td><td style="padding:8px 0;font-size:13px;border-bottom:1px solid #eee">${addons}</td></tr>` : ''}
              <tr><td style="padding:8px 0;color:#999;font-size:13px;border-bottom:1px solid #eee">Date</td><td style="padding:8px 0;font-size:13px;border-bottom:1px solid #eee"><strong>${bookingDate}</strong></td></tr>
              <tr><td style="padding:8px 0;color:#999;font-size:13px;border-bottom:1px solid #eee">Time</td><td style="padding:8px 0;font-size:13px;border-bottom:1px solid #eee"><strong>${bookingTime}</strong></td></tr>
              ${inspoStyle ? `<tr><td style="padding:8px 0;color:#999;font-size:13px;border-bottom:1px solid #eee">Inspo</td><td style="padding:8px 0;font-size:13px;border-bottom:1px solid #eee">${inspoStyle}</td></tr>` : ''}
              ${notes ? `<tr><td style="padding:8px 0;color:#999;font-size:13px">Notes</td><td style="padding:8px 0;font-size:13px">${notes}</td></tr>` : ''}
            </table>
            <a href="https://nails-by-minh-booking.vercel.app/admin" style="display:inline-block;margin-top:20px;background:#111;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px">View in Admin Dashboard →</a>
          </div>
        `
      })
    });

    // ── 7. Return success ──────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      bookingId: booking.id,
      message: 'Booking confirmed!'
    });

  } catch (err) {
    console.error('Booking error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
