export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    const respond = (data, status = 200) =>
      Response.json(data, { status, headers: cors });

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    // Basic service health check
    if (url.pathname === "/api/health") {
      if (request.method !== "GET") {
        return respond({ success: false, error: "Method not allowed" }, 405);
      }

      return respond({
        success: true,
        engine: "GN-AI Global",
        status: "online",
        version: "1.1",
      });
    }

    // AI chat endpoint
    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return respond({ success: false, error: "Method not allowed" }, 405);
      }

      if (!env.OPENAI_API_KEY) {
        return respond({
          success: false,
          error: "AI API key not configured",
          code: "MISSING_OPENAI_API_KEY",
        }, 503);
      }

      try {
        const body = await request.json();

        if (typeof body.message !== "string" || !body.message.trim()) {
          return respond({
            success: false,
            error: "Please provide a non-empty message",
          }, 400);
        }

        const ai = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are GN-AI, a helpful global AI assistant.",
              },
              { role: "user", content: body.message.trim() },
            ],
          }),
        });

        const result = await ai.json().catch(() => null);

        if (!ai.ok) {
          return respond({
            success: false,
            error: result?.error?.message || "AI provider rejected the request",
            code: "OPENAI_PROVIDER_ERROR",
            provider_status: ai.status,
          }, ai.status);
        }

        const answer = result?.choices?.[0]?.message?.content;
        if (typeof answer !== "string" || !answer.trim()) {
          return respond({
            success: false,
            error: "AI provider returned no answer",
            code: "EMPTY_AI_RESPONSE",
          }, 502);
        }

        return respond({ success: true, answer });
      } catch (error) {
        const invalidJson = error instanceof SyntaxError;
        return respond({
          success: false,
          error: invalidJson ? "Request body must be valid JSON" : "AI request failed",
          code: invalidJson ? "INVALID_REQUEST_JSON" : "AI_REQUEST_FAILED",
        }, invalidJson ? 400 : 500);
      }
    }

    // Live football data endpoint
    if (url.pathname === "/api/football") {
      if (request.method !== "GET") {
        return respond({ success: false, error: "Method not allowed" }, 405);
      }

      if (!env.FOOTBALL_API_KEY) {
        return respond({
          success: false,
          error: "Football API key not configured",
          code: "MISSING_FOOTBALL_API_KEY",
        }, 503);
      }

      const resource = url.searchParams.get("resource") || "fixtures";
      const allowed = ["fixtures", "teams", "players", "standings", "leagues"];

      if (!allowed.includes(resource)) {
        return respond({
          success: false,
          error: "Invalid football resource",
          allowed_resources: allowed,
        }, 400);
      }

      try {
        const params = new URLSearchParams(url.searchParams);
        params.delete("resource");

        const football = await fetch(
          `https://v3.football.api-sports.io/${resource}?${params.toString()}`,
          {
            headers: {
              "x-apisports-key": env.FOOTBALL_API_KEY,
            },
          }
        );

        const data = await football.json().catch(() => null);

        if (!data) {
          return respond({
            success: false,
            source: "Football API",
            error: "Football provider returned an unreadable response",
            code: "INVALID_PROVIDER_RESPONSE",
            provider_status: football.status,
          }, 502);
        }

        const providerErrors = data.errors;
        const hasProviderErrors =
          providerErrors &&
          (Array.isArray(providerErrors)
            ? providerErrors.length > 0
            : typeof providerErrors === "object"
              ? Object.keys(providerErrors).length > 0
              : Boolean(providerErrors));

        if (!football.ok || hasProviderErrors) {
          return respond({
            success: false,
            source: "Football API",
            error: "Football provider reported an error",
            code: "FOOTBALL_PROVIDER_ERROR",
            provider_status: football.status,
            provider_errors: providerErrors || null,
            data,
          }, football.ok ? 502 : football.status);
        }

        return respond({
          success: true,
          source: "Football API",
          data,
        });
      } catch {
        return respond({
          success: false,
          error: "Could not connect to the football data provider",
          code: "FOOTBALL_NETWORK_ERROR",
        }, 502);
      }
    }

    return respond({
      engine: "GN-AI Global",
      message: "Welcome to GN-AI",
      endpoints: ["/api/health", "/api/chat", "/api/football"],
    });
  },
};
