"use client";

const CATEGORIES = [
  { id: "all", label: "All Games", icon: "clover" },
  { id: "popular", label: "Popular", icon: "flame" },
  { id: "lottery", label: "Lottery", icon: "ball" },
  { id: "slots", label: "Slots", icon: "slots" },
  { id: "live", label: "Live Casino", icon: "dealer" },
  { id: "sports", label: "Sports", icon: "sports" },
  { id: "mini", label: "Mini Games", icon: "controller" },
];

const renderCategoryIcon = (iconName) => {
  switch (iconName) {
    case "clover":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="category-svg" style={{ width: "24px", height: "24px" }}>
          {/* Stem */}
          <path d="M12 14v5a1 1 0 0 1-2 0v-5h2z" />
          {/* Leaves */}
          <path d="M12.003 11.233a3.17 3.17 0 0 0-3.17-3.17 3.17 3.17 0 0 0-3.17 3.17c0 2.18 3.17 4.65 3.17 4.65s3.17-2.47 3.17-4.65zm3.763.504a3.17 3.17 0 0 0 3.17-3.17 3.17 3.17 0 0 0-3.17-3.17c-2.18 0-4.65 3.17-4.65 3.17s2.47 3.17 4.65 3.17zm.504 3.763a3.17 3.17 0 0 0 3.17 3.17 3.17 3.17 0 0 0 3.17-3.17c0-2.18-3.17-4.65-3.17-4.65s-3.17 2.47-3.17 4.65zm-3.763-.504a3.17 3.17 0 0 0-3.17 3.17 3.17 3.17 0 0 0 3.17 3.17c2.18 0 4.65-3.17 4.65-3.17s-2.47-3.17-4.65-3.17z" />
        </svg>
      );
    case "flame":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="category-svg" style={{ width: "22px", height: "22px" }}>
          <path d="M12 23c-4.42 0-8-3.58-8-8 0-4.04 3-7.78 3-7.78s.77 1.86 1.48 2.52C9.5 5.5 12 2 12 2s2.5 3.5 3.52 7.74c.71-.66 1.48-2.52 1.48-2.52s3 3.74 3 7.78c0 4.42-3.58 8-8 8z" />
        </svg>
      );
    case "ball":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="category-svg" style={{ width: "24px", height: "24px" }}>
          {/* Outer circle */}
          <circle cx="12" cy="12" r="9.5" />
          {/* Poker Chip Rim segments */}
          <circle cx="12" cy="12" r="8" fill="none" stroke="#141414" strokeWidth="1.5" strokeDasharray="4 3" />
          {/* Inner circle */}
          <circle cx="12" cy="12" r="5.5" fill="#FFF" />
          {/* Number 8 */}
          <path d="M12 9.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm0 3c1 0 1.5.5 1.5 1.25 0 .5-.5 1-1.5 1s-1.5-.5-1.5-1c0-.75.5-1.25 1.5-1.25z" fill="#141414" />
        </svg>
      );
    case "slots":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="category-svg" style={{ width: "24px", height: "24px" }}>
          {/* Main box */}
          <rect x="5" y="4" width="12" height="15" rx="1.5" />
          {/* Window */}
          <rect x="7" y="7" width="8" height="4.5" fill="#141414" />
          {/* 777 text inside window */}
          <text x="7.5" y="11" fill="currentColor" fontSize="3.5" fontWeight="900" letterSpacing="0.2">777</text>
          {/* Handle */}
          <path d="M17 11h2.5V8.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="19.5" cy="7.5" r="1.5" />
          {/* Legs */}
          <rect x="7" y="19" width="2" height="2" rx="0.5" />
          <rect x="13" y="19" width="2" height="2" rx="0.5" />
          {/* Top banner dome */}
          <path d="M7.5 4c0-1 1-1.5 4.5-1.5s4.5.5 4.5 1.5" />
        </svg>
      );
    case "dealer":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="category-svg" style={{ width: "24px", height: "24px" }}>
          {/* Head & Hair */}
          <path d="M12 2c-2.2 0-4 1.8-4 4 0 .7.2 1.4.5 2C8.2 8.3 8 8.8 8 9.5c0 1.4 1.1 2.5 2.5 2.5.5 0 1-.1 1.5-.4.5.3 1 .4 1.5.4 1.4 0 2.5-1.1 2.5-2.5 0-.7-.2-1.2-.5-1.5.3-.6.5-1.3.5-2 0-2.2-1.8-4-4-4z" />
          {/* Suit body */}
          <path d="M6 19v2h12v-2c0-3-2.5-4.5-6-4.5S6 16 6 19z" />
          {/* Vest collar and tie shape */}
          <polygon points="12,14.5 10.5,17 13.5,17" fill="#141414" />
          <polygon points="12,17 11,20 13,20" fill="#141414" />
        </svg>
      );
    case "sports":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="category-svg" style={{ width: "24px", height: "24px" }}>
          {/* Soccer Ball */}
          <circle cx="12" cy="12" r="10" />
          <polygon points="12,9 9.5,10.8 10.5,13.8 13.5,13.8 14.5,10.8" fill="#141414" />
          <line x1="12" y1="9" x2="12" y2="4" stroke="#141414" strokeWidth="1.5" />
          <line x1="9.5" y1="10.8" x2="4.5" y2="9.2" stroke="#141414" strokeWidth="1.5" />
          <line x1="10.5" y1="13.8" x2="7.5" y2="18.5" stroke="#141414" strokeWidth="1.5" />
          <line x1="13.5" y1="13.8" x2="16.5" y2="18.5" stroke="#141414" strokeWidth="1.5" />
          <line x1="14.5" y1="10.8" x2="19.5" y2="9.2" stroke="#141414" strokeWidth="1.5" />
        </svg>
      );
    case "controller":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="category-svg" style={{ width: "24px", height: "24px" }}>
          {/* Gamepad controller body */}
          <path d="M19 6H5c-2.2 0-4 1.8-4 4v4c0 2.2 1.8 4 4 4h14c2.2 0 4-1.8 4-4v-4c0-2.2-1.8-4-4-4z" />
          {/* D-pad cross cutouts */}
          <path d="M5.5 9.5h1v4h-1z" fill="#141414" />
          <path d="M4 11h4v1H4z" fill="#141414" />
          {/* Action buttons */}
          <circle cx="16.5" cy="11.5" r="1.1" fill="#141414" />
          <circle cx="18.5" cy="11.5" r="1.1" fill="#141414" />
          <circle cx="17.5" cy="10.2" r="1.1" fill="#141414" />
          <circle cx="17.5" cy="12.8" r="1.1" fill="#141414" />
        </svg>
      );
    default:
      return null;
  }
};

export default function CategoryTabs({ active, onChange }) {
  return (
    <div className="club-categories">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          type="button"
          className={`club-category-tab ${active === cat.id ? "active" : ""}`}
          onClick={() => onChange(cat.id)}
        >
          <span className="club-category-icon-wrap">
            {renderCategoryIcon(cat.icon)}
          </span>

          <span className="club-category-label">
            {cat.label}
          </span>
        </button>
      ))}
    </div>
  );
}
