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
            className="md:col-span-6"
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

          <motion.div className="relative md:col-span-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}>
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
            <div className="rounded-[20px] border border-[#E5E5E5] bg-white p-6 shadow-[0_22px_60px_rgba(17,17,17,0.1)]">
              <div className="mb-5 h-8 w-44 rounded-lg bg-[#f4f4f2]" />
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-7 space-y-4">
                  <div className="relative h-32 overflow-hidden rounded-xl">
                    <Image src="/Img/pexels-ian-panelo-3049394.webp" alt="Wedding event cover" fill className="object-cover" />
                  </div>
                  <div className="h-10 rounded-lg bg-[#f4f4f2]" />
                  <div className="h-10 rounded-lg bg-[#f4f4f2]" />
                </div>
                <div className="col-span-5 space-y-4">
                  <div className="relative h-20 overflow-hidden rounded-xl">
                    <Image src="/Img/pexels-carlos-oratto-1115158-2111255.webp" alt="Portrait preview" fill className="object-cover" />
                  </div>
                  <div className="h-20 rounded-xl bg-[#eef6f5]" />
                  <div className="h-20 rounded-xl bg-[#f4f4f2]" />
                </div>
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
