import Navbar from "@/components/home/Navbar";
import HeroSection from "@/components/home/HeroSection";
import FeatureSplitSection from "@/components/home/FeatureSplitSection";
import ShowcaseGrid from "@/components/home/ShowcaseGrid";
import PricingSection from "@/components/home/PricingSection";
import CloudDriveSection from "@/components/home/CloudDriveSection";
import Footer from "@/components/home/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <HeroSection />

      <FeatureSplitSection
        index="01."
        title="Easy website creation"
        description="Pre-made templates ready for you to add your personal touch."
        image="https://images.unsplash.com/photo-1519741497674-611481863552"
      />

      <FeatureSplitSection
        index="02."
        dark
        title="Specifically designed for photographers"
        description="Our interface and tools streamline your daily work."
        image="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee"
      />

      <FeatureSplitSection
        index="03."
        title="Get noticed and grow your business"
        description="Share galleries and boost your online sales."
        image="https://images.unsplash.com/photo-1522202176988-66273c2fd55f"
      />

      <ShowcaseGrid />
      <PricingSection />
      <CloudDriveSection />
      <Footer />
    </>
  );
}