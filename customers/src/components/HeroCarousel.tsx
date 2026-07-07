"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  TrendingUp,
  Tag,
  ArrowRight,
} from "lucide-react";
import { LandingPageData } from "@/lib/landingPageService";
import Link from "next/link";
import { heroImage } from "@/assets";

interface CarouselItem {
  id: string;
  type: "hero" | "category" | "brand" | "discount";
  title: string;
  subtitle?: string;
  image: string;
  discount?: number;
  productCount?: number;
  isTopSelling?: boolean;
  link: string;
}

interface HeroCarouselProps {
  landingData: LandingPageData;
}

const HeroCarousel = ({ landingData }: HeroCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);

  useEffect(() => {
    const items: CarouselItem[] = [];

    items.push({
      id: "hero-main",
      type: "hero",
      title: "Everything You Need, All in One Marketplace",
      subtitle:
        "Explore trusted stores, quality products, and fast delivery across every category.",
      image: heroImage,
      link: "/shop",
    });

    const featuredCategories = landingData.featuredCategories || [];
    featuredCategories
      .filter((cat) => cat.productCount > 0)
      .slice(0, 4)
      .forEach((category) => {
        items.push({
          id: `category-${category.id}`,
          type: "category",
          title: category.name,
          subtitle: `${category.productCount} products`,
          image: category.image,
          productCount: category.productCount,
          link: `/shop?categories=${encodeURIComponent(category.slug || category.name)}`,
        });
      });

    const featuredBrands = landingData.featuredBrands || [];
    featuredBrands
      .filter((brand) => brand.productCount > 0)
      .slice(0, 3)
      .forEach((brand) => {
        items.push({
          id: `brand-${brand.id}`,
          type: "brand",
          title: brand.name,
          subtitle: `${brand.productCount} products`,
          image: brand.image,
          productCount: brand.productCount,
          isTopSelling: true,
          link: `/shop?brands=${encodeURIComponent(brand.slug || brand.name)}`,
        });
      });

    setCarouselItems(items);
  }, [landingData]);

  useEffect(() => {
    if (carouselItems.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) =>
          prevIndex === carouselItems.length - 1 ? 0 : prevIndex + 1,
        );
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [carouselItems.length]);

  const goToPrevious = () => {
    setCurrentIndex(
      currentIndex === 0 ? carouselItems.length - 1 : currentIndex - 1,
    );
  };

  const goToNext = () => {
    setCurrentIndex(
      currentIndex === carouselItems.length - 1 ? 0 : currentIndex + 1,
    );
  };

  const renderSlideContent = (item: CarouselItem) => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {item.type === "hero" && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
              <Star className="h-4 w-4 text-amber-300" />
              Trusted marketplace
            </div>
          )}
          {item.type === "brand" && item.isTopSelling && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
              <TrendingUp className="h-4 w-4 text-amber-300" />
              Top selling brand
            </div>
          )}
          {item.type === "discount" && item.discount && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-3 py-1 text-sm font-medium text-white">
              <Tag className="h-4 w-4" />
              {item.discount}% off
            </div>
          )}
          {item.type === "category" && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
              <Star className="h-4 w-4 text-amber-300" />
              Popular category
            </div>
          )}
        </div>

        <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
          {item.title}
        </h1>

        <p className="max-w-xl text-lg text-white/85 md:text-xl">
          {item.subtitle}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={item.link || "/shop"}>
          <Button
            size="lg"
            className="h-12 bg-white px-8 text-base font-semibold text-slate-900 hover:bg-white/90"
          >
            {item.type === "hero" ? "Start shopping" : "Explore now"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
        <Link href="/shop">
          <Button
            size="lg"
            variant="outline"
            className="h-12 border-white/70 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
          >
            {item.type === "hero" ? "Browse all products" : "Shop all"}
          </Button>
        </Link>
      </div>
    </div>
  );

  if (carouselItems.length === 0) {
    return (
      <section className="relative h-[520px] overflow-hidden md:h-[600px]">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/20" />
        <div className="relative container mx-auto flex h-full items-center px-4 py-16">
          {renderSlideContent({
            id: "hero-fallback",
            type: "hero",
            title: "Everything You Need, All in One Marketplace",
            subtitle:
              "Explore trusted stores, quality products, and fast delivery across every category.",
            image: heroImage,
            link: "/shop",
          })}
        </div>
      </section>
    );
  }

  const currentItem = carouselItems[currentIndex];
  const slideImage =
    currentItem?.type === "hero" ? heroImage : currentItem?.image || heroImage;

  return (
    <section className="relative h-[520px] overflow-hidden md:h-[600px]">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
        style={{ backgroundImage: `url(${slideImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/20" />

      <div className="relative container mx-auto flex h-full items-center px-4 py-16">
        {renderSlideContent(currentItem)}
      </div>

      {carouselItems.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
            {carouselItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all duration-200 ${
                  index === currentIndex
                    ? "w-8 bg-white"
                    : "w-2 bg-white/45 hover:bg-white/70"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default HeroCarousel;
