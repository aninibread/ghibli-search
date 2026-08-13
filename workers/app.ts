import { createRequestHandler } from "react-router";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

const IGNORED_DEV_PROBES = new Set([
  "/.well-known/appspecific/com.chrome.devtools.json",
]);

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (IGNORED_DEV_PROBES.has(pathname)) {
      return new Response(null, { status: 204 });
    }

    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
