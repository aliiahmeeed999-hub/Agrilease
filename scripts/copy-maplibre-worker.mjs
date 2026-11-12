// MapLibre GL 6 loads its rendering worker from a URL it builds at runtime,
// which bundlers cannot follow. This copies the worker (and the right-to-left
// text plugin that shapes Arabic map labels) next to the static assets so the
// app can point MapLibre at them (see src/components/maps/maplibre.ts).
// Runs on postinstall, predev and prebuild; the output is git-ignored.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pkgPath = require.resolve("maplibre-gl/package.json");
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));
const source = path.join(path.dirname(pkgPath), "dist", "maplibre-gl-worker.mjs");
const targetDir = path.join(process.cwd(), "public", "vendor", "maplibre");
mkdirSync(targetDir, { recursive: true });
// Versioned file name, so a browser never keeps a worker from an older release.
copyFileSync(source, path.join(targetDir, `maplibre-gl-worker-${version}.mjs`));

// This package does not export its package.json, so it is located on disk.
const rtlPkgPath = path.join(process.cwd(), "node_modules", "@mapbox", "mapbox-gl-rtl-text", "package.json");
const rtlVersion = JSON.parse(readFileSync(rtlPkgPath, "utf8")).version;
copyFileSync(path.join(path.dirname(rtlPkgPath), "dist", "mapbox-gl-rtl-text.js"), path.join(targetDir, `rtl-text-${rtlVersion}.js`));
console.log(`maplibre worker ${version} and rtl-text ${rtlVersion} copied to public/vendor/maplibre/`);
