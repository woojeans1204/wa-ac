/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface AnalyticsEngineDataset {
  writeDataPoint(data: {
    blobs?: string[];
    doubles?: number[];
    indexes?: string[];
  }): void;
}

interface Env {
  ASSETS: Fetcher;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  WA_ANALYTICS?: AnalyticsEngineDataset;
  WA_NEW_VISITORS?: AnalyticsEngineDataset;
  WA_RETURNING_SESSIONS?: AnalyticsEngineDataset;
  FEEDBACK_DB: {
    prepare(query: string): {
      bind(...values: unknown[]): {
        first<T = Record<string, unknown>>(): Promise<T | null>;
        run(): Promise<unknown>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/feedback") {
      if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
      if (request.headers.get("Origin") !== url.origin) return Response.json({ error: "Invalid origin." }, { status: 403 });

      const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
      if (typeof payload?.website === "string" && payload.website) return new Response(null, { status: 204 });

      const message = typeof payload?.message === "string" ? payload.message.trim() : "";
      const section = typeof payload?.section === "string" ? payload.section.slice(0, 64) : "unknown";
      if (message.length < 10 || message.length > 2000) {
        return Response.json({ error: "Feedback must be between 10 and 2,000 characters." }, { status: 400 });
      }

      const cf = (request as Request & { cf?: { country?: string } }).cf;
      const day = new Date().toISOString().slice(0, 10);
      const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
      const userAgent = request.headers.get("User-Agent") ?? "unknown";
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${day}:${ip}:${userAgent}`));
      const fingerprint = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      const recent = await env.FEEDBACK_DB.prepare(
        "SELECT COUNT(*) AS count FROM feedback WHERE fingerprint = ? AND created_at >= datetime('now', '-1 hour')"
      ).bind(fingerprint).first<{ count: number }>();
      if ((recent?.count ?? 0) >= 3) {
        return Response.json({ error: "Feedback limit reached. Please try again later." }, { status: 429 });
      }

      await env.FEEDBACK_DB.prepare(
        "INSERT INTO feedback (message, section, country, fingerprint) VALUES (?, ?, ?, ?)"
      ).bind(message, section, cf?.country ?? null, fingerprint).run();
      return Response.json({ ok: true });
    }

    if (url.pathname === "/api/analytics") {
      if (request.method !== "POST") return new Response(null, { status: 405 });
      if (request.headers.get("Origin") !== url.origin) return new Response(null, { status: 403 });
      const allowedEvents = new Set([
        "page_view", "visitor_new", "visitor_returning", "return_visit", "tab_view", "tab_duration", "search_start", "search_success", "search_failure",
        "random_player", "filter_change", "problem_open", "account_pin",
        "saved_account_open", "saved_account_remove", "recent_clear", "chart_export",
        "feedback_success", "feedback_failure",
      ]);
      const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
      const event = typeof payload?.event === "string" ? payload.event : "";
      if (!allowedEvents.has(event)) return new Response(null, { status: 400 });

      const clean = (value: unknown) => typeof value === "string" ? value.slice(0, 64) : "";
      const cleanId = (value: unknown) => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : "";
      const duration = typeof payload?.duration === "number" && Number.isFinite(payload.duration)
        ? Math.min(Math.max(payload.duration, 0), 21_600)
        : 0;
      const cf = (request as Request & { cf?: { country?: string } }).cf;
      env.WA_ANALYTICS?.writeDataPoint({
        blobs: [
          event,
          clean(payload?.section),
          clean(payload?.value),
          clean(payload?.platform),
          cf?.country ?? "",
          cleanId(payload?.visitorId),
          cleanId(payload?.sessionId),
        ],
        doubles: [1, duration],
        indexes: [event],
      });
      const visitorPoint = {
        blobs: [clean(payload?.section), clean(payload?.platform), cf?.country ?? "", cleanId(payload?.visitorId)],
        doubles: [1],
      };
      if (event === "visitor_new") env.WA_NEW_VISITORS?.writeDataPoint(visitorPoint);
      if (event === "visitor_returning") env.WA_RETURNING_SESSIONS?.writeDataPoint(visitorPoint);
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
