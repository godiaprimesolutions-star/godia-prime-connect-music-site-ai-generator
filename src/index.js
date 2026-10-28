const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
  });
}
function normalPhone(value) {
  let p = String(value || "").replace(/[\s-]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (/^7\d{8}$/.test(p) || /^1\d{8}$/.test(p)) p = "254" + p;
  return /^254[17]\d{8}$/.test(p) ? p : null;
}
function b64(value) {
  return btoa(unescape(encodeURIComponent(value)));
}
async function mpesaToken(env) {
  if (!env.MPESA_CONSUMER_KEY || !env.MPESA_CONSUMER_SECRET) {
    throw new Error("M-Pesa is not configured: add MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET as Worker secrets.");
  }
  const base = env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
  const response = await fetch(base + "/oauth/v1/generate?grant_type=client_credentials", {
    headers: { Authorization: "Basic " + btoa(env.MPESA_CONSUMER_KEY + ":" + env.MPESA_CONSUMER_SECRET) }
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("Could not obtain M-Pesa access token. Check Daraja credentials and environment.");
  return { token: data.access_token, base };
}
async function startStk(request, env) {
  const body = await request.json().catch(() => ({}));
  const phone = normalPhone(body.phone);
  const amount = Math.round(Number(body.amount));
  if (!phone) return json({ error: "Enter a valid Kenyan M-Pesa number, for example 0712345678." }, 400);
  if (!Number.isFinite(amount) || amount < 1) return json({ error: "Payment amount is invalid." }, 400);
  if (!env.MPESA_SHORTCODE || !env.MPESA_PASSKEY || !env.MPESA_CALLBACK_URL) {
    return json({ error: "M-Pesa setup is incomplete. Check MPESA_SHORTCODE, MPESA_PASSKEY, and MPESA_CALLBACK_URL in Worker settings." }, 503);
  }
  try {
    const { token, base } = await mpesaToken(env);
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const shortcode = String(env.MPESA_SHORTCODE);
    const password = b64(shortcode + env.MPESA_PASSKEY + timestamp);
    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: env.MPESA_TRANSACTION_TYPE || "CustomerBuyGoodsOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: String(env.MPESA_PARTY_B || shortcode),
      PhoneNumber: phone,
      CallBackURL: env.MPESA_CALLBACK_URL,
      AccountReference: String(body.reference || "GODIA-PRIME-MUSIC").slice(0, 12),
      TransactionDesc: body.product === "download" ? "Music download" : "Music generation"
    };
    const response = await fetch(base + "/mpesa/stkpush/v1/processrequest", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ResponseCode !== "0") {
      return json({ error: data.errorMessage || data.ResponseDescription || "Safaricom did not accept the STK request.", details: data }, 502);
    }
    return json({
      ok: true,
      message: "M-Pesa prompt requested. Complete the prompt on your phone.",
      reference: data.CheckoutRequestID || data.MerchantRequestID || body.reference || "GODIA-PRIME-MUSIC",
      checkoutRequestId: data.CheckoutRequestID || null,
      merchantRequestId: data.MerchantRequestID || null
    });
  } catch (error) {
    return json({ error: error.message || "Could not start M-Pesa payment." }, 502);
  }
}
async function generate(request, env) {
  const body = await request.json().catch(() => ({}));
  if (!body.lyrics && !body.style) return json({ error: "Enter lyrics or describe your song style." }, 400);
  if (!env.HF_TOKEN) return json({ error: "Hugging Face is not configured. Add HF_TOKEN as a Worker secret." }, 503);
  if (!env.HF_API_URL) return json({ error: "Add HF_API_URL in Worker variables. It must be the inference endpoint for a compatible audio-generation model." }, 503);
  const prompt = [
    "Create an original song/audio based on this user request.",
    "Title: " + String(body.title || "GODIA PRIME song"),
    "Genre: " + String(body.genre || ""),
    "Language: " + String(body.language || "Kiswahili"),
    "Style: " + String(body.style || ""),
    "Lyrics: " + String(body.lyrics || ""),
    "Do not imitate a specific living artist."
  ].join("\n");
  try {
    const response = await fetch(env.HF_API_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + env.HF_TOKEN, "Content-Type": "application/json", Accept: "audio/*, application/octet-stream, application/json" },
      body: JSON.stringify({ inputs: prompt, parameters: { return_full_text: false } })
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 700);
      return json({ error: "Hugging Face could not generate audio. Check the configured model endpoint and model availability.", details: detail }, 502);
    }
    const type = response.headers.get("content-type") || "application/octet-stream";
    if (type.includes("application/json")) {
      const data = await response.json();
      if (data.audio_url) return json({ title: body.title || "Generated song", audio_url: data.audio_url });
      if (data.data && typeof data.data === "string") return json(data);
      return json({ error: "The configured Hugging Face endpoint returned JSON rather than playable audio.", details: data }, 502);
    }
    return new Response(response.body, {
      status: 200,
      headers: { "Content-Type": type, "Content-Disposition": 'inline; filename="godia-prime-song.audio"', ...corsHeaders }
    });
  } catch (error) {
    return json({ error: "Could not reach the Hugging Face endpoint.", details: error.message }, 502);
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (url.pathname === "/api/health") {
      let database = "not configured";
      try {
        if (env.GODIA_DB) {
          await env.GODIA_DB.prepare("SELECT 1 AS ok").first();
          database = "connected";
        }
      } catch (_) { database = "binding exists but query failed"; }
      return json({ ok: true, app: "GODIA PRIME AI MUSIC", database, routes: ["/api/health", "/api/generate", "/api/payments/mpesa/stk", "/api/payments/mpesa/callback"] });
    }
    if (url.pathname === "/api/generate" && request.method === "POST") return generate(request, env);
    if (url.pathname === "/api/payments/mpesa/stk" && request.method === "POST") return startStk(request, env);
    if (url.pathname === "/api/payments/mpesa/callback" && request.method === "POST") {
      const callback = await request.json().catch(() => ({}));
      // Acknowledge Safaricom callback. Payment recording/entitlement must be connected to the actual D1 schema before enabling paid downloads.
      console.log("M-Pesa callback received", JSON.stringify(callback).slice(0, 3000));
      return json({ ResultCode: 0, ResultDesc: "Accepted" });
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "API route not found." }, 404);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("GODIA PRIME AI MUSIC assets are not configured.", { status: 503 });
  }
};
