export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const respond = (data, status = 200) =>
      Response.json(data, { status, headers: cors });

    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return respond({
        success: true,
        engine: "GN-AI Global",
        status: "online",
        version: "1.0"
      });
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        if (!env.OPENAI_API_KEY) {
          return respond({ error: "AI API key not configured" }, 503);
        }

        const body = await request.json();

        if (!body.message || typeof body.message !== "string") {
          return respond({ error: "Please provide a message" }, 400);
        }

        const ai = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: "You are GN-AI, a helpful global AI assistant."
                },
                {
                  role: "user",
                  content: body.message
                }
              ]
            })
          }
        );

        const result = await ai.json();

        if (!ai.ok) {
          return respond({ error: "AI provider error" }, ai.status);
        }

        return respond({
          success: true,
          answer: result.choices?.[0]?.message?.content
        });

      } catch {
        return respond({ error: "AI request failed" }, 500);
      }
    }

    if (url.pathname === "/api/football" && request.method === "GET") {
      try {
        if (!env.FOOTBALL_API_KEY) {
          return respond({ error: "Football API key not configured" }, 503);
        }

        const resource = url.searchParams.get("resource") || "fixtures";

        const allowed = [
          "fixtures",
          "teams",
          "players",
          "standings",
          "leagues"
        ];

        if (!allowed.includes(resource)) {
          return respond({ error: "Invalid football resource" }, 400);
        }

        const params = new URLSearchParams(url.searchParams);
        params.delete("resource");

        const football = await fetch(
          `https://v3.football.api-sports.io/${resource}?${params}`,
          {
            headers: {
              "x-apisports-key": env.FOOTBALL_API_KEY
            }
          }
        );

        const data = await football.json();

        return respond({
          success: football.ok,
          source: "Football API",
          data
        }, football.status);

      } catch {
        return respond({ error: "Football data request failed" }, 500);
      }
    }

    return respond({
      engine: "GN-AI Global",
      message: "Welcome to GN-AI",
      endpoints: [
        "/api/health",
        "/api/chat",
        "/api/football"
      ]
    });
  }
};
