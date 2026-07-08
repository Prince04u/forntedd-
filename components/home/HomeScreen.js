"use client";

import { useState } from "react";
import AppHeader from "./AppHeader";
import PromoBanner from "./PromoBanner";
import AnnouncementBar from "./AnnouncementBar";
import CategoryTabs from "./CategoryTabs";
import GameGrid from "./GameGrid";
import PromoSection from "./PromoSection";
import TermsSection from "./TermsSection"; // NEW
import BottomNav from "./BottomNav";

export default function HomeScreen() {
  const [category, setCategory] = useState("all");

  return (
    <main className="club-app">
      <AppHeader />

      <PromoBanner />

      <AnnouncementBar />

      <CategoryTabs
        active={category}
        onChange={setCategory}
      />

      <GameGrid category={category} />

      <PromoSection />

      {/* Terms & Conditions Section */}
      <TermsSection />

      <BottomNav />
    </main>
  );
}