"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { getGameTile } from "@/lib/designAssets";
import ComingSoonModal from "./ComingSoonModal";

const GAMES = {
  all: [
    {
      id: "wingo",
      label: "Wingo",
      category: "Lottery",
      href: "/wingo/30s",
      className: "wingo",
      art: "🎱",
      featured: true,
    },
    {
      id: "aviator",
      label: "Aviator",
      category: "Crash",
      href: "/aviator",
      className: "aviator",
      art: "✈️",
    },
    {
      id: "cricket",
      label: "Cricket",
      category: "Sports",
      className: "cricket",
      art: "🏏",
      comingSoon: true,
      comingSoonNote: "Cricket mini-games are on the roadmap. Check back for live match-style betting.",
    },
    {
      id: "mines",
      label: "Mines",
      category: "Mini",
      href: "/mines",
      className: "mines",
      art: "💎",
      badge: "new",
    },
    { id: "wingo1m", label: "Wingo 1M", category: "Lottery", href: "/wingo/1m", className: "wingo", art: "⏱️", badge: "hot" },
    { id: "wingo3m", label: "Wingo 3M", category: "Lottery", href: "/wingo/3m", className: "wingo", art: "⏳" },
    { id: "wingo5m", label: "Wingo 5M", category: "Lottery", href: "/wingo/5m", className: "wingo", art: "🕐", badge: "new" },
  ],
  popular: [
    {
      id: "wingo",
      label: "Wingo",
      category: "Lottery",
      href: "/wingo/30s",
      className: "wingo",
      art: "🎱",
      featured: true,
    },
    {
      id: "aviator",
      label: "Aviator",
      category: "Crash",
      href: "/aviator",
      className: "aviator",
      art: "✈️",
    },
    {
      id: "cricket",
      label: "Cricket",
      category: "Sports",
      className: "cricket",
      art: "🏏",
      comingSoon: true,
      comingSoonNote: "Cricket mini-games are on the roadmap. Check back for live match-style betting.",
    },
    {
      id: "mines",
      label: "Mines",
      category: "Mini",
      href: "/mines",
      className: "mines",
      art: "💎",
      badge: "new",
    },
  ],
  lottery: [
    { id: "wingo1m", label: "Wingo 1M", category: "Lottery", href: "/wingo/1m", className: "wingo", art: "⏱️", badge: "hot" },
    { id: "wingo3m", label: "Wingo 3M", category: "Lottery", href: "/wingo/3m", className: "wingo", art: "⏳" },
    { id: "wingo5m", label: "Wingo 5M", category: "Lottery", href: "/wingo/5m", className: "wingo", art: "🕐", badge: "new" },
  ],
  mini: [
    { id: "wingo30", label: "Wingo 30S", category: "Fast", href: "/wingo/30s", className: "wingo", art: "⚡", featured: true },
    {
      id: "dice",
      label: "Dice",
      category: "Mini",
      className: "aviator",
      art: "🎲",
      href: "/dice",
    },
    {
      id: "mines",
      label: "Mines",
      category: "Mini",
      href: "/mines",
      className: "mines",
      art: "💎",
      badge: "new",
    },
  ],
  slots: [
    {
      id: "slots-soon",
      label: "Slots",
      category: "Coming soon",
      className: "aviator",
      art: "🎰",
      comingSoon: true,
      comingSoonNote: "Slot games are coming soon. Classic reels and jackpots will be added in a future update.",
    },
  ],
  live: [
    {
      id: "live-soon",
      label: "Live Casino",
      category: "Coming soon",
      className: "cricket",
      art: "🎩",
      comingSoon: true,
      comingSoonNote: "Live dealer tables are on the roadmap. Check back for roulette, blackjack, and more.",
    },
  ],
  sports: [
    {
      id: "cricket",
      label: "Cricket",
      category: "Sports",
      className: "cricket",
      art: "🏏",
      comingSoon: true,
      comingSoonNote: "Cricket mini-games are on the roadmap. Check back for live match-style betting.",
    },
  ],
};

const SECTION_TITLES = {
  all: "All Games",
  popular: "Popular Games",
  lottery: "Lottery Games",
  slots: "Slots",
  live: "Live Casino",
  sports: "Sports",
  mini: "Mini Games",
};

const ALL_LINKS = {
  all: "/wingo/30s",
  popular: "/wingo/30s",
  lottery: "/wingo/1m",
  slots: "/wingo/30s",
  live: "/wingo/30s",
  sports: "/wingo/30s",
  mini: "/mines",
};

const TILE_IMAGE_IDS = {
  wingo: "wingo",
  wingo1m: "wingo",
  wingo3m: "wingo",
  wingo5m: "wingo",
  wingo30: "wingo",
  aviator: "aviator",
  cricket: "cricket",
  mines: "mines",
};

function GameCardArt({ game }) {
  const tileId = TILE_IMAGE_IDS[game.id];
  const tile = tileId ? getGameTile(tileId) : null;

  if (tile?.image) {
    return (
      <Image
        src={tile.image}
        alt=""
        fill
        sizes="124px"
        className="club-popular-card-img"
      />
    );
  }

  return <div className="club-popular-card-art">{game.art}</div>;
}

function GameBadge({ game }) {
  if (game.comingSoon) {
    return <span className="club-game-badge soon">Soon</span>;
  }
  if (game.badge === "hot") {
    return <span className="club-game-badge hot">Hot</span>;
  }
  if (game.badge === "new") {
    return <span className="club-game-badge new">New</span>;
  }
  return null;
}

function PopularGameCard({ game, onComingSoon }) {
  const cardClass = [
    "club-popular-card",
    game.className,
    game.featured ? "featured" : "",
    game.comingSoon ? "coming-soon" : "",
  ]
    .filter(Boolean)
    .join(" ");

 const body = (
  <>
    <div className="club-popular-card-media">
      <GameBadge game={game} />
      <GameCardArt game={game} />
    </div>

    <div className="club-popular-card-info">
      <strong>{game.label}</strong>
      <span>{game.category}</span>
    </div>
  </>
);
  if (game.comingSoon) {
    return (
      <button type="button" className={cardClass} onClick={() => onComingSoon(game)}>
        {body}
      </button>
    );
  }

  return (
    <Link href={game.href} className={cardClass}>
      {body}
    </Link>
  );
}

export default function GameGrid({ category }) {
  const scrollRef = useRef(null);
  const [comingSoonGame, setComingSoonGame] = useState(null);
  const games = GAMES[category] || GAMES.all;
  const title = SECTION_TITLES[category] || SECTION_TITLES.all;
  const allHref = ALL_LINKS[category] || ALL_LINKS.all;

  const scrollNext = () => {
    scrollRef.current?.scrollBy({ left: 132, behavior: "smooth" });
  };

  return (
    <>
      <div className="club-section-header">
        <h2>{title}</h2>
        <Link href={allHref}>View All &gt;</Link>
      </div>

      <div className="club-popular-row">
        <div className="club-game-scroll" ref={scrollRef}>
          {games.map((game) => (
            <PopularGameCard key={game.id} game={game} onComingSoon={setComingSoonGame} />
          ))}
        </div>
        <button
          type="button"
          className="club-game-scroll-btn"
          aria-label="Scroll games"
          onClick={scrollNext}
        >
          &gt;
        </button>
      </div>

      <ComingSoonModal game={comingSoonGame} onClose={() => setComingSoonGame(null)} />
    </>
  );
}
