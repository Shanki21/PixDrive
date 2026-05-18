import Hero from "@/components/marketing/Hero";
import Features from "@/components/marketing/Features";
import Workflow from "@/components/marketing/Workflow";
import Gallery from "@/components/marketing/Gallery";
import Pricing from "@/components/marketing/Pricing";
import CTA from "@/components/marketing/CTA";
import HomeNavbar from "@/components/marketing/HomeNavbar";
import HomeFooter from "@/components/marketing/HomeFooter";

export default function Home() {
  return (
    <div className="pixora-marketing-shell w-full overflow-x-hidden">
      <HomeNavbar />
      <main className="relative w-full overflow-x-hidden">
        <Hero />
        <Features />
        <Workflow />
        <Gallery />
        <Pricing />
        <CTA />
      </main>
      <HomeFooter />
    </div>
  );
}
