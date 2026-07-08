/**
 * Replace decorative linear/radial gradients with solid theme colors.
 * Usage: node scripts/remove-gradients.js
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

const EXACT = [
  ["background: linear-gradient(90deg, var(--theme-green-dark), var(--theme-green-light))", "background: var(--theme-green)"],
  ["background: linear-gradient(90deg, var(--theme-green-light), var(--theme-green-dark))", "background: var(--theme-green)"],
  ["background: linear-gradient(135deg, var(--theme-green-light), var(--theme-green-dark))", "background: var(--theme-green)"],
  ["background: linear-gradient(135deg, var(--theme-green-dark), var(--theme-green-light))", "background: var(--theme-green)"],
  ["background: linear-gradient(135deg, var(--theme-green), var(--theme-green-deep))", "background: var(--theme-green)"],
  ["background: linear-gradient(145deg, var(--theme-green) 0%, var(--theme-green-deep) 100%)", "background: var(--theme-green)"],
  ["background: linear-gradient(145deg, #22c55e 0%, #15803d 100%)", "background: var(--theme-green)"],
  ["background: linear-gradient(145deg, #22c55e, #166534)", "background: var(--theme-green)"],
  ["background: linear-gradient(160deg, #22c55e, #15803d)", "background: var(--theme-green)"],
  ["background: linear-gradient(160deg, var(--theme-green), var(--theme-green-deep))", "background: var(--theme-green)"],
  ["background: linear-gradient(160deg, #ef4444, #b91c1c)", "background: var(--theme-danger)"],
  ["background: linear-gradient(145deg, #ef4444, #991b1b)", "background: var(--theme-danger)"],
  ["background: linear-gradient(145deg, #ef4444 0%, #991b1b 100%)", "background: var(--theme-danger)"],
  ["background: linear-gradient(145deg, var(--theme-gold-bright), #d97706)", "background: var(--theme-gold-bright)"],
  ["background: linear-gradient(180deg, #f59e0b, #d97706)", "background: var(--theme-gold-bright)"],
  ["background: linear-gradient(180deg, var(--theme-gold-bright), #d97706)", "background: var(--theme-gold-bright)"],
  ["background: linear-gradient(180deg, var(--theme-green), var(--theme-green-dark))", "background: var(--theme-green)"],
  ["background: linear-gradient(180deg, var(--theme-bg-elevated) 0%, var(--theme-bg) 100%)", "background: var(--theme-bg-elevated)"],
  ["background: linear-gradient(180deg, var(--theme-bg-elevated) 0%, var(--theme-bg) 100%)", "background: var(--theme-bg-elevated)"],
  ["background: linear-gradient(145deg, var(--theme-bg-card), var(--theme-bg-soft))", "background: var(--theme-bg-card)"],
  ["background: linear-gradient(135deg, var(--theme-green-deep), var(--theme-green-dark))", "background: var(--theme-green-dark)"],
  ["background: linear-gradient(135deg, var(--theme-green-deep), #0f766e)", "background: var(--theme-green-deep)"],
  ["background: linear-gradient(90deg, var(--theme-green-deep), #0f766e)", "background: var(--theme-green-deep)"],
  ["background: linear-gradient(135deg, var(--theme-green-dark), #0d9488)", "background: var(--theme-green-dark)"],
  ["background: linear-gradient(135deg, #7c3aed, var(--theme-green-light))", "background: var(--theme-green)"],
  ["background: linear-gradient(135deg, #7c3aed, var(--theme-green-light));", "background: var(--theme-green);"],
  ["background: linear-gradient(135deg, var(--theme-green-dark), var(--theme-green-glow))", "background: var(--theme-green-dark)"],
  ["background: linear-gradient(135deg, var(--theme-gold-bright), var(--theme-green-light))", "background: var(--theme-gold-bright)"],
  ["background: linear-gradient(90deg, #ff6b81, var(--theme-green-light))", "background: var(--theme-green)"],
  ["background: linear-gradient(90deg, #0284c7, var(--theme-green-dark))", "background: var(--theme-green-dark)"],
  ["background: linear-gradient(90deg, #b45309, #92400e)", "background: var(--theme-gold-muted)"],
  ["background: linear-gradient(90deg, #7c3aed, #db2777)", "background: var(--theme-violet)"],
  ["background: linear-gradient(135deg, #1e3a5f, var(--theme-bg-soft))", "background: var(--theme-bg-card)"],
  ["background: linear-gradient(135deg, #1e3a5f, #1e1b4b)", "background: var(--theme-bg-card)"],
  ["background: linear-gradient(135deg, #6a5af9, var(--theme-green-light))", "background: var(--theme-green)"],
  ["background: linear-gradient(135deg, #6a5af9, var(--theme-green-deep))", "background: var(--theme-green-dark)"],
  ["background: linear-gradient(90deg, #f97316, #ea580c)", "background: var(--theme-orange)"],
  ["background: linear-gradient(90deg, #22c55e, #16a34a)", "background: var(--theme-green)"],
  ["background: linear-gradient(90deg, var(--theme-green-dark) 0%, var(--theme-green-dark) 55%, var(--theme-green-deep) 100%)", "background: var(--theme-green-dark)"],
  ["background: linear-gradient(90deg, var(--theme-green), #60a5fa)", "background: var(--theme-green)"],
  ["background: linear-gradient(90deg, #f97316, #fb923c)", "background: var(--theme-orange)"],
  ["background: linear-gradient(transparent, rgba(0, 0, 0, 0.82))", "background: rgba(0, 0, 0, 0.65)"],
  ["background: linear-gradient(180deg, transparent, rgba(106, 90, 249, 0.15))", "background: transparent"],
  ["background: linear-gradient(90deg, transparent, var(--theme-green-glow), transparent)", "background: var(--theme-green-soft-bg)"],
  ["background: linear-gradient(135deg, var(--theme-gold-bright), var(--theme-green-dark), var(--theme-green-light))", "background: var(--theme-gold-bright)"],
  ["background: linear-gradient(165deg, rgba(8, 14, 32, 0.98), rgba(14, 22, 48, 0.95))", "background: var(--theme-bg-card)"],
  ["background: linear-gradient(180deg, rgba(29, 78, 216, 0.18), #111827)", "background: var(--theme-bg-elevated)"],
  ["background: linear-gradient(135deg, rgba(124, 58, 237, 0.18), rgba(236, 72, 153, 0.12))", "background: var(--theme-bg-muted)"],
  ["background: linear-gradient(90deg, rgba(255, 138, 113, 0.2), rgba(97, 178, 255, 0.2))", "background: var(--theme-green-soft-bg)"],
  ["background: linear-gradient(135deg, rgba(124, 58, 237, 0.55), var(--theme-green-border))", "background: var(--theme-green-soft-bg)"],
  ["background: linear-gradient(135deg, rgba(124, 58, 237, 0.35), var(--theme-green-glow))", "background: var(--theme-green-soft-bg)"],
  ["background: linear-gradient(135deg, var(--theme-green-light), var(--theme-green-deep))", "background: var(--theme-green)"],
  ["background: linear-gradient(145deg, var(--theme-green), #1e40af)", "background: var(--theme-green)"],
  ["background: linear-gradient(145deg, #f97316 0%, #c2410c 100%)", "background: var(--theme-orange)"],
  ["background: linear-gradient(180deg, #e8f7ff 0%, #d4ecff 100%)", "background: #e8f7ff"],
  ["background: linear-gradient(180deg, #f3ebff 0%, #e6d8ff 100%)", "background: #f3ebff"],
  ["background: linear-gradient(180deg, var(--theme-green-light) 0%, #7daef0 100%)", "background: var(--theme-green-light)"],
  ["background: linear-gradient(180deg, #7eb8aa 0%, #66a596 100%)", "background: #7eb8aa"],
  ["background: radial-gradient(circle, var(--theme-border-green), transparent 68%)", "background: var(--theme-green-soft-bg)"],
  ["background: radial-gradient(circle at center, var(--theme-green-light) 0 5px, transparent 6px)", "background: var(--theme-green-light)"],
  [".result-ball.violet-green { background: linear-gradient(135deg, #14532d, #4c1d95); color: #fff; }", ".result-ball.violet-green { background: var(--theme-violet); color: #fff; }"],
  [".result-ball.violet-red { background: linear-gradient(135deg, #450a0a, #4c1d95); color: #fff; }", ".result-ball.violet-red { background: var(--theme-violet); color: #fff; }"],
  [".number-btn.violet-green { background: linear-gradient(135deg, #14532d, #4c1d95); color: #fff; }", ".number-btn.violet-green { background: var(--theme-violet); color: #fff; }"],
  [".number-btn.violet-red { background: linear-gradient(135deg, #450a0a, #4c1d95); color: #fff; }", ".number-btn.violet-red { background: var(--theme-violet); color: #fff; }"],
  [".wg-num-btn.v0 { background: linear-gradient(135deg, #8b5cf6 50%, #ef4444 50%); }", ".wg-num-btn.v0 { background: var(--theme-violet); border: 2px solid var(--theme-danger); }"],
  [".wg-num-btn.v5 { background: linear-gradient(135deg, #8b5cf6 50%, #22c55e 50%); }", ".wg-num-btn.v5 { background: var(--theme-violet); border: 2px solid var(--theme-green); }"],
  [".wg-table-num.v0 { background: linear-gradient(135deg, #8b5cf6, #ef4444); }", ".wg-table-num.v0 { background: var(--theme-violet); }"],
  [".wg-table-num.v5 { background: linear-gradient(135deg, #8b5cf6, #22c55e); }", ".wg-table-num.v5 { background: var(--theme-violet); }"],
  [".wg-mini-ball.v0 { background: linear-gradient(135deg, #8b5cf6, #ef4444); }", ".wg-mini-ball.v0 { background: var(--theme-violet); }"],
  [".wg-mini-ball.v5 { background: linear-gradient(135deg, #8b5cf6, #22c55e); }", ".wg-mini-ball.v5 { background: var(--theme-violet); }"],
  [".wg-chart-ball.v0 { background: linear-gradient(135deg, #8b5cf6, #ef4444); }", ".wg-chart-ball.v0 { background: var(--theme-violet); }"],
  [".wg-chart-ball.v5 { background: linear-gradient(135deg, #8b5cf6, #22c55e); }", ".wg-chart-ball.v5 { background: var(--theme-violet); }"],
  [".wg-bet-sheet.theme-green .wg-bet-sheet-header { background: linear-gradient(180deg, #34d399, #22c55e); }", ".wg-bet-sheet.theme-green .wg-bet-sheet-header { background: var(--theme-green); }"],
  [".wg-bet-sheet.theme-violet .wg-bet-sheet-header { background: linear-gradient(180deg, #a78bfa, #8b5cf6); }", ".wg-bet-sheet.theme-violet .wg-bet-sheet-header { background: var(--theme-violet); }"],
  [".wg-bet-sheet.theme-red .wg-bet-sheet-header { background: linear-gradient(180deg, #f87171, #ef4444); }", ".wg-bet-sheet.theme-red .wg-bet-sheet-header { background: var(--theme-danger); }"],
  [".wg-bet-sheet.theme-orange .wg-bet-sheet-header { background: linear-gradient(180deg, #fb923c, #f97316); }", ".wg-bet-sheet.theme-orange .wg-bet-sheet-header { background: var(--theme-orange); }"],
  [".wg-bet-sheet.theme-blue .wg-bet-sheet-header { background: linear-gradient(180deg, #60a5fa, var(--theme-green)); }", ".wg-bet-sheet.theme-blue .wg-bet-sheet-header { background: var(--theme-blue-light); }"],
  [".wg-bet-sheet.theme-v0 .wg-bet-sheet-header { background: linear-gradient(135deg, #a78bfa 50%, #f87171 50%); }", ".wg-bet-sheet.theme-v0 .wg-bet-sheet-header { background: var(--theme-violet); }"],
  [".wg-bet-sheet.theme-v5 .wg-bet-sheet-header { background: linear-gradient(135deg, #a78bfa 50%, #34d399 50%); }", ".wg-bet-sheet.theme-v5 .wg-bet-sheet-header { background: var(--theme-violet); }"],
  [".wg-bet-sheet.theme-green .wg-bet-confirm:not(:disabled) { background: linear-gradient(180deg, #34d399, #22c55e); color: #fff; cursor: pointer; }", ".wg-bet-sheet.theme-green .wg-bet-confirm:not(:disabled) { background: var(--theme-green); color: #fff; cursor: pointer; }"],
  [".wg-bet-sheet.theme-violet .wg-bet-confirm:not(:disabled) { background: linear-gradient(180deg, #a78bfa, #8b5cf6); color: #fff; cursor: pointer; }", ".wg-bet-sheet.theme-violet .wg-bet-confirm:not(:disabled) { background: var(--theme-violet); color: #fff; cursor: pointer; }"],
  [".wg-bet-sheet.theme-red .wg-bet-confirm:not(:disabled) { background: linear-gradient(180deg, #f87171, #ef4444); color: #fff; cursor: pointer; }", ".wg-bet-sheet.theme-red .wg-bet-confirm:not(:disabled) { background: var(--theme-danger); color: #fff; cursor: pointer; }"],
  [".wg-bet-sheet.theme-orange .wg-bet-confirm:not(:disabled) { background: linear-gradient(180deg, #fb923c, #f97316); color: #fff; cursor: pointer; }", ".wg-bet-sheet.theme-orange .wg-bet-confirm:not(:disabled) { background: var(--theme-orange); color: #fff; cursor: pointer; }"],
  [".wg-bet-sheet.theme-blue .wg-bet-confirm:not(:disabled) { background: linear-gradient(180deg, #60a5fa, var(--theme-green)); color: #fff; cursor: pointer; }", ".wg-bet-sheet.theme-blue .wg-bet-confirm:not(:disabled) { background: var(--theme-blue-light); color: #fff; cursor: pointer; }"],
  [".wg-bet-sheet.theme-v5 .wg-bet-confirm:not(:disabled) { background: linear-gradient(180deg, #a78bfa, #8b5cf6); color: #fff; cursor: pointer; }", ".wg-bet-sheet.theme-v5 .wg-bet-confirm:not(:disabled) { background: var(--theme-violet); color: #fff; cursor: pointer; }"],
  [".wg-rules-tag-green { background: linear-gradient(180deg, #4ade80, #22c55e); }", ".wg-rules-tag-green { background: var(--theme-green); }"],
  [".wg-rules-tag-red { background: linear-gradient(180deg, #f87171, #ef4444); }", ".wg-rules-tag-red { background: var(--theme-danger); }"],
  [".wg-rules-tag-violet { background: linear-gradient(180deg, #a78bfa, #8b5cf6); }", ".wg-rules-tag-violet { background: var(--theme-violet); }"],
  [".wg-rules-tag-orange { background: linear-gradient(180deg, #fb923c, #f97316); }", ".wg-rules-tag-orange { background: var(--theme-orange); }"],
  [".wg-rules-tag-blue { background: linear-gradient(180deg, #60a5fa, var(--theme-green)); }", ".wg-rules-tag-blue { background: var(--theme-blue-light); }"],
  ["background: linear-gradient(180deg, #4ade80, #22c55e);", "background: var(--theme-green);"],
  ["background: linear-gradient(180deg, #fde68a 0%, #f59e0b 55%, #d97706 100%);", "background: none;"],
];

const RADIAL_BLOCKS = [
  [
    /background:\s*\n\s*radial-gradient\([^;]+\),\s*\n\s*radial-gradient\([^;]+\),\s*\n\s*radial-gradient\([^;]+\);/g,
    "background: var(--theme-bg-soft);",
  ],
  [
    /background:\s*\n\s*radial-gradient\([^;]+\),\s*\n\s*radial-gradient\([^;]+\);/g,
    "background: var(--theme-bg-soft);",
  ],
  [
    /background:\s*\n\s*radial-gradient\([^;]+\);/g,
    "background: var(--theme-bg-soft);",
  ],
  [
    /background-image:\s*var\(--theme-gradient-green-soft\)/g,
    "background-color: var(--theme-green-soft-bg)",
  ],
];

function stripRemainingGradients(css) {
  return css.replace(/linear-gradient\([^)]*\)/g, (match) => {
    if (match.includes("#fff 0 0")) return match;
    const hex = match.match(/#[0-9a-fA-F]{3,8}/);
    if (hex) return hex[0];
    const varMatch = match.match(/var\(--theme-[^)]+\)/);
    if (varMatch) return varMatch[0];
    const rgba = match.match(/rgba?\([^)]+\)/);
    if (rgba) return rgba[0];
    return "var(--theme-bg-card)";
  }).replace(/radial-gradient\([^)]*\)/g, "transparent");
}

for (const file of CSS_FILES) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) continue;
  let css = fs.readFileSync(fullPath, "utf8");
  let changed = false;

  for (const [from, to] of EXACT) {
    if (css.includes(from)) {
      css = css.split(from).join(to);
      changed = true;
    }
  }

  for (const [pattern, replacement] of RADIAL_BLOCKS) {
    if (pattern.test(css)) {
      css = css.replace(pattern, replacement);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(fullPath, css);
    console.log("updated", file);
  }
}

console.log("done");
