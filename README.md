# 💅 Nails by Minh — Booking App

Private booking hub for Minh's nail station. Clients book directly on the site — no jumping to third-party apps.

## Features
- ✅ Full service menu (artificial nails, nail art, pedicure)
- ✅ Real calendar date picker (no past dates, days off blocked)
- ✅ Time slot booking with double-booking prevention
- ✅ Inspo style picker + photo upload
- ✅ Client gets email confirmation automatically
- ✅ Minh gets email notification instantly
- ✅ Admin dashboard at /admin to manage all bookings
- ✅ Subscribe for deals (text/email)

## Project Structure
```
/
├── index.html          ← Client booking page
├── admin/
│   └── index.html      ← Minh's admin dashboard
├── api/
│   ├── book.js         ← Handles booking submission
│   ├── slots.js        ← Returns blocked time slots
│   └── admin/
│       └── bookings.js ← Admin bookings API
├── vercel.json         ← Vercel routing config
└── supabase-setup.sql  ← Run this in Supabase SQL editor
```

## Setup Steps

### 1. Supabase (database)
1. Go to supabase.com → create project
2. Go to SQL Editor → paste contents of `supabase-setup.sql` → Run
3. Go to Settings → API → copy `URL` and `service_role` key

### 2. Resend (email)
1. Go to resend.com → create account
2. Go to API Keys → create key → copy it

### 3. Environment Variables in Vercel
Go to Vercel → your project → Settings → Environment Variables → add these:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Your Supabase service_role key |
| `RESEND_API_KEY` | Your Resend API key |
| `MINH_EMAIL` | Your Gmail address |
| `MINH_PHONE` | (408) 831-0316 |
| `GV_NUMBER` | (408) 831-0316 |
| `ADMIN_PASSWORD` | A password you choose for /admin login |

### 4. Redeploy on Vercel
After adding env variables → Vercel dashboard → Deployments → Redeploy

## Admin Dashboard
Visit: `https://nails-by-minh-booking.vercel.app/admin`
- Log in with your ADMIN_PASSWORD
- See all bookings, confirm/cancel/complete them
- Auto-refreshes every 60 seconds

## Days Off
Edit `DAYS_OFF` in `index.html` (line ~230):
- 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
- Default: closed Sunday & Monday

## Time Slots
Edit `ALL_TIMES` array in `index.html` to change available hours.

## Making Updates
1. Edit files locally or in GitHub
2. Push to GitHub → Vercel auto-deploys in ~30 seconds
3. Same QR code still works — URL never changes
