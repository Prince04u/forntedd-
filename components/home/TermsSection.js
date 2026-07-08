"use client";

export default function TermsSection() {
  return (
    <section className="terms-premium-section-flat">
      <div className="terms-flat-header">
        <div className="terms-flat-age-badge">18+</div>
        <a
          href="https://t.me/yourchannel"
          target="_blank"
          rel="noopener noreferrer"
          className="terms-flat-telegram-btn"
          aria-label="Telegram Community"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "20px", height: "20px" }}>
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </a>
      </div>

      <h3 className="terms-flat-title">Responsible Gaming</h3>

      <ul className="terms-flat-list">
        <li>
          <span className="terms-flat-bullet">✦</span>
          <span>Players must be 18 years or older.</span>
        </li>
        <li>
          <span className="terms-flat-bullet">✦</span>
          <span>LuckyNova provides fair, secure and transparent gaming.</span>
        </li>
        <li>
          <span className="terms-flat-bullet">✦</span>
          <span>Fast deposits and withdrawals are available.</span>
        </li>
        <li>
          <span className="terms-flat-bullet">✦</span>
          <span>Promotions are subject to their respective terms.</span>
        </li>
        <li>
          <span className="terms-flat-bullet">✦</span>
          <span>Please play responsibly and within your limits.</span>
        </li>
      </ul>

      <div className="terms-flat-warning-box">
        <span className="warning-icon">⚠</span>
        <span className="warning-text">Gambling can be addictive. Please play responsibly.</span>
      </div>
    </section>
  );
}