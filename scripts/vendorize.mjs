import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const srcDir = path.join(root, "node_modules", "texlyre-busytex");
const dstDir = path.join(root, "vendor", "texlyre-busytex");

if (!fs.existsSync(srcDir)) {
  console.error("texlyre-busytex not installed. Run: npm i texlyre-busytex");
  process.exit(1);
}

fs.mkdirSync(dstDir, { recursive: true });

// Heuristic: many packages ship ESM build in dist/
// If the package layout changes, adjust these paths.
const candidates = [
  { from: path.join(srcDir, "dist"), to: dstDir },
  { from: path.join(srcDir, "index.js"), to: path.join(dstDir, "index.js") }
];

let copied = false;

for (const c of candidates) {
  if (fs.existsSync(c.from)) {
    const stat = fs.statSync(c.from);
    if (stat.isDirectory()) {
      copyDir(c.from, c.to);
      copied = true;
    } else {
      fs.copyFileSync(c.from, c.to);
      copied = true;
    }
  }
}

if (!copied) {
  console.error("Could not find texlyre-busytex build files. Inspect node_modules/texlyre-busytex and update vendorize.mjs");
  process.exit(1);
}

console.log("OK: vendored texlyre-busytex into vendor/texlyre-busytex");

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const f = path.join(from, entry.name);
    const t = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(f, t);
    else fs.copyFileSync(f, t);
  }
}
