/**
 * Compose LUCKY NOVA logo onto carousel banners at 16:9 (1536x864).
 * Usage: node scripts/compose-banners.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const ASSETS = "C:\\Users\\Hp\\.cursor\\projects\\d-New-folder-gaming-platform\\assets";

const BANNER_W = 1536;
const BANNER_H = 864;
const LOGO_W = 240;

const LOGO = path.join(ROOT, "public", "brand", "lucky-nova-logo.png");
const OUT_DIR = path.join(ROOT, "public", "design", "banners");

const JOBS = [
  {
    input: path.join(ASSETS, "banner-first-deposit-gen.png"),
    output: path.join(OUT_DIR, "first-deposit-bonus.png"),
    logoLeft: BANNER_W - LOGO_W - 48,
    logoTop: 36,
  },
  {
    input: path.join(ASSETS, "banner-login-bonus-gen.png"),
    output: path.join(OUT_DIR, "login-bonus.png"),
    logoLeft: BANNER_W - LOGO_W - 48,
    logoTop: 36,
  },
  {
    input: path.join(ASSETS, "banner-wingo-payout-gen.png"),
    output: path.join(OUT_DIR, "wingo-payout.png"),
    logoLeft: BANNER_W - LOGO_W - 48,
    logoTop: 36,
  },
];

async function composeBanner({ input, output, logoLeft, logoTop }) {
  if (!fs.existsSync(input)) {
    throw new Error(`Missing generated banner: ${input}`);
  }
  if (!fs.existsSync(LOGO)) {
    throw new Error(`Missing logo: ${LOGO}`);
  }

  const logo = await sharp(LOGO).resize(LOGO_W).png().toBuffer();
  const logoMeta = await sharp(logo).metadata();

  const bg = await sharp(input)
    .resize(BANNER_W, BANNER_H, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const left = Math.max(16, logoLeft);
  const top = logoTop;

  await sharp(bg)
    .composite([
      {
        input: logo,
        left,
        top,
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(output);

  const meta = await sharp(output).metadata();
  console.log(`Wrote ${output} (${meta.width}x${meta.height})`);
}

async function main() {
  for (const job of JOBS) {
    await composeBanner(job);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
