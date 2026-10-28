# GODIA PRIME AI MUSIC — deployment package

This package keeps the supplied `index.html` design and connects it to a Cloudflare Worker.

## Files
- `public/index.html` — the HTML supplied for this project.
- `src/index.js` — Worker routes for health checks, Hugging Face audio requests, and M-Pesa STK push.
- `wrangler.jsonc` — Worker name, static assets, and existing D1 database binding.
- `package.json` — Wrangler deploy script required by Cloudflare Builds.

## Important
Do not delete the existing Cloudflare Worker, its secrets/variables, or the D1 database.
The config binds the existing database `godia-ai-music-db` (`0770ffda-6f12-42b4-a0e7-bc03ff34738c`) as `GODIA_DB`.

## Cloudflare Build settings
- Build command: `npm install`
- Deploy command: `npm run deploy`
- Root directory: `/`

If Cloudflare's Git-connected build is enabled, commit/upload these files to the existing repository's `main` branch. The build must use the new commit.

## Worker variables/secrets expected by this code
Secrets:
- `HF_TOKEN`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_PASSKEY`

Variables:
- `HF_API_URL` — the Hugging Face inference URL for an audio-generation model compatible with the Worker request.
- `MPESA_ENV` — `sandbox` or `production` (default sandbox).
- `MPESA_SHORTCODE`
- `MPESA_PARTY_B` — optional; defaults to shortcode.
- `MPESA_CALLBACK_URL` — public HTTPS URL ending in `/api/payments/mpesa/callback`.
- `MPESA_TRANSACTION_TYPE` — use the exact transaction type enabled for the shortcode, for example `CustomerBuyGoodsOnline` only if Safaricom has enabled it for this shortcode.

Do not paste secret values into GitHub or send them in chat. If your current Cloudflare variables use different names, keep them for now; we must compare their *names only* against this list before changing anything.

## Test
After deployment, open:
`https://YOUR-WORKER-URL/api/health`
It should return JSON with `ok: true` and `database: "connected"`.

## Limitations to resolve before taking real payments
The callback currently acknowledges M-Pesa callbacks but does not save/verify payment results in D1 or unlock downloads. This is intentional until the actual three-table schema is inspected, so it does not make a false paid/unpaid decision. Hugging Face audio generation also requires a model endpoint that actually returns playable audio. Do not advertise payments/download protection as complete until these are tested.
