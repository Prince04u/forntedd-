"use client";

const RULE_SECTIONS = [
  {
    title: "How to play",
    items: [
      { label: "Place a bet", detail: "Choose your stake and number of mines, then tap Start." },
      { label: "Reveal tiles", detail: "Tap tiles to uncover gems. Each safe tile increases your multiplier." },
      { label: "Avoid mines", detail: "Hit a mine and you lose your stake for that round." },
      { label: "Cash out", detail: "Collect your winnings at any time before hitting a mine." },
    ],
  },
  {
    title: "Mine counts",
    items: [
      { label: "3 mines", detail: "Lower risk, smaller multipliers per tile." },
      { label: "5 mines", detail: "Balanced risk and reward." },
      { label: "10 mines", detail: "Higher risk, faster multiplier growth." },
      { label: "15–20 mines", detail: "Maximum risk for experienced players." },
    ],
  },
];

const NOTES = [
  "Only one active Mines round is allowed at a time.",
  "Your stake is deducted when you start a round.",
  "Winnings are credited instantly when you cash out.",
  "If you hit a mine, the round ends and your stake is lost.",
  "By playing you confirm you understand these rules.",
];

export default function MinesRulesModal({ open, onClose, betLimits }) {
  if (!open) return null;

  const minBet = betLimits?.minBetAmount ?? 1;
  const maxBet = betLimits?.maxBetAmount ?? 100000;

  return (
    <div className="ms-rules-overlay" onClick={onClose} role="presentation">
      <div
        className="ms-rules-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ms-rules-title"
      >
        <div className="ms-rules-header">
          <div className="ms-rules-header-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(212, 175, 55, 0.12)", border: "1px solid rgba(212, 175, 55, 0.3)", borderRadius: "12px", width: "42px", height: "42px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "20px", height: "20px", color: "var(--theme-gold-bright)" }}>
              <path d="M6 3h12l4 6-10 12L2 9z" />
            </svg>
          </div>
          <div>
            <p className="ms-rules-kicker">Mines</p>
            <h2 id="ms-rules-title">Game rules</h2>
          </div>
          <button type="button" className="ms-rules-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ms-rules-body">
          {RULE_SECTIONS.map((section) => (
            <section key={section.title} className="ms-rules-section">
              <h3>{section.title}</h3>
              <ul>
                {section.items.map((item) => (
                  <li key={item.label}>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section className="ms-rules-section">
            <h3>Bet limits</h3>
            <p className="ms-rules-note">
              Minimum bet ₹{minBet.toLocaleString("en-IN")} · Maximum bet ₹
              {maxBet.toLocaleString("en-IN")}
            </p>
          </section>

          <section className="ms-rules-section">
            <h3>Important notes</h3>
            <ul className="ms-rules-notes">
              {NOTES.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
