/**
 * GODIA PRIME MUSIC AI
 * Cloudflare Worker backend foundation.
 *
 * D1 binding: GODIA_DB
 *
 * This backend does not claim payments or AI generation
 * are operational until their integrations are implemented
 * and tested.
 */

const APP_NAME = "GODIA PRIME MUSIC AI";

function json(data, status = 200, origin = "*") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Cache-Control": "no-store",
      "Vary": "Origin"
    }
  });
}

function errorResponse(message, status, origin) {
  return json({ success: false, error: message }, status, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get("Origin") || "*";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }

    try {
      // API overview
      if (path === "/api" && request.method === "GET") {
        return json({
          success: true,
          application: APP_NAME,
          endpoints: [
            "GET /api",
            "GET /api/health",
            "GET /api/songs",
            "POST /api/payments/mpesa/stk",
            "GET /api/payments/status",
            "POST /api/generate",
            "POST /api/payments/mpesa/callback"
          ]
        }, 200, origin);
      }

      // Test Worker and D1 connectivity
      if (path === "/api/health" && request.method === "GET") {
        if (!env.GODIA_DB) {
          return json({
            success: false,
            application: APP_NAME,
            backend: "online",
            database: "not_configured",
            message: "The GODIA_DB D1 binding is missing."
          }, 503, origin);
        }

        await env.GODIA_DB
          .prepare("SELECT 1 AS connection_test")
          .first();

        return json({
          success: true,
          application: APP_NAME,
          backend: "online",
          database: "connected",
          payments: "not_enabled",
          generation: "not_enabled"
        }, 200, origin);
      }

      // List active songs from D1.
      if (path === "/api/songs" && request.method === "GET") {
        if (!env.GODIA_DB) {
          return errorResponse("D1 database binding GODIA_DB is missing.", 503, origin);
        }

        // Do not silently pretend that the songs table exists.
        const result = await env.GODIA_DB.prepare(
          `SELECT id, title, artist, description, price_kes,
                  audio_url, cover_url, created_at
           FROM songs
           WHERE is_active = 1
           ORDER BY created_at DESC`
        ).all();

        return json({
          success: true,
          songs: result.results || []
        }, 200, origin);
      }

      // Payment checkout remains disabled until Daraja integration
      // and server-side request validation are implemented.
      if (path === "/api/payments/mpesa/stk" && request.method === "POST") {
        return errorResponse(
          "M-Pesa checkout is not enabled. Payment integration and verification must be completed first.",
          503,
          origin
        );
      }

      if (path === "/api/payments/status" && request.method === "GET") {
        return errorResponse(
          "Secure payment status checking has not yet been implemented.",
          503,
          origin
        );
      }

      // Do not generate music until payment and AI provider
      // integrations are implemented and verified.
      if (path === "/api/generate" && request.method === "POST") {
        return errorResponse(
          "Music generation is not enabled yet. A verified payment and tested audio-generation provider are required.",
          503,
          origin
        );
      }

      // Never mark a payment successful without verified processing.
      if (path === "/api/payments/mpesa/callback" && request.method === "POST") {
        return errorResponse(
          "The M-Pesa callback handler is not implemented. No payment has been confirmed.",
          503,
          origin
        );
      }

      // Serve the existing website when Cloudflare Assets are configured.
      if (!path.startsWith("/api/") && env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      return errorResponse("Endpoint not found.", 404, origin);

    } catch (error) {
      console.error("GODIA backend request failed:", error);

      return errorResponse(
        path === "/api/songs"
          ? "Could not load songs. Check that the D1 songs table exists."
          : "The request could not be completed. Check the Worker configuration and logs.",
        500,
        origin
      );
    }
  }
};
