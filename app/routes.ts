import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/search", "routes/api.search.ts"),
  route("api/analyze-image", "routes/api.analyze-image.ts"),
  route("api/rewrite-query", "routes/api.rewrite-query.ts"),
  route("api/random", "routes/api.random.ts"),
  route("api/image", "routes/api.image.ts"),
  route("images/*", "routes/images.$.ts"),
  route("thumbnails/*", "routes/thumbnails.$.ts"),
] satisfies RouteConfig;
