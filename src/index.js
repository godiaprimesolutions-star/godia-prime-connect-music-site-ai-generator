/**
 * GODIA PRIME MUSIC AI — fail-closed integration scaffold.
 *
 * IMPORTANT:
 * This starter intentionally does NOT claim that payments or AI generation work.
 * It will not unlock/generate anything until Daraja shortcode/transaction type,
 * callback verification, D1 binding, and the chosen HF model are configured and tested.
 */
const json = (data, status = 200, origin = "*") => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization",
    "cache-control": "no-store"
  }
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";
    if (request.method === "OPTIONS") return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "Content-Type, Authorization",
        "access-control-max-age": "86400"
      }
    });

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({
        ok: true,
        app: "GODIA PRIME MUSIC AI",
        mode: "integration-scaffold",
        databaseConfigured: Boolean(env.GODIA_DB),
        darajaConfigured: Boolean(env.DARAJA_CONSUMER_KEY && env.DARAJA_CONSUMER_SECRET),
        generationConfigured: Boolean(env.HF_TOKEN && env.HF_MODEL),
        message: "Health check only. This does not confirm that payment or generation has been tested."
      }, 200, origin);
    }

    // These endpoints deliberately fail closed until the integration is completed.
    // Never unlock or generate based on frontend state or an unverified customer claim.
    if (url.pathname === "/api/payments/mpesa/stk" && request.method === "POST") {
      return json({
        error: "M-Pesa checkout is not enabled yet. Configure and test the correct Daraja product, shortcode, callback URL, and D1 binding before accepting payments."
      }, 503, origin);
    }

    if (url.pathname === "/api/payments/status" && request.method === "GET") {
      return json({
        error: "Payment status checking is not enabled until secure payment records and callback verification are implemented."
      }, 503, origin);
    }

    if (url.pathname === "/api/generate" && request.method === "POST") {
      return json({
        error: "Generation is locked until the backend can verify a successful payment for this exact song request and the AI audio provider is configured."
      }, 503, origin);
    }

    if (url.pathname === "/api/payments/mpesa/callback" && request.method === "POST") {
      // Do not acknowledge or process unverified callbacks as successful.
      return json({ error: "Callback handler is not configured; no payment was unlocked." }, 503, origin);
    }

    return json({ error: "Not found" }, 404, origin);
  }
};
