"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import Container from "@/components/ui/Container";
import { buttonClasses } from "@/components/ui/Button";
import { TRUST_LOGOS, fadeUp } from "./content";

export default function Hero() {
  return (
    <>
      <section className="relative">
        <div className="pointer-events-none absolute left-[-120px] top-[40px] h-[360px] w-[360px] rounded-full bg-[#9bd6c3]/35 blur-3xl" />
        <div className="pointer-events-none absolute right-[-140px] top-[140px] h-[340px] w-[340px] rounded-full bg-[#9cc9ff]/30 blur-3xl" />
        <Container className="relative grid grid-cols-1 gap-12 pb-24 pt-16 md:grid-cols-12 md:gap-6 md:pt-24">
          <motion.div
            className="order-2 md:order-none md:col-span-6"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <p className="mb-4 text-[14px] font-medium uppercase tracking-[0.12em] text-[#0f766e]">Pixora Platform</p>
            <motion.h1
              className="text-[48px] font-bold leading-[1.05] tracking-[-0.03em] text-[#111111]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <motion.span className="inline-block" animate={{ y: [0, -4, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                Your Photos.
              </motion.span>
              <br />
              <span className="bg-gradient-to-r from-[#0f766e] to-[#2563eb] bg-clip-text text-transparent">Delivered Beautifully.</span>
            </motion.h1>
            <motion.p
              className="mt-6 max-w-[520px] text-[16px] leading-relaxed text-[#666666]"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              Build event experiences your clients remember. From proofing to delivery, every touchpoint feels clean,
              premium, and confidently branded.
            </motion.p>
            <motion.div className="mt-8 flex flex-wrap gap-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}>
              <Link href="/signup" className={buttonClasses({ variant: "primary", size: "lg" })}>
                Get Started
              </Link>
              <Link href="/login" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                Login & Explore
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="relative order-1 md:order-none md:col-span-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <motion.div
              className="absolute -left-4 -top-4 rounded-full border border-[#d2e9e2] bg-white px-4 py-2 text-[14px] font-medium text-[#0f766e] shadow-sm"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              Live Proofing
            </motion.div>
            <motion.div
              className="absolute -right-4 top-12 rounded-full border border-[#d2e9e2] bg-white px-4 py-2 text-[14px] font-medium text-[#0f766e] shadow-sm"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            >
              4K Delivery
            </motion.div>
            <div className="relative mx-auto w-full max-w-[520px] md:max-w-none">
              <div className="pointer-events-none absolute inset-0 -z-10 scale-105 rounded-[32px] bg-gradient-to-br from-[#0f766e]/12 via-transparent to-[#2563eb]/10 blur-2xl" />

              <div className="relative min-h-[340px] sm:min-h-[380px] md:min-h-[420px]">
                <motion.div
                  className="absolute left-0 top-6 z-10 w-[58%] overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.07]"
                  initial={{ opacity: 0, x: -24, rotate: -6 }}
                  animate={{ opacity: 1, x: 0, rotate: -5 }}
                  transition={{ duration: 0.65, delay: 0.2, type: "spring", stiffness: 120 }}
                  whileHover={{ rotate: -3, y: -4 }}
                >
                  <div className="relative aspect-[4/5] w-full">
                    <Image
                      src="/Img/pexels-carlos-oratto-1115158-2111255.webp"
                      alt="Portrait in client gallery"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 55vw, 220px"
                    />
                  </div>
                </motion.div>

                <motion.div
                  className="absolute right-0 top-0 z-20 w-[68%] overflow-hidden rounded-2xl bg-white shadow-[0_28px_70px_rgba(0,0,0,0.16)] ring-1 ring-black/[0.08]"
                  initial={{ opacity: 0, y: 28, rotate: 4 }}
                  animate={{ opacity: 1, y: 0, rotate: 3 }}
                  transition={{ duration: 0.65, delay: 0.08, type: "spring", stiffness: 115 }}
                  whileHover={{ rotate: 1, y: -6 }}
                >
                  <div className="relative aspect-[16/11] w-full">
                    <Image
                      src="/Img/pexels-apasaric-2464535.webp"
                      alt="Featured event photograph"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 70vw, 380px"
                      priority
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg bg-white/92 px-3 py-2 text-[11px] text-[#444] shadow-sm backdrop-blur-sm md:bottom-4 md:left-4 md:right-4 md:px-4 md:text-xs">
                    <span className="font-medium text-[#0f766e]">Selections</span>
                    <span className="text-[#888]">Awaiting approval</span>
                  </div>
                </motion.div>

                <motion.div
                  className="absolute bottom-2 left-[12%] z-30 w-[48%] overflow-hidden rounded-2xl bg-white shadow-[0_18px_45px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.06]"
                  initial={{ opacity: 0, y: 40, rotate: -2 }}
                  animate={{ opacity: 1, y: 0, rotate: -2 }}
                  transition={{ duration: 0.65, delay: 0.32, type: "spring", stiffness: 125 }}
                  whileHover={{ y: -5, rotate: 0 }}
                >
                  <div className="relative aspect-[5/3] w-full">
                    <Image
                      src="/Img/pexels-ian-panelo-3049394.webp"
                      alt="Wedding ceremony moment"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 240px"
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </Container>
      </section>

      <section className="overflow-hidden border-y border-[#E5E5E5] bg-white/70 py-10">
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
