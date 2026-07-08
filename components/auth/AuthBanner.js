export default function AuthBanner({ title, subtitle }) {
  return (
    <div className="auth-banner">

      {/* Background Effects */}
      <div className="hero-glow"></div>
      <div className="hero-circle hero-circle-1"></div>
      <div className="hero-circle hero-circle-2"></div>

      {/* Left Content */}
      <div className="auth-banner-content">
        <span className="hero-badge">
          🎁 WELCOME BONUS
        </span>

        <h1>{title}</h1>

        <p>{subtitle}</p>

        <div className="hero-stats">

          <div className="hero-stat">
            <strong>2M+</strong>
            <span>Players</span>
          </div>

          <div className="hero-stat">
            <strong>24×7</strong>
            <span>Support</span>
          </div>

          <div className="hero-stat">
            <strong>100%</strong>
            <span>Secure</span>
          </div>

        </div>

      </div>

      {/* Right Card */}

      <div className="hero-card">

        <div className="hero-card-top">
          💰
        </div>

        <div className="hero-card-title">
          Welcome Bonus
        </div>

        <div className="hero-card-amount">
          ₹10,000
        </div>

        <div className="hero-card-text">
          Register today and unlock exclusive rewards.
        </div>

      </div>

    </div>
  );
}
