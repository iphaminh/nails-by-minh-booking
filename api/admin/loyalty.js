// api/admin/loyalty.js — returns completed-visit counts per client phone
// Used by the admin dashboard to show loyalty flags (every 5th visit = $10 off)
// Protected by the same admin password as the bookings endpoint.

export default async function handler(req, res) {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  try {
    // Pull every completed booking's phone number
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?select=client_phone&status=eq.completed`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await r.json();

    // Count completed visits per normalized phone number
    const counts = {};
    for (const row of rows) {
      const key = normalizePhone(row.client_phone);
      if (!key) continue;
      counts[key] = (counts[key] || 0) + 1;
    }

    return res.status(200).json({ counts });
  } catch (err) {
    console.error('Loyalty error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Strip everything but digits so "(408) 123-4567" and "4081234567" match
function normalizePhone(p) {
  if (!p) return '';
  return String(p).replace(/\D/g, '');
}
