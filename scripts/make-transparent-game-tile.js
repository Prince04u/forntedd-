/**
 * Remove black matte background from game tile art (flood-fill from edges).
 * Usage: node scripts/make-transparent-game-tile.js <input> <output> [width] [height]
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const INPUT = process.argv[2];
const OUTPUT = process.argv[3];
const OUT_W = Number(process.argv[4]) || 312;
const OUT_H = Number(process.argv[5]) || 416;

if (!INPUT || !OUTPUT) {
  console.error("Usage: node scripts/make-transparent-game-tile.js <input> <output> [width] [height]");
  process.exit(1);
}

const isBackgroundPixel = (r, g, b, threshold = 52) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const isGreenGlow = g > 70 && g >= r - 8 && g >= b - 8;
  const isBright = max > 120;
  const isColoredSubject = max - min > 28 && max > 60;
  if (isGreenGlow || isBright || isColoredSubject) return false;
  return max <= threshold;
};

const floodRemoveBackground = (data, width, height, channels) => {
  const visited = new Uint8Array(width * height);
  const queue = [];

  const pushIfBg = (x, y) => {
    const idx = y * width + x;
    if (visited[idx]) return;
    const i = idx * channels;
    if (!isBackgroundPixel(data[i], data[i + 1], data[i + 2])) return;
    visited[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < width; x += 1) {
    pushIfBg(x, 0);
    pushIfBg(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    pushIfBg(0, y);
    pushIfBg(width - 1, y);
  }

  while (queue.length) {
    const idx = queue.pop();
    const x = idx % width;
    const y = (idx - x) / width;
    const i = idx * channels;
    data[i + 3] = 0;

    if (x > 0) pushIfBg(x - 1, y);
    if (x < width - 1) pushIfBg(x + 1, y);
    if (y > 0) pushIfBg(x, y - 1);
    if (y < height - 1) pushIfBg(x, y + 1);
  }
};

async function main() {
  if (!fs.existsSync(INPUT)) {
    throw new Error(`Input not found: ${INPUT}`);
  }

  const { data, info } = await sharp(INPUT)
    .resize(OUT_W, OUT_H, { fit: "cover", position: "centre" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buffer = Buffer.from(data);
  floodRemoveBackground(buffer, info.width, info.height, info.channels);

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
    .then((pngBuffer) => sharp(pngBuffer).trim({ threshold: 8 }).png().toFile(tmp));

  fs.renameSync(tmp, OUTPUT);

  const meta = await sharp(OUTPUT).metadata();
  console.log(`Wrote ${OUTPUT} (${meta.width}x${meta.height}, alpha=${meta.hasAlpha})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
