import Image from "next/image";
import Link from "next/link";
import Container from "@/components/ui/Container";
import { buttonClasses } from "@/components/ui/Button";
import { TRUST_LOGOS } from "./content";

export default function Hero() {
  return (
    <>
      <section className="pixora-hero-bloom relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-[#FAFAF8]" />
        <Container className="relative grid grid-cols-1 gap-12 pb-24 pt-16 md:grid-cols-12 md:gap-6 md:pt-24">
          <div
            className="order-2 md:order-none md:col-span-6"
          >
            <p className="mb-4 inline-flex rounded-full border border-[#ead7c5]/80 bg-white/72 px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#7a3f13] shadow-sm backdrop-blur">Pixdrive Platform</p>
            <h1
              className="font-display text-[48px] font-bold leading-[1.05] text-[#2a170d] sm:text-[58px] lg:text-[68px]"
            >
              <span className="inline-block">
                Your Photos.
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#7a3f13] via-[#b9783b] to-[#55756d] bg-clip-text text-transparent">Delivered Beautifully.</span>
            </h1>
            <p
              className="mt-6 max-w-[560px] text-[16px] leading-relaxed text-[#5f4a39]"
            >
              Build event experiences your clients remember. From proofing to delivery, every touchpoint feels clean,
              premium, and confidently branded.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/signup" className={buttonClasses({ variant: "primary", size: "lg" })}>
                Get Started
              </Link>
              <Link href="/login" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                Login & Explore
              </Link>
            </div>
          </div>

          <div
            className="relative order-1 md:order-none md:col-span-6"
          >
            <div className="absolute -left-4 -top-4 rounded-full border border-[#ead7c5] bg-white/90 px-4 py-2 text-[14px] font-medium text-[#7a3f13] shadow-sm backdrop-blur">
              Live Proofing
            </div>
            <div className="absolute -right-4 top-12 rounded-full border border-[#ead7c5] bg-white/90 px-4 py-2 text-[14px] font-medium text-[#7a3f13] shadow-sm backdrop-blur">
              4K Delivery
            </div>
            <div className="relative mx-auto w-full max-w-[520px] md:max-w-none">
              <div className="relative min-h-[340px] sm:min-h-[380px] md:min-h-[420px]">
                <div
                  className="absolute left-0 top-6 z-10 w-[58%] overflow-hidden rounded-lg bg-white shadow-[0_20px_50px_rgba(73,39,20,0.16)] ring-1 ring-black/[0.07]"
                >
                  <div className="relative aspect-[4/5] w-full">
                    <Image
                      src="/optimized/home-hero-portrait.webp"
                      alt="Portrait in client gallery"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 55vw, 220px"
                    />
                  </div>
                </div>

                <div
                  className="absolute right-0 top-0 z-20 w-[68%] overflow-hidden rounded-lg bg-white shadow-[0_28px_70px_rgba(73,39,20,0.18)] ring-1 ring-black/[0.08]"
                >
                  <div className="relative aspect-[16/11] w-full">
                    <Image
                      src="/optimized/home-hero-main.webp"
                      alt="Featured event photograph"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 70vw, 380px"
                      priority
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg bg-white/92 px-3 py-2 text-[11px] text-[#444] shadow-sm backdrop-blur-sm md:bottom-4 md:left-4 md:right-4 md:px-4 md:text-xs">
                    <span className="font-medium text-[#7a3f13]">Selections</span>
                    <span className="text-[#888]">Awaiting approval</span>
                  </div>
                </div>

                <div
                  className="absolute bottom-2 left-[12%] z-30 w-[48%] overflow-hidden rounded-lg bg-white shadow-[0_18px_45px_rgba(73,39,20,0.13)] ring-1 ring-black/[0.06]"
                >
                  <div className="relative aspect-[5/3] w-full">
                    <Image
                      src="/optimized/home-event-wide.webp"
                      alt="Wedding ceremony moment"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 240px"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="pixora-botanical-band overflow-hidden border-y border-[#ead7c5] py-10">
        <div className="mb-5 text-center text-[14px] font-medium uppercase tracking-[0.08em] text-[#666666]">Trusted by creators</div>
        <div className="animate-pixora-slide flex min-w-max gap-10 px-6 text-[22px] font-medium text-[#111111]">
          {[...TRUST_LOGOS, ...TRUST_LOGOS].map((logo, index) => (
            <span key={`${logo}-${index}`} className="whitespace-nowrap">
              {logo}
            </span>
          ))}
        </div>
      </section>
    </>
  );
}
