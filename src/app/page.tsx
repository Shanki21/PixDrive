"use client";

import { useMemo, useState } from "react";
import Navbar, { HomeTab } from "@/components/home/Navbar";
import HeroSection from "@/components/home/HeroSection";
import FeatureSplitSection from "@/components/home/FeatureSplitSection";
import ShowcaseGrid from "@/components/home/ShowcaseGrid";
import PricingSection from "@/components/home/PricingSection";
import CloudDriveSection from "@/components/home/CloudDriveSection";
import Footer from "@/components/home/Footer";

type DriveSection = {
  index: string;
  title: string;
  description: string;
  image: string;
  dark?: boolean;
};

const DRIVE_TAB_SECTIONS: DriveSection[] = [
  {
    index: "01.",
    title: "View and download with ease",
    description:
      "Your work looks clean on every device. Clients can instantly download full projects or favorites.",
    image: "",
  },
  {
    index: "02.",
    dark: true,
    title: "Selecting the photos",
    description:
      "Clients mark favorites in one click so you know exactly which images to retouch and deliver first.",
    image: "",
  },
  {
    index: "03.",
    title: "Share your projects beautifully",
    description:
      "Send one elegant drive link, collect feedback, and keep your presentation premium for every client.",
    image: "",
  },
];

function SiteDriveContent() {
  return (
    <>
      <HeroSection />
      <FeatureSplitSection
        index="01."
        title="Easy website creation"
        description="Pre-made templates ready for you to add your personal touch."
        image=""
      />

      <FeatureSplitSection
        index="02."
        dark
        title="Specifically designed for photographers"
        description="Our interface and tools streamline your daily work."
        image=""
      />

      <FeatureSplitSection
        index="03."
        title="Get noticed and grow your business"
        description="Share galleries and boost your online sales."
        image=""
      />

      <ShowcaseGrid />
      <PricingSection />
      <CloudDriveSection />
    </>
  );
}

function DriveOnlyContent() {
  return (
    <>
      <HeroSection />
      {DRIVE_TAB_SECTIONS.map((section) => (
        <FeatureSplitSection
          key={section.index}
          index={section.index}
          dark={section.dark}
          title={section.title}
          description={section.description}
          image={section.image}
        />
      ))}
      <CloudDriveSection />
      <PricingSection />
    </>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<HomeTab>("site-drive");

  const content = useMemo(() => {
    if (activeTab === "drive") return <DriveOnlyContent />;
    return <SiteDriveContent />;
  }, [activeTab]);

  return (
    <>
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      {content}
      <Footer />
    </>
  );
}
