/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  WA_ANALYTICS?: {
    writeDataPoint(data: {
      blobs?: string[];
      doubles?: number[];
      indexes?: string[];
    }): void;
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

    if (url.pathname === "/api/analytics") {
      if (request.method !== "POST") return new Response(null, { status: 405 });
      if (request.headers.get("Origin") !== url.origin) return new Response(null, { status: 403 });
      const allowedEvents = new Set([
        "page_view", "tab_view", "tab_duration", "search_start", "search_success", "search_failure",
        "random_player", "filter_change", "problem_open", "account_pin",
        "saved_account_open", "saved_account_remove", "recent_clear", "chart_export",
      ]);
      const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
      const event = typeof payload?.event === "string" ? payload.event : "";
      if (!allowedEvents.has(event)) return new Response(null, { status: 400 });

      const clean = (value: unknown) => typeof value === "string" ? value.slice(0, 64) : "";
      const duration = typeof payload?.duration === "number" && Number.isFinite(payload.duration)
        ? Math.min(Math.max(payload.duration, 0), 21_600)
        : 0;
      const cf = (request as Request & { cf?: { country?: string } }).cf;
      env.WA_ANALYTICS?.writeDataPoint({
        blobs: [event, clean(payload?.section), clean(payload?.value), clean(payload?.platform), cf?.country ?? ""],
        doubles: [1, duration],
        indexes: [event],
      });
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
