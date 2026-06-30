-- ============================================================
-- Nails by Minh — Inspo Photo Upload setup
-- Run this in Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1) Add a column on bookings to store the photo's public URL
alter table bookings add column if not exists photo_url text;
-- (optional) store the storage path so we can delete it later
alter table bookings add column if not exists photo_path text;

-- 2) Create a PUBLIC storage bucket for inspo photos.
--    Public is required so the photo can show in your dashboard
--    and so Twilio can fetch it for MMS texting.
insert into storage.buckets (id, name, public)
values ('inspo-photos', 'inspo-photos', true)
on conflict (id) do update set public = true;

-- 3) Allow uploads + reads on this bucket.
--    Reads are public (anyone with the link can view the image).
--    Uploads happen from your server using the service key, which
--    bypasses these policies, but we add a safe public read policy.

-- Public read
drop policy if exists "inspo public read" on storage.objects;
create policy "inspo public read"
on storage.objects for select
to public
using ( bucket_id = 'inspo-photos' );

-- ============================================================
-- Done. After running this, your bucket "inspo-photos" exists
-- and is publicly readable. The booking app will upload photos
-- into it and save the link on each booking.
-- ============================================================
