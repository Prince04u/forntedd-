/**
 * One-time / re-run helper: map legacy hex gradients to theme CSS variables.
 * Usage: node scripts/apply-theme-vars.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "app");

const CSS_FILES = [
  "club.css",
  "globals.css",
  "wingo/wingo.css",
  "wallet/wallet.css",
  "account/account.css",
  "legal.css",
  "referral/referral.css",
  "wallet/deposit/pay/deposit-pay.css",
  "games/history/history.css",
  "agent/agent.css",
  "share/share.css",
];

const REPLACEMENTS = [
  ["#0a0a12", "var(--theme-bg-soft)"],
  ["#050508", "var(--theme-bg)"],
  ["#0f172a", "var(--theme-bg-soft)"],
  ["#1a1d2e", "var(--theme-bg-card)"],
  ["#151b28", "var(--theme-bg-elevated)"],
  ["#0f1219", "var(--theme-bg)"],
  ["#1e293b", "var(--theme-bg-card)"],
  ["#0d1117", "var(--theme-bg-soft)"],
  ["#334155", "var(--theme-border-muted)"],
  ["#475569", "var(--theme-border-strong)"],
  ["#64748b", "var(--theme-text-dim)"],
  ["#94a3b8", "var(--theme-text-muted)"],
  ["#cbd5e1", "var(--theme-text-secondary)"],
  ["#e2e8f0", "var(--theme-text-secondary)"],
  ["#f8fafc", "var(--theme-text)"],
  ["#38bdf8", "var(--theme-green-light)"],
  ["#61b2ff", "var(--theme-green-light)"],
  ["#4facfe", "var(--theme-green-light)"],
  ["#00f2fe", "var(--theme-green-dark)"],
  ["#2563eb", "var(--theme-green-dark)"],
  ["#1d4ed8", "var(--theme-green-deep)"],
  ["#ffd700", "var(--theme-gold-bright)"],
  ["#fbbf24", "var(--theme-gold-bright)"],
  ["linear-gradient(90deg, #f093fb, #f5576c)", "var(--theme-gradient-green-h)"],
  ["linear-gradient(90deg, #4facfe, #00f2fe)", "var(--theme-gradient-green-h)"],
  ["linear-gradient(135deg, #4facfe, #00f2fe)", "var(--theme-gradient-green)"],
  ["linear-gradient(90deg, #ff8a71, #61b2ff)", "var(--theme-gradient-green-h)"],
  ["linear-gradient(90deg, #a855f7, #6366f1)", "var(--theme-gradient-green-badge)"],
  ["linear-gradient(135deg, #ffd700, #ff8a71, #61b2ff)", "var(--theme-gradient-gold-text)"],
  [
    "linear-gradient(180deg, #151b28 0%, #0f1219 100%)",
    "var(--theme-gradient-card)",
  ],
  [
    "radial-gradient(circle at 20% 0%, rgba(79, 172, 254, 0.12), transparent 35%),\n    radial-gradient(circle at 80% 20%, rgba(240, 147, 251, 0.1), transparent 30%)",
    "var(--theme-app-glow)",
  ],
  [
    "linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 27, 75, 0.95)),\n    radial-gradient(circle at 70% 30%, rgba(56, 189, 248, 0.25), transparent 50%),\n    radial-gradient(circle at 30% 70%, rgba(168, 85, 247, 0.2), transparent 50%)",
    "var(--theme-gradient-banner)",
  ],
  [
    "linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.15))",
    "var(--theme-gradient-green-soft)",
  ],
  [
    "linear-gradient(135deg, rgba(30, 58, 95, 0.95), rgba(30, 27, 75, 0.95))",
    "var(--theme-gradient-modal-header)",
  ],
  [
    "linear-gradient(135deg, rgba(79, 172, 254, 0.25), rgba(0, 242, 254, 0.15))",
    "var(--theme-gradient-green-soft)",
  ],
  ["rgba(20, 24, 36, 0.92)", "var(--theme-bg-pill)"],
  ["rgba(10, 10, 18, 0.95)", "var(--theme-bg-nav)"],
  ["rgba(56, 189, 248, 0.45)", "var(--theme-green-border)"],
  ["rgba(56, 189, 248, 0.2)", "var(--theme-green-glow)"],
  ["rgba(97, 178, 255, 0.22)", "var(--theme-border-green)"],
  ["rgba(97, 178, 255, 0.15)", "var(--theme-border-green)"],
  ["rgba(251, 191, 36, 0.35)", "var(--theme-border-gold)"],
  ["#f472b6", "var(--theme-gold)"],
  ["#e0f2fe", "var(--theme-text)"],
  ["#fcd34d", "var(--theme-gold-bright)"],
  ["#93c5fd", "var(--theme-green-light)"],
  ["#7dd3fc", "var(--theme-green-light)"],
  ["#c4b5fd", "var(--theme-gold-muted)"],
  ["#ff8a71", "var(--theme-green-dark)"],
  ["#1a2332", "var(--theme-bg-card)"],
  ["#252a41", "var(--theme-bg-elevated)"],
  ["#a855f7", "var(--theme-green)"],
  ["#6366f1", "var(--theme-green-dark)"],
  ["#9333ea", "var(--theme-green-deep)"],
  ["#3b82f6", "var(--theme-green)"],
  ["rgba(56, 189, 248, 0.35)", "var(--theme-green-glow)"],
  ["rgba(56, 189, 248, 0.25)", "var(--theme-green-glow)"],
  ["rgba(56, 189, 248, 0.8)", "var(--theme-green-glow)"],
  ["rgba(56, 189, 248, 0.7)", "var(--theme-green-glow)"],
  ["rgba(244, 114, 182, 0.35)", "var(--theme-gold-glow)"],
  ["rgba(244, 114, 182, 0.45)", "var(--theme-gold-glow)"],
  ["rgba(245, 87, 108, 0.35)", "var(--theme-green-glow)"],
  ["rgba(79, 172, 254, 0.28)", "var(--theme-green-glow)"],
  ["rgba(14, 165, 233, 0.5)", "var(--theme-green-glow)"],
  ["rgba(37, 99, 235, 0.08)", "var(--theme-green-soft-bg)"],
  ["rgba(37, 99, 235, 0.18)", "var(--theme-green-soft-bg)"],
  ["rgba(255, 215, 0, 0.4)", "var(--theme-gold-glow)"],
  ["rgba(251, 191, 36, 0.12)", "var(--theme-shadow-gold)"],
  ["rgba(0, 0, 0, 0.78)", "var(--theme-bg-overlay)"],
  ["rgba(10, 10, 10, 0.95)", "var(--theme-bg-nav)"],
  [
    "linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 27, 75, 0.95)),\n    radial-gradient(circle at 70% 30%, rgba(56, 189, 248, 0.25), transparent 50%),\n    radial-gradient(circle at 30% 70%, rgba(168, 85, 247, 0.2), transparent 50%)",
    "var(--theme-gradient-banner)",
  ],
  [
    "linear-gradient(160deg, #3b82f6, var(--theme-green-deep))",
    "var(--theme-gradient-green)",
  ],
  [
    "linear-gradient(135deg, var(--theme-gold-bright), #ff8a71, var(--theme-green-light))",
    "var(--theme-gradient-gold-text)",
  ],
  [
    "linear-gradient(90deg, #ff8a71, var(--theme-green-light))",
    "var(--theme-gradient-green-h)",
  ],
  [
    "linear-gradient(90deg, var(--theme-green-dark) 0%, #6366f1 55%, #9333ea 100%)",
    "var(--theme-gradient-green-h)",
  ],
  ["#070b16", "var(--theme-bg)"],
  ["rgba(56, 189, 248, 0.06)", "var(--theme-green-soft-bg)"],
  ["rgba(56, 189, 248, 0.08)", "var(--theme-green-soft-bg)"],
  ["rgba(56, 189, 248, 0.1)", "var(--theme-green-soft-bg)"],
  ["rgba(56, 189, 248, 0.12)", "var(--theme-green-soft-bg)"],
  ["rgba(56, 189, 248, 0.14)", "var(--theme-green-soft-bg)"],
  ["rgba(56, 189, 248, 0.15)", "var(--theme-green-soft-bg)"],
  ["rgba(56, 189, 248, 0.16)", "var(--theme-green-soft-bg)"],
  ["rgba(56, 189, 248, 0.18)", "var(--theme-green-soft-bg)"],
  ["rgba(56, 189, 248, 0.22)", "var(--theme-green-glow)"],
  ["rgba(56, 189, 248, 0.28)", "var(--theme-border-green)"],
  ["rgba(56, 189, 248, 0.32)", "var(--theme-border-green)"],
  ["rgba(56, 189, 248, 0.42)", "var(--theme-border-green)"],
  ["rgba(56, 189, 248, 0.5)", "var(--theme-green-border)"],
  ["rgba(56, 189, 248, 0.55)", "var(--theme-green-border)"],
  ["rgba(56, 189, 248, 0.72)", "var(--theme-green-glow)"],
  ["rgba(56, 189, 248, 0.78)", "var(--theme-green-glow)"],
  ["rgba(56, 189, 248, 0.85)", "var(--theme-green-light)"],
  ["rgba(168, 85, 247, 0.08)", "var(--theme-gold-glow)"],
  ["rgba(168, 85, 247, 0.18)", "var(--theme-gold-glow)"],
  ["rgba(168, 85, 247, 0.25)", "var(--theme-border-gold)"],
  ["rgba(168, 85, 247, 0.6)", "var(--theme-border-gold)"],
  ["rgba(124, 58, 237, 0.85)", "var(--theme-green-dark)"],
  ["rgba(124, 58, 237, 0.88)", "var(--theme-green-dark)"],
  ["rgba(37, 99, 235, 0.55)", "var(--theme-green-deep)"],
  [
    "linear-gradient(135deg, rgba(56, 189, 248, 0.85), rgba(37, 99, 235, 0.55))",
    "var(--theme-gradient-green)",
  ],
  [
    "linear-gradient(135deg, rgba(124, 58, 237, 0.85), rgba(56, 189, 248, 0.72))",
    "var(--theme-gradient-green)",
  ],
  [
    "linear-gradient(135deg, rgba(124, 58, 237, 0.88), rgba(56, 189, 248, 0.78))",
    "var(--theme-gradient-green)",
  ],
  [
    "linear-gradient(135deg, rgba(79, 172, 254, 0.25), rgba(59, 130, 246, 0.18))",
    "var(--theme-gradient-green-soft)",
  ],
  [
    "linear-gradient(135deg, rgba(255, 107, 129, 0.25), rgba(168, 85, 247, 0.18))",
    "var(--theme-gradient-green-soft)",
  ],
  [
    "radial-gradient(circle at 15% 0%, rgba(56, 189, 248, 0.1), transparent 35%),\n    radial-gradient(circle at 85% 15%, rgba(168, 85, 247, 0.08), transparent 30%)",
    "var(--theme-app-glow)",
  ],
  [
    "radial-gradient(circle at 14% 8%, rgba(56, 189, 248, 0.1), transparent 42%)",
    "radial-gradient(circle at 14% 8%, var(--theme-green-soft-bg), transparent 42%)",
  ],
  [
    "radial-gradient(circle at 88% 15%, rgba(56, 189, 248, 0.1), transparent 38%)",
    "radial-gradient(circle at 88% 15%, var(--theme-green-soft-bg), transparent 38%)",
  ],
  [
    "radial-gradient(ellipse at 10% 0%, rgba(56, 189, 248, 0.14), transparent 50%)",
    "radial-gradient(ellipse at 10% 0%, var(--theme-green-soft-bg), transparent 50%)",
  ],
  [
    "radial-gradient(circle, rgba(56, 189, 248, 0.28), transparent 68%)",
    "radial-gradient(circle, var(--theme-green-glow), transparent 68%)",
  ],
  ["0 0 24px rgba(56, 189, 248, 0.12)", "var(--theme-shadow-green)"],
  ["0 0 16px rgba(56, 189, 248, 0.08)", "var(--theme-shadow-green)"],
  ["0 0 16px rgba(56, 189, 248, 0.18)", "var(--theme-shadow-green)"],
  ["0 0 18px rgba(56, 189, 248, 0.18)", "var(--theme-shadow-green)"],
  ["0 8px 20px rgba(56, 189, 248, 0.16)", "var(--theme-shadow-green)"],
  ["0 8px 20px rgba(56, 189, 248, 0.22)", "var(--theme-shadow-green)"],
  ["0 10px 28px rgba(56, 189, 248, 0.18)", "var(--theme-shadow-green)"],
  ["0 6px 16px rgba(56, 189, 248, 0.14)", "var(--theme-shadow-green)"],
  ["rgba(251, 191, 36, 0.45)", "var(--theme-border-gold)"],
];

for (const file of CSS_FILES) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) continue;
  let css = fs.readFileSync(fullPath, "utf8");
  let changed = false;
  for (const [from, to] of REPLACEMENTS) {
    if (css.includes(from)) {
      css = css.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(fullPath, css);
    console.log("updated", file);
  }
}

console.log("done");
