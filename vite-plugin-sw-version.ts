import type { Plugin } from "vite";
import fs from "fs";
import path from "path";

/**
 * Rewrites the CACHE_NAME constant in the built service worker to include a
 * unique per-build identifier so clients drop stale caches after each deploy.
 */
export function swVersionPlugin(): Plugin {
  return {
    name: "vite-plugin-sw-version",
    apply: "build",
    closeBundle() {
      const swPath = path.resolve(process.cwd(), "dist/public/sw.js");
      if (!fs.existsSync(swPath)) {
        console.warn("[sw-version] sw.js not found in dist/public, skipping");
        return;
      }
      const version = `gtm-champion-${Date.now()}`;
      const source = fs.readFileSync(swPath, "utf-8");
      const updated = source.replace(/const\s+CACHE_NAME\s*=\s*['"][^'"]+['"];/, `const CACHE_NAME = '${version}';`);
      fs.writeFileSync(swPath, updated, "utf-8");
      console.log(`[sw-version] CACHE_NAME set to ${version}`);
    },
  };
}
