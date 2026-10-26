# GODIA PRIME MUSIC AI — integration starter bundle

## Important status
This ZIP is a **starter/integration scaffold**, not a completed production application.
The supplied `public/index.html` is the user's existing uploaded HTML, preserved as-is.
The backend intentionally returns a safe error for payment/generation endpoints until real
Daraja verification and a supported audio model are implemented and tested. It will not
pretend that a payment succeeded or that audio was generated.

## Existing-project safety
- Do not create a duplicate Worker or D1 database.
- Do not deploy `wrangler.toml.example` as-is.
- Rename it to `wrangler.toml` only after replacing every placeholder with the actual existing Worker name, D1 database name/ID, and frontend origin.
- Review `migrations/0001_core.sql` against the existing D1 schema before applying it. It uses CREATE TABLE IF NOT EXISTS and does not drop existing tables, but still test on a separate database first if possible.
- Never commit `.dev.vars` or real secrets. Configure production secrets in Cloudflare Worker settings.

## Files
- `public/index.html`: existing uploaded UI, preserved unchanged.
- `src/index.js`: fail-closed Worker scaffold and health endpoint.
- `migrations/0001_core.sql`: proposed tables for song requests, payments, and song-specific download permissions.
- `wrangler.toml.example`: configuration template with placeholders, not deploy-ready.
- `netlify.toml`: optional Netlify hosting/proxy template with placeholder Worker URL.
- `package.json`: Wrangler scripts/dependency.
- `.dev.vars.example`: secret names only, no real credentials.
- `.gitignore`: excludes local secrets and generated files.

## Agreed pricing/flow to implement
- Base generation: KSh 250 per song.
- Listening: free.
- Download: KSh 50 per specific song.
- Display USD and KSh side by side, but at initial launch M-Pesa checkout charges the KSh amount.
- Generate only after backend verification of the exact payment and song request.
- Optional extras are not included in the base price unless explicitly confirmed and securely priced on the server.

## Before production
1. Inspect the current GitHub repository and compare files before uploading this bundle.
2. Confirm the existing Cloudflare Worker name and D1 database binding/ID.
3. Confirm Daraja production access, shortcode compatibility, transaction type, and callback URL with Safaricom. Do not assume Buy Goods supports every STK transaction type.
4. Implement signed/validated callback handling, amount/phone/reference matching, idempotency, and payment status polling.
5. Select and test a real audio-generation model that returns playable audio, and configure `HF_TOKEN` and `HF_MODEL` as Worker secrets/variables.
6. Configure Netlify only if it is the actual frontend host. Set its `/api/*` proxy to the real Worker URL.
7. Test payment success, pending, cancellation, failure, duplicate callback, and direct API bypass before accepting live money.

## Phone-only note
GitHub mobile uploads can add files, but do not upload every file blindly. First inspect the existing repository and compare. If using Netlify, the public folder is the publish directory. Cloudflare deployment settings depend on the actual existing Worker and should not be guessed.
