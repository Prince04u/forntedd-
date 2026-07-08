const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const INPUT = path.join(ROOT, "public", "brand", "lucky-nova-logo.jpg");
const OUTPUT = path.join(ROOT, "public", "brand", "lucky-nova-logo.png");

const removeDarkBackground = (data, channels, threshold = 42, feather = 28) => {
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    let alpha = 255;
    if (max <= threshold) {
      alpha = 0;
    } else if (max <= threshold + feather) {
      alpha = Math.round(((max - threshold) / feather) * 255);
    } else if (luminance < threshold + 12) {
      alpha = Math.min(alpha, Math.round(((luminance - threshold) / feather) * 255));
    }

    if (channels === 4) {
      data[i + 3] = alpha;
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
  removeDarkBackground(buffer, info.channels);

  await sharp(buffer, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer()
    .then((pngBuffer) => sharp(pngBuffer).trim({ threshold: 10 }).png().toFile(OUTPUT));

  const meta = await sharp(OUTPUT).metadata();
  console.log(`Wrote ${OUTPUT} (${meta.width}x${meta.height}, ${meta.format})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
