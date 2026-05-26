import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { injectMeta, loadArticleMeta } from "./seoMeta";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  loadArticleMeta(distPath);

  const indexPath = path.resolve(distPath, "index.html");
  const indexHtml = fs.readFileSync(indexPath, "utf-8");

  // Hashed assets (JS, CSS, images) get long-lived cache
  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
  }));

  // Other static files (favicon, manifest, og-image) get short cache.
  // index.html is served by the SPA fallback below so we can inject per-route meta.
  app.use(express.static(distPath, {
    maxAge: "1d",
    index: false,
  }));

  // fall through to index.html if the file doesn't exist (SPA routing)
  app.use("*", (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(injectMeta(indexHtml, req.originalUrl.split("?")[0]));
  });
}
