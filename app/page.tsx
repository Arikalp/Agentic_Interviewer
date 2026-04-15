"use client";

import { useUser } from "@clerk/nextjs";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import DemoSection from "@/components/landing/DemoSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import InsightsSection from "@/components/landing/InsightsSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import UserPerformanceInsights from "@/components/landing/UserPerformanceInsights";

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();

  return (
    <div className="min-h-screen bg-[#0a0a0a] overflow-x-hidden w-full">
      <Navbar />
      <main className="overflow-x-hidden w-full">
        {isLoaded && isSignedIn ? (
          <>
            <UserPerformanceInsights />
          </>
        ) : (
          <>
            <HeroSection />
            <FeaturesSection />
            <DemoSection />
            <HowItWorksSection />
            <InsightsSection />
            <CTASection />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
