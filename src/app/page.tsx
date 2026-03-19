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
    title: "Fast proofing for busy client work",
    description:
      "Present full galleries in a clean private space where clients can browse, shortlist, and download without confusion.",
    image: "/Img/pexels-ian-panelo-3049394.webp",
  },
  {
    index: "02.",
    dark: true,
    title: "Selections you can act on instantly",
    description:
      "Favorites, approvals, and client picks stay organized so you know what to retouch, export, and deliver next.",
    image: "/Img/pexels-habib-hosseini-2908569.webp",
  },
  {
    index: "03.",
    title: "One polished link for every delivery",
    description:
      "Replace messy file threads with a premium client drive that keeps previews, downloads, and communication in one flow.",
    image: "/Img/pexels-soldiervip-1406766.webp",
  },
];

function SiteDriveContent() {
  return (
    <>
      <HeroSection
        eyebrow="Studio-ready • Client-first"
        titleLineOne="Build a portfolio"
        titleLineTwo="that feels bespoke"
        description="Launch a polished website and client gallery system together so your brand, inquiries, and delivery experience all feel intentionally designed."
        primaryCta="Start your studio"
        secondaryCta="View live demo"
        primaryHref="/signup"
        secondaryHref="/login"
        badgeLabel="Curated stories"
        theme="studio"
      />
      <FeatureSplitSection
        index="01."
        title="Launch your website and client space together"
        description="Create a branded home for your work, publish signature projects, and give every inquiry a premium first impression."
        image="/Img/pexels-pham-hoang-kha-1582786-3785644.webp"
        theme="studio"
      />

      <FeatureSplitSection
        index="02."
        dark
        title="Built for photographers, not generic creators"
        description="Portfolio pages, client galleries, and proofing tools live in one workflow so you can spend less time stitching tools together."
        image="/Img/pexels-apasaric-2464535.webp"
        theme="studio"
      />

      <FeatureSplitSection
        index="03."
        title="Turn presentation into bookings"
        description="Show your style, share recent work, and move clients from discovery to delivery without losing the premium feel of your brand."
        image="/Img/pexels-carlos-oratto-1115158-2111255.webp"
        theme="studio"
      />

      <ShowcaseGrid theme="studio" />
      <PricingSection
        eyebrow="Launch offer"
        title="One plan for website, galleries, and delivery"
        description="Everything you need to publish your brand, impress new leads, and deliver client work from the same studio system."
        theme="studio"
      />
      <CloudDriveSection
        eyebrow="Studio workflow"
        title="Run your public brand and private client flow in one place"
        description="From portfolio discovery to final download, every touchpoint stays cohesive, organized, and on-brand."
        items={[
          { title: "Website", text: "Publish your style, offers, and portfolio with a premium presentation." },
          { title: "Client galleries", text: "Share private projects with proofing and download tools built in." },
          { title: "Consistent branding", text: "Keep the same visual language from homepage to final delivery." },
          { title: "Less busywork", text: "Stop bouncing between site builders, proofing tools, and file links." },
        ]}
        theme="studio"
      />
    </>
  );
}

function DriveOnlyContent() {
  return (
    <>
      <HeroSection
        eyebrow="Delivery-ready • Proofing-first"
        titleLineOne="Deliver client galleries"
        titleLineTwo="without the chaos"
        description="Give clients a dedicated photo drive for previewing, favoriting, and downloading so your delivery process feels smooth, premium, and easy to manage."
        primaryCta="Start with drive"
        secondaryCta="See delivery flow"
        primaryHref="/signup"
        secondaryHref="/login"
        badgeLabel="Private proofing"
        theme="drive"
      />
      {DRIVE_TAB_SECTIONS.map((section) => (
        <FeatureSplitSection
          key={section.index}
          index={section.index}
          dark={section.dark}
          title={section.title}
          description={section.description}
          image={section.image}
          theme="drive"
        />
      ))}
      <ShowcaseGrid theme="drive" />
      <CloudDriveSection
        eyebrow="Client delivery"
        title="A drive built for previews, favorites, and final files"
        description="Keep every gallery tidy and actionable so clients always know where to click and you always know what to deliver next."
        items={[
          { title: "Private links", text: "Share galleries securely with a single clean client link." },
          { title: "Fast downloads", text: "Let clients grab full galleries or selected favorites with ease." },
          { title: "Selection tracking", text: "Capture favorites and approvals without chasing screenshots." },
          { title: "Premium delivery", text: "Turn a basic file handoff into a polished client experience." },
        ]}
        theme="drive"
      />
      <PricingSection
        eyebrow="Drive plan"
        title="A simpler way to proof and deliver"
        description="Use Pixora Drive as your dedicated client-delivery layer when your biggest need is clean proofing, fast downloads, and polished handoff."
        theme="drive"
      />
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
