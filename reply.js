// api/admin/reply.js — sends a text to a client from the admin dashboard
// Uses your Twilio number (TWILIO_FROM) so clients see (628) 258-6688.
// Protected by the same admin password as the rest of the dashboard.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth — same admin key the dashboard already uses
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { to, message } = req.body || {};

  // Basic validation
  if (!to || !message || !message.trim()) {
    return res.status(400).json({ error: 'Missing phone number or message' });
  }

  const TWILIO_SID   = process.env.TWILIO_SID;
  const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
  const TWILIO_FROM  = process.env.TWILIO_FROM;

  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    return res.status(500).json({ error: 'Texting is not configured' });
  }

  // Normalize the destination number to E.164 (+1XXXXXXXXXX)
  const toE164 = toE164US(to);
  if (!toE164) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  try {
    const body = new URLSearchParams({
      To: toE164,
      From: TWILIO_FROM,
      Body: message.trim()
    });

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      }
    );

    const data = await twilioRes.json();

    if (!twilioRes.ok) {
      // Surface Twilio's own message so you know what went wrong
      console.error('Twilio reply error:', data);
      return res.status(502).json({ error: data.message || 'Failed to send text' });
    }

    return res.status(200).json({ ok: true, sid: data.sid, to: toE164 });
  } catch (err) {
    console.error('Reply error:', err);
    return res.status(500).json({ error: 'Server error sending text' });
  }
}

// Turn "(870) 270-8836", "8702708836", "+18702708836" into "+18702708836"
function toE164US(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  if (String(raw).trim().startsWith('+')) return String(raw).trim();
  return null;
}
