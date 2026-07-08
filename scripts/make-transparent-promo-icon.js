/**
 * Remove black/dark matte background from nav promo icon.
 * Usage: node scripts/make-transparent-promo-icon.js [input] [output]
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const INPUT = process.argv[2] || path.join(ROOT, "public", "design", "nav", "promo-btn.png");
const OUTPUT = process.argv[3] || INPUT;

const removeDarkMatte = (data, channels, threshold = 48, feather = 24) => {
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // Keep dark purple/blue inner circle (blue channel leads on icon fill).
    const isIconFill = b > r + 8 && b > 40;
    const isGlow =
      (r > 80 && b > 80) ||
      (r > 120 && g < 90) ||
      (g > 80 && b > 80) ||
      max > 140;

    if (isIconFill || isGlow) continue;

    let alpha = 255;
    if (max <= threshold) {
      alpha = 0;
    } else if (max <= threshold + feather) {
      alpha = Math.round(((max - threshold) / feather) * 255);
    } else if (luminance < threshold + 10) {
      alpha = Math.min(alpha, Math.round(((luminance - threshold) / feather) * 255));
    }

    if (channels === 4) {
      data[i + 3] = Math.min(data[i + 3], alpha);
    }
  }
};

async function main() {
  if (!fs.existsSync(INPUT)) {
    throw new Error(`Input not found: ${INPUT}`);
  }

  const { data, info } = await sharp(INPUT)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buffer = Buffer.from(data);
  removeDarkMatte(buffer, info.channels);

  const tmp = `${OUTPUT}.tmp.png`;
  await sharp(buffer, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer()
    .then((pngBuffer) => sharp(pngBuffer).trim({ threshold: 12 }).png().toFile(tmp));

  fs.renameSync(tmp, OUTPUT);

  const meta = await sharp(OUTPUT).metadata();
  console.log(`Wrote ${OUTPUT} (${meta.width}x${meta.height}, ${meta.format})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
