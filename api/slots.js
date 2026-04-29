// api/slots.js — returns blocked time slots for a given date
// Frontend calls this to know which times to gray out

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date required' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/blocked_slots?booking_date=eq.${encodeURIComponent(date)}&select=booking_time`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const slots = await r.json();
    const times = slots.map(s => s.booking_time);
    return res.status(200).json({ blocked: times });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch slots' });
  }
}
