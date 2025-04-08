
import React, { useEffect, useRef } from "react";
import HeroSection from "../components/landing/HeroSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import AIFeaturesSection from "../components/landing/AIFeaturesSection";
import HiringProcessSection from "../components/landing/HiringProcessSection";
import DemoSection from "../components/landing/DemoSection";
import BusinessImpactSection from "../components/landing/BusinessImpactSection";
import TestimonialsSection from "../components/landing/TestimonialsSection";
import CtaSection from "../components/landing/CtaSection";
import StylesSection from "../components/landing/StylesSection";

const Index = () => {
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);

  // Animation on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    sectionsRef.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => {
      sectionsRef.current.forEach((section) => {
        if (section) observer.unobserve(section);
      });
    };
  }, []);

  const addToRefs = (el: HTMLElement | null, index: number) => {
    if (el && !sectionsRef.current.includes(el)) {
      sectionsRef.current[index] = el;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <FeaturesSection addToRefs={addToRefs} />
      <AIFeaturesSection addToRefs={addToRefs} />
      <HiringProcessSection addToRefs={addToRefs} />
      <DemoSection addToRefs={addToRefs} />
      <BusinessImpactSection addToRefs={addToRefs} />
      <TestimonialsSection addToRefs={addToRefs} />
      <CtaSection addToRefs={addToRefs} />
      <StylesSection />
    </div>
  );
};

export default Index;
