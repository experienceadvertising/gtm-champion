import sharp from "sharp";
import { readdir, mkdir, stat } from "fs/promises";
import path from "path";

const SRC_DIR = path.resolve("attached_assets/generated_images");
const OUT_DIR = path.resolve("attached_assets/generated_images");

const WIDTHS = [800, 1200, 1600];
const QUALITY_WEBP = 78;
const QUALITY_AVIF = 55;

async function fileExists(p: string) {
  try { await stat(p); return true; } catch { return false; }
}

async function convert(filename: string) {
  const fullPath = path.join(SRC_DIR, filename);
  const base = filename.replace(/\.png$/i, "");
  const original = sharp(fullPath);
  const meta = await original.metadata();
  const maxW = meta.width ?? 1600;

  await mkdir(OUT_DIR, { recursive: true });

  for (const w of WIDTHS) {
    if (w > maxW) continue;
    const webpPath = path.join(OUT_DIR, `${base}-${w}.webp`);
    if (!(await fileExists(webpPath))) {
      await sharp(fullPath).resize({ width: w }).webp({ quality: QUALITY_WEBP }).toFile(webpPath);
      console.log(`wrote ${webpPath}`);
    }
    const avifPath = path.join(OUT_DIR, `${base}-${w}.avif`);
    if (!(await fileExists(avifPath))) {
      await sharp(fullPath).resize({ width: w }).avif({ quality: QUALITY_AVIF }).toFile(avifPath);
      console.log(`wrote ${avifPath}`);
    }
  }

  const fullWebp = path.join(OUT_DIR, `${base}.webp`);
  if (!(await fileExists(fullWebp))) {
    await sharp(fullPath).webp({ quality: QUALITY_WEBP }).toFile(fullWebp);
    console.log(`wrote ${fullWebp}`);
  }
}

async function main() {
  const files = (await readdir(SRC_DIR)).filter((f) => f.toLowerCase().endsWith(".png"));
  for (const file of files) {
    await convert(file);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
