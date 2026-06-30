// api/admin/cleanup-photos.js — deletes inspo photos older than 7 days
// Called automatically by the admin dashboard on load. Frees storage and
// protects client privacy. Removes the file from storage AND clears the
// photo_url/photo_path on the booking row (the booking record itself stays).

export default async function handler(req, res) {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  try {
    // Cutoff = 7 days ago
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Find bookings that still have a photo and were created more than 7 days ago
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?select=id,photo_path&photo_path=not.is.null&created_at=lt.${encodeURIComponent(cutoff)}`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const old = await r.json();

    let deleted = 0;
    for (const row of old) {
      if (!row.photo_path) continue;
      // Delete the file from storage
      try {
        await fetch(
          `${SUPABASE_URL}/storage/v1/object/inspo-photos/${row.photo_path}`,
          {
            method: 'DELETE',
            headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
          }
        );
      } catch (e) {
        console.error('Storage delete failed for', row.photo_path, e);
      }
      // Clear the link on the booking so the dashboard stops showing it
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${row.id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ photo_url: null, photo_path: null })
      });
      deleted++;
    }

    return res.status(200).json({ ok: true, deleted });
  } catch (err) {
    console.error('Cleanup error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
