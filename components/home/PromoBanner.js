"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DESIGN_ASSETS, getCarouselBanner } from "@/lib/designAssets";
import { getPromoBanners } from "@/lib/platformApi";

const DEFAULT_SLIDES = DESIGN_ASSETS.carouselBanners.map(
  ({ id, badge, amount, title, emoji, link }) => ({
    id,
    badge,
    amount,
    title,
    emoji,
    link,
  })
);

const resolveSlideImage = (slide, index) => {
  if (slide?.image) {
    return slide.image;
  }
  if (slide?.id) {
    const asset = getCarouselBanner(slide.id);
    if (asset?.image) return asset.image;
  }
  return DESIGN_ASSETS.carouselBanners[index]?.image || null;
};

export default function PromoBanner() {
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [active, setActive] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getPromoBanners()
      .then((res) => {
        if (cancelled) return;
        const carousel = res?.data?.carousel;
        if (Array.isArray(carousel) && carousel.length) {
          setSlides(carousel);
          setActive(0);
        }
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (clientWidth > 0) {
      const index = Math.round(scrollLeft / clientWidth);
      setActive(index);
    }
  };

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = setInterval(() => {
      if (!scrollRef.current) return;
      const nextActive = (active + 1) % slides.length;
      const clientWidth = scrollRef.current.clientWidth;
      
      scrollRef.current.scrollTo({
        left: nextActive * clientWidth,
        behavior: "smooth",
      });
      setActive(nextActive);
    }, 4500);

    return () => clearInterval(timer);
  }, [slides.length, active]);

  if (!slides.length) return null;

  return (
    <div className="club-banner-wrap-scroller">
      <div
        className="club-banner-scroll-container"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {slides.map((slide, index) => {
          const imageSrc = resolveSlideImage(slide, index);
          const bannerContent = imageSrc ? (
            <div className="club-banner-slide-inner">
              <Image
                src={imageSrc}
                alt={slide.title || "Promotion"}
                fill
                sizes="(max-width: 480px) 100%, 480px"
                className="club-banner-img"
                priority={index === 0}
              />
            </div>
          ) : (
            <div className="club-banner-slide-inner no-img">
              <div className="club-banner-content">
                <span className="club-banner-badge">{slide.badge}</span>
                <div className="club-banner-amount">{slide.amount}</div>
                <div className="club-banner-title">{slide.title}</div>
              </div>
              <div className="club-banner-coins">{slide.emoji}</div>
            </div>
          );

          return (
            <div key={slide.id || index} className="club-banner-slide-item">
              {slide.link ? (
                <Link href={slide.link} className="club-banner-slide-link">
                  {bannerContent}
                </Link>
              ) : (
                bannerContent
              )}
            </div>
          );
        })}
      </div>

      {slides.length > 1 && (
        <div className="club-banner-dots">
          {slides.map((_, i) => (
            <span
              key={i}
              className={i === active ? "active" : ""}
              onClick={() => {
                if (!scrollRef.current) return;
                const clientWidth = scrollRef.current.clientWidth;
                scrollRef.current.scrollTo({
                  left: i * clientWidth,
                  behavior: "smooth",
                });
                setActive(i);
              }}
              style={{ cursor: "pointer" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
