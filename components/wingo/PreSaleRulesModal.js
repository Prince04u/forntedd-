"use client";

const DEFAULT_PAYOUTS = {
  green: 2,
  red: 2,
  violet: 4.5,
  big_small: 2,
  number: 9,
};

const RULE_SECTIONS = [
  {
    title: "Color bets",
    items: [
      { label: "Green", detail: "Wins on 1, 3, 7, 9", tag: "green", payoutKey: "green" },
      { label: "Red", detail: "Wins on 2, 4, 6, 8", tag: "red", payoutKey: "red" },
      { label: "Violet", detail: "Wins on 0 or 5", tag: "violet", payoutKey: "violet" },
    ],
  },
  {
    title: "Size bets",
    items: [
      { label: "Small", detail: "Wins on numbers 0–4", tag: "orange", payoutKey: "big_small" },
      { label: "Big", detail: "Wins on numbers 5–9", tag: "blue", payoutKey: "big_small" },
    ],
  },
  {
    title: "Number bet",
    items: [
      {
        label: "Exact number",
        detail: "Pick any single digit 0–9",
        tag: "green",
        payoutKey: "number",
      },
    ],
  },
];

const PRE_SALE_NOTES = [
  "Bets placed before the result is declared are pre-sale bets.",
  "When 5 seconds or less remain, betting is locked for that round.",
  "Total stake = base amount × quantity × multiplier.",
  "Winnings are credited automatically after the result is announced.",
  "By placing a bet you confirm you understand these rules.",
];

const formatPayout = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return Number.isInteger(amount) ? `${amount}x` : `${amount}x`;
};

export default function PreSaleRulesModal({ open, onClose, payouts = DEFAULT_PAYOUTS }) {
  if (!open) return null;

  const activePayouts = { ...DEFAULT_PAYOUTS, ...payouts };

  return (
    <div className="wg-rules-overlay" onClick={onClose} role="presentation">
      <div
        className="wg-rules-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wg-rules-title"
      >
        <div className="wg-rules-header">
          <div className="wg-rules-header-icon">📋</div>
          <div>
            <p className="wg-rules-kicker">WinGo</p>
            <h2 id="wg-rules-title">Pre-sale rules</h2>
          </div>
          <button type="button" className="wg-rules-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="wg-rules-body">
          <section className="wg-rules-section">
            <h3>How to play</h3>
            <p className="wg-rules-intro">
              Choose a color, number, or size before the timer ends. If your selection matches the
              result, you win according to the payout below.
            </p>
          </section>

          {RULE_SECTIONS.map((section) => (
            <section key={section.title} className="wg-rules-section">
              <h3>{section.title}</h3>
              <ul className="wg-rules-list">
                {section.items.map((item) => (
                  <li key={item.label} className="wg-rules-item">
                    <span className={`wg-rules-tag wg-rules-tag-${item.tag}`}>{item.label}</span>
                    <div className="wg-rules-item-copy">
                      <span>{item.detail}</span>
                      <strong>Payout {formatPayout(activePayouts[item.payoutKey])}</strong>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section className="wg-rules-section">
            <h3>Special results</h3>
            <div className="wg-rules-special">
              <div className="wg-rules-special-card">
                <span className="wg-mini-ball v0">0</span>
                <p>Green + Violet</p>
              </div>
              <div className="wg-rules-special-card">
                <span className="wg-mini-ball v5">5</span>
                <p>Red + Violet</p>
              </div>
            </div>
          </section>

          <section className="wg-rules-section">
            <h3>Pre-sale terms</h3>
            <ul className="wg-rules-notes">
              {PRE_SALE_NOTES.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="wg-rules-footer">
          <button type="button" className="wg-rules-ok" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
