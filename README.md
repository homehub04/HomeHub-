# Nzvimbo — Rental Marketplace (Zimbabwe)

Real working app: Node/Express + Socket.IO backend, vanilla HTML/CSS/JS frontend,
SQLite for data (zero cost, no DB to sign up for), Cloudflare R2 for photo
storage, OpenRouter for AI listing descriptions.

## 1. Install

```
cd server
npm install
cp .env.example .env
```

## 2. Free accounts you need (all have a free tier)

| Service | What it's for | Sign up |
|---|---|---|
| Gmail + App Password | sends real email OTP codes | https://myaccount.google.com/apppasswords (needs 2FA on) |
| Cloudflare R2 | stores listing photos, 10GB free, no egress cost | https://dash.cloudflare.com → R2 → Create bucket → Manage API tokens |
| OpenRouter | AI listing descriptions, free models available | https://openrouter.ai/keys |

Fill each value into `server/.env`.

**Phone OTP note:** there's no real SMS gateway that's free at any volume.
Left as `SMS_PROVIDER=console` for now — codes print to your terminal so you
can build and test the whole flow. When you're ready to send real texts,
Africa's Talking has a free sandbox and Termii gives trial credits for
African numbers — wire either into `server/utils/otp.js`.

### Cloudflare R2 public access
After creating your bucket: bucket → Settings → Public Access → enable the
`r2.dev` subdomain, and put that URL in `R2_PUBLIC_URL`.

## 3. Run it

```
cd server
npm start
```

Open **http://localhost:4000** — the server serves the frontend too, so
there's nothing separate to run.

## 4. What's wired up vs. what's a stub

**Working end to end:**
- Signup with name + email + phone + password, role (tenant/landlord)
- Email OTP (real, via Gmail) and phone OTP (console in dev)
- Login (JWT), listings search, landlord dashboard, create listing
- Photo upload → Cloudflare R2
- AI listing description → OpenRouter (free model)
- Real-time chat via Socket.IO, message history in SQLite

**Not built yet (flagged, not faked):**
- Payments (EcoCash / InnBucks / Omari via Paynow) — needs a Paynow merchant
  account, which requires real business registration; wire it into a new
  `server/routes/payments.js` once you have credentials
- Map view (Google Maps JS API) — needs a Google Cloud billing-enabled key;
  the design mockup shows the intended layout
- Admin listing-verification UI — the API endpoint exists
  (`POST /api/listings/:id/verify`, admin role) but there's no screen for it yet

## 5. Project structure

```
server/
  server.js          entry point
  db.js              SQLite schema
  routes/            auth, listings, upload, ai, messages
  middleware/auth.js JWT guard
  utils/             otp.js, mailer.js, r2.js
  socket.js          Socket.IO chat handlers
public/
  index.html         signup / login / OTP verification
  app.html           search (tenant) + dashboard (landlord)
  chat.html          real-time chat
  css/style.css      shared design tokens (same palette as the design mockup)
  js/api.js          fetch wrapper + session helpers
```
