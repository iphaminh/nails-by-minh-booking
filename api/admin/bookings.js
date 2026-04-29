// api/admin/bookings.js — returns all bookings for admin dashboard
// Protected by admin password check

export default async function handler(req, res) {
  // Simple password protection
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  try {
    if (req.method === 'GET') {
      // Fetch all bookings ordered by date/time
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?select=*&order=booking_date.asc,booking_time.asc`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      const bookings = await r.json();
      return res.status(200).json({ bookings });
    }

    if (req.method === 'PATCH') {
      // Update booking status (confirm, cancel, complete)
      const { id, status } = req.body;
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      // If cancelled, free up the slot
      if (status === 'cancelled') {
        await fetch(`${SUPABASE_URL}/rest/v1/blocked_slots?booking_id=eq.${id}`, {
          method: 'DELETE',
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
