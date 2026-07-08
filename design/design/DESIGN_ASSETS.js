/**
 * LUCKY NOVA — design assets catalog (single source of truth)
 *
 * Screen mockups: docs/design/refs/
 * Reusable images: docs/design/assets/  (+ copies in frontend/public/design/)
 *
 * Usage (Next.js):
 *   import { DESIGN_ASSETS, assetUrl } from "@/lib/designAssets";
 *   <Image src={assetUrl(DESIGN_ASSETS.carouselBanners[0].image)} alt="..." />
 */

export const PUBLIC_BASE = "/design";

/** Repo-relative paths (for docs / tooling) */
export const REPO = {
  refs: "docs/design/refs",
  assets: "docs/design/assets",
};

export const DESIGN_ASSETS = {
  version: "1.0.0",
  updated: "2026-06-13",
  brand: {
    name: "LUCKY NOVA",
    logoEmoji: "👑",
    maxWidth: 480,
    colors: {
      bg: "#0a0a12",
      text: "#ffffff",
      textMuted: "#94a3b8",
      accentCyan: "#38bdf8",
      accentGold: "#fbbf24",
      accentPink: "#f093fb",
      accentGreen: "#22c55e",
      accentRed: "#f5576c",
      error: "#ef4444",
      success: "#22c55e",
    },
    gradients: {
      logo: "linear-gradient(135deg, #7dd3fc, #38bdf8, #818cf8)",
      promoBtn: "linear-gradient(90deg, #f093fb, #f5576c)",
      depositCta: "linear-gradient(90deg, #38bdf8, #818cf8)",
    },
  },

  /** Full-screen UI references (implementation targets) */
  screenRefs: {
    home: {
      id: "home",
      label: "Home lobby",
      backlog: "D1.1",
      file: `${REPO.refs}/home-screen-ui-reference.png`,
    },
    wallet: {
      id: "wallet",
      label: "Wallet hub",
      backlog: "D1.4",
      file: `${REPO.refs}/wallet-screen-ui-reference.png`,
    },
    deposit: {
      id: "deposit",
      label: "Deposit flow",
      backlog: "D1.5",
      file: `${REPO.refs}/deposit-screen-ui-reference.png`,
    },
    withdraw: {
      id: "withdraw",
      label: "Withdraw flow",
      backlog: "D1.5",
      file: `${REPO.refs}/withdraw-screen-ui-reference.png`,
    },
    wingo: {
      id: "wingo",
      label: "Wingo 30s",
      backlog: "D1.6",
      file: `${REPO.refs}/wingo-screen-ui-reference.png`,
    },
    account: {
      id: "account",
      label: "Account hub",
      backlog: "D1.7",
      file: `${REPO.refs}/account-screen-ui-reference.png`,
    },
    invite: {
      id: "invite",
      label: "Invite & Earn",
      backlog: "D2.1",
      file: `${REPO.refs}/invite-screen-ui-reference.png`,
    },
  },

  /**
   * Home carousel banners — maps to PromoBanner + backend promoBanners.carousel
   * Replace emoji/CSS gradient with image when polishing D1.1
   */
  carouselBanners: [
    {
      id: "first-deposit",
      badge: "UP TO ₹488",
      amount: "₹488",
      title: "FIRST DEPOSIT BONUS",
      emoji: "💰",
      link: "/wallet/deposit",
      image: `${PUBLIC_BASE}/banners/first-deposit-bonus.png`,
      sourceFile: `${REPO.assets}/banners/first-deposit-bonus.png`,
      aspectRatio: "16/9",
      usedIn: ["home", "PromoBanner"],
    },
    {
      id: "login-bonus",
      badge: "DAILY REWARD",
      amount: "₹100",
      title: "LOGIN BONUS",
      emoji: "🎁",
      link: "/wallet/deposit",
      image: `${PUBLIC_BASE}/banners/login-bonus.png`,
      sourceFile: `${REPO.assets}/banners/login-bonus.png`,
      aspectRatio: "16/9",
      usedIn: ["home", "PromoBanner"],
    },
    {
      id: "wingo-payout",
      badge: "WINGO",
      amount: "9X",
      title: "NUMBER WIN PAYOUT",
      emoji: "🎱",
      link: "/wingo/30s",
      image: `${PUBLIC_BASE}/banners/wingo-payout.png`,
      sourceFile: `${REPO.assets}/banners/wingo-payout.png`,
      aspectRatio: "16/9",
      usedIn: ["home", "PromoBanner"],
    },
  ],

  /**
   * Home promo section cards — maps to PromoSection + backend promoBanners.cards
   */
  promoCards: [
    {
      id: "deposit",
      icon: "💰",
      title: "First deposit bonus",
      detail: "Up to ₹488 on your first top-up",
      href: "/wallet/deposit",
      cta: "Deposit now",
      theme: "gold",
      image: `${PUBLIC_BASE}/promo-cards/deposit-gold.png`,
      sourceFile: `${REPO.assets}/promo-cards/deposit-gold.png`,
      usedIn: ["home", "PromoSection", "bottom-nav-promo"],
    },
    {
      id: "referral",
      icon: "🤝",
      title: "Invite & earn",
      detail: "Share your code and earn referral rewards",
      href: "/referral",
      cta: "Invite friends",
      theme: "blue",
      image: `${PUBLIC_BASE}/promo-cards/referral-blue.png`,
      sourceFile: `${REPO.assets}/promo-cards/referral-blue.png`,
      usedIn: ["home", "PromoSection"],
    },
    {
      id: "wingo",
      icon: "🎱",
      title: "WinGo live",
      detail: "30s, 1m, 3m, 5m — bet on color, size, or number",
      href: "/wingo/30s",
      cta: "Play now",
      theme: "pink",
      image: `${PUBLIC_BASE}/promo-cards/wingo-pink.png`,
      sourceFile: `${REPO.assets}/promo-cards/wingo-pink.png`,
      usedIn: ["home", "PromoSection"],
    },
  ],

  /**
   * Game grid tiles — maps to GameGrid categories (popular / lottery / mini)
   */
  gameTiles: [
    {
      id: "wingo",
      label: "WINGO",
      href: "/wingo/30s",
      className: "wingo",
      art: "🎱",
      image: `${PUBLIC_BASE}/game-tiles/wingo.png`,
      sourceFile: `${REPO.assets}/game-tiles/wingo.png`,
      category: "popular",
      comingSoon: false,
    },
    {
      id: "aviator",
      label: "AVIATOR",
      className: "aviator",
      art: "✈️",
      image: `${PUBLIC_BASE}/game-tiles/aviator.png`,
      sourceFile: `${REPO.assets}/game-tiles/aviator.png`,
      category: "popular",
      comingSoon: true,
    },
    {
      id: "cricket",
      label: "CRICKET",
      className: "cricket",
      art: "🏏",
      image: `${PUBLIC_BASE}/game-tiles/cricket.png`,
      sourceFile: `${REPO.assets}/game-tiles/cricket.png`,
      category: "popular",
      comingSoon: true,
    },
    {
      id: "mines",
      label: "MINES",
      href: "/mines",
      className: "mines",
      art: "💎",
      image: null,
      sourceFile: null,
      category: "mini",
      comingSoon: false,
    },
  ],

  /** Bottom nav tab icons — side tabs rendered as SVG in NavIcon.js (currentColor).
   *  Center buttons use PNG badges in public/design/nav/. */
  navIcons: [
    { id: "home", label: "Home", render: "svg", image: `${PUBLIC_BASE}/nav/home.png`, sourceFile: `${REPO.assets}/nav/home.png` },
    { id: "invite", label: "Invite", image: `${PUBLIC_BASE}/nav/invite.png`, sourceFile: `${REPO.assets}/nav/invite.png` },
    { id: "wallet", label: "Wallet", image: `${PUBLIC_BASE}/nav/wallet.png`, sourceFile: `${REPO.assets}/nav/wallet.png` },
    { id: "account", label: "Account", image: `${PUBLIC_BASE}/nav/account.png`, sourceFile: `${REPO.assets}/nav/account.png` },
    { id: "promo-btn", label: "Promo", image: `${PUBLIC_BASE}/nav/promo-btn.png`, sourceFile: `${REPO.assets}/nav/promo-btn.png` },
    { id: "partner-btn", label: "Partner", image: `${PUBLIC_BASE}/nav/partner-btn.png`, sourceFile: `${REPO.assets}/nav/partner-btn.png` },
  ],

  /** Bottom nav — fixed bar (see docs/design/refs/bottom-nav-ui-reference.png) */
  bottomNav: {
    fixed: true,
    maxWidth: 480,
    zIndex: 100,
    safeArea: true,
    items: ["home", "invite", "promo-center", "wallet", "account"],
    activeColor: "#38bdf8",
    inactiveColor: "#64748b",
    promoLabel: "PROMO",
    promoLabelColor: "#fbbf24",
    partnerLabel: "Partner",
    screenRef: `${REPO.refs}/bottom-nav-ui-reference.png`,
    partnerScreenRef: `${REPO.refs}/bottom-nav-partner-ui-reference.png`,
  },

  /** Bottom nav center button (normal user = promotions) */
  navPromo: {
    icon: "💎",
    label: "Promotion",
    href: "/#promo",
    partnerIcon: "🏢",
    partnerLabel: "Partner",
    partnerHref: "/agent",
  },

  /** Account screen icons — rendered as SVG in AccountIcon.js */
  accountIcons: [
    { id: "wallet", label: "Wallet", group: "quick-actions", image: `${PUBLIC_BASE}/account/quick-actions/wallet.png`, sourceFile: `${REPO.assets}/account/quick-actions/wallet.png` },
    { id: "deposit", label: "Deposit", group: "quick-actions", image: `${PUBLIC_BASE}/account/quick-actions/deposit.png`, sourceFile: `${REPO.assets}/account/quick-actions/deposit.png` },
    { id: "withdraw", label: "Withdraw", group: "quick-actions", image: `${PUBLIC_BASE}/account/quick-actions/withdraw.png`, sourceFile: `${REPO.assets}/account/quick-actions/withdraw.png` },
    { id: "vip", label: "VIP", group: "quick-actions", image: `${PUBLIC_BASE}/account/quick-actions/vip.png`, sourceFile: `${REPO.assets}/account/quick-actions/vip.png` },
    { id: "game-history", label: "Game History", group: "history", image: `${PUBLIC_BASE}/account/history/game-history.png`, sourceFile: `${REPO.assets}/account/history/game-history.png` },
    { id: "transaction", label: "Transaction", group: "history", image: `${PUBLIC_BASE}/account/history/transaction.png`, sourceFile: `${REPO.assets}/account/history/transaction.png` },
    { id: "deposit-history", label: "Deposit history", group: "history", image: `${PUBLIC_BASE}/account/history/deposit-history.png`, sourceFile: `${REPO.assets}/account/history/deposit-history.png` },
    { id: "withdraw-history", label: "Withdraw history", group: "history", image: `${PUBLIC_BASE}/account/history/withdraw-history.png`, sourceFile: `${REPO.assets}/account/history/withdraw-history.png` },
    { id: "edit-profile", label: "Edit profile", group: "menu", image: `${PUBLIC_BASE}/account/menu/edit-profile.png`, sourceFile: `${REPO.assets}/account/menu/edit-profile.png` },
    { id: "security", label: "Security", group: "menu", image: `${PUBLIC_BASE}/account/menu/security.png`, sourceFile: `${REPO.assets}/account/menu/security.png` },
    { id: "kyc", label: "KYC verification", group: "menu", image: `${PUBLIC_BASE}/account/menu/kyc.png`, sourceFile: `${REPO.assets}/account/menu/kyc.png` },
    { id: "notifications", label: "Notifications", group: "menu", image: `${PUBLIC_BASE}/account/menu/notifications.png`, sourceFile: `${REPO.assets}/account/menu/notifications.png` },
    { id: "invite-friends", label: "Invite friends", group: "menu", image: `${PUBLIC_BASE}/account/menu/invite-friends.png`, sourceFile: `${REPO.assets}/account/menu/invite-friends.png` },
    { id: "gifts", label: "Gifts", group: "menu", image: `${PUBLIC_BASE}/account/menu/gifts.png`, sourceFile: `${REPO.assets}/account/menu/gifts.png` },
    { id: "game-stats", label: "Game statistics", group: "menu", image: `${PUBLIC_BASE}/account/menu/game-stats.png`, sourceFile: `${REPO.assets}/account/menu/game-stats.png` },
    { id: "partner", label: "Partner portal", group: "menu", image: `${PUBLIC_BASE}/account/menu/partner.png`, sourceFile: `${REPO.assets}/account/menu/partner.png` },
    { id: "announcement", label: "Announcement", group: "service", image: `${PUBLIC_BASE}/account/service/announcement.png`, sourceFile: `${REPO.assets}/account/service/announcement.png` },
    { id: "customer-service", label: "Customer Service", group: "service", image: `${PUBLIC_BASE}/account/service/customer-service.png`, sourceFile: `${REPO.assets}/account/service/customer-service.png` },
    { id: "feedback", label: "Feedback", group: "service", image: `${PUBLIC_BASE}/account/service/feedback.png`, sourceFile: `${REPO.assets}/account/service/feedback.png` },
    { id: "guide", label: "Beginner's Guide", group: "service", image: `${PUBLIC_BASE}/account/service/guide.png`, sourceFile: `${REPO.assets}/account/service/guide.png` },
    { id: "about", label: "About us", group: "service", image: `${PUBLIC_BASE}/account/service/about.png`, sourceFile: `${REPO.assets}/account/service/about.png` },
    { id: "logout", label: "Logout", group: "misc", image: `${PUBLIC_BASE}/account/logout.png`, sourceFile: `${REPO.assets}/account/logout.png` },
  ],

  /** Deposit flow icons — SVG for UI chrome, PNG logos in DepositIcon.js */
  depositIcons: [
    { id: "innate", label: "Innate UPI-QR", image: `${PUBLIC_BASE}/deposit/innate-payment.png`, sourceFile: `${REPO.assets}/deposit/innate-payment.png` },
    { id: "expert", label: "Expert UPI-QR", image: `${PUBLIC_BASE}/deposit/expert-payment.png`, sourceFile: `${REPO.assets}/deposit/expert-payment.png` },
    { id: "paytm", label: "Paytm UPI-QR", image: `${PUBLIC_BASE}/deposit/paytm-payment.png`, sourceFile: `${REPO.assets}/deposit/paytm-payment.png` },
    { id: "usdt", label: "USDT TRC20", image: `${PUBLIC_BASE}/deposit/usdt.svg`, sourceFile: `${REPO.assets}/deposit/usdt.svg` },
    { id: "arpay", label: "ARPAY UPI-QR", image: `${PUBLIC_BASE}/deposit/arpay-payment.png`, sourceFile: `${REPO.assets}/deposit/arpay-payment.png` },
    { id: "channel-3cpay", label: "3cPay-QR", image: `${PUBLIC_BASE}/deposit/channel-3cpay.png`, sourceFile: `${REPO.assets}/deposit/channel-3cpay.png` },
    { id: "channel-weepay", label: "PAYTM-WePay", image: `${PUBLIC_BASE}/deposit/channel-weepay.png`, sourceFile: `${REPO.assets}/deposit/channel-weepay.png` },
    { id: "channel-weePay2", label: "PAYTM-WeePay", image: `${PUBLIC_BASE}/deposit/channel-weePay2.png`, sourceFile: `${REPO.assets}/deposit/channel-weePay2.png` },
    { id: "wallet-pill", label: "Wallet balance", image: `${PUBLIC_BASE}/deposit/wallet-pill.png`, sourceFile: `${REPO.assets}/deposit/wallet-pill.png` },
    { id: "document", label: "UTR document", image: `${PUBLIC_BASE}/deposit/document-icon.png`, sourceFile: `${REPO.assets}/deposit/document-icon.png` },
    { id: "camera", label: "Upload proof", image: `${PUBLIC_BASE}/deposit/camera-upload.png`, sourceFile: `${REPO.assets}/deposit/camera-upload.png` },
    { id: "lock", label: "Secure transactions", image: `${PUBLIC_BASE}/deposit/lock-secure.png`, sourceFile: `${REPO.assets}/deposit/lock-secure.png` },
    { id: "upi-badge", label: "UPI", image: `${PUBLIC_BASE}/deposit/upi-badge.png`, sourceFile: `${REPO.assets}/deposit/upi-badge.png` },
  ],

  /** Wallet hub screen icons — rendered as SVG in WalletIcon.js (see refs/wallet-screen-ui-reference.png) */
  walletIcons: [
    { id: "hero", label: "Wallet", render: "svg", image: `${PUBLIC_BASE}/wallet/hero-icon.png`, sourceFile: `${REPO.assets}/wallet/hero-icon.png` },
    { id: "deposit", label: "Deposit", color: "yellow", image: `${PUBLIC_BASE}/wallet/deposit.png`, sourceFile: `${REPO.assets}/wallet/deposit.png` },
    { id: "withdraw", label: "Withdraw", color: "blue", image: `${PUBLIC_BASE}/wallet/withdraw.png`, sourceFile: `${REPO.assets}/wallet/withdraw.png` },
    { id: "deposit-history", label: "Deposit history", color: "red", image: `${PUBLIC_BASE}/wallet/deposit-history.png`, sourceFile: `${REPO.assets}/wallet/deposit-history.png` },
    { id: "withdraw-history", label: "Withdrawal history", color: "green", image: `${PUBLIC_BASE}/wallet/withdraw-history.png`, sourceFile: `${REPO.assets}/wallet/withdraw-history.png` },
  ],

  /** @deprecated use walletIcons */
  walletActions: [
    { id: "deposit", label: "Deposit", color: "gold" },
    { id: "withdraw", label: "Withdraw", color: "blue" },
    { id: "deposit-history", label: "Deposit history", color: "red" },
    { id: "withdraw-history", label: "Withdrawal history", color: "green" },
  ],

  accountHistoryCards: [
    { id: "game-history", title: "Game History", color: "blue", href: "/games/history" },
    { id: "transaction", title: "Transaction", color: "green", href: "/wallet/transactions" },
    { id: "deposit-history", title: "Deposit", color: "red", href: "/wallet/deposit/history" },
    { id: "withdraw-history", title: "Withdraw", color: "orange", href: "/wallet/withdraw/history" },
  ],
};

/** Resolve public asset URL (pass path from carouselBanners[].image etc.) */
export const assetUrl = (path) => (path.startsWith("/") ? path : `${PUBLIC_BASE}/${path}`);

export const getCarouselBanner = (id) => DESIGN_ASSETS.carouselBanners.find((b) => b.id === id);

export const getPromoCard = (id) => DESIGN_ASSETS.promoCards.find((c) => c.id === id);

export const getGameTile = (id) => DESIGN_ASSETS.gameTiles.find((t) => t.id === id);

export const getAccountIcon = (id) => DESIGN_ASSETS.accountIcons.find((icon) => icon.id === id);

export const getNavIcon = (id) => DESIGN_ASSETS.navIcons.find((icon) => icon.id === id);

export const getWalletIcon = (id) => DESIGN_ASSETS.walletIcons.find((icon) => icon.id === id);

export const getDepositIcon = (id) => DESIGN_ASSETS.depositIcons.find((icon) => icon.id === id);
