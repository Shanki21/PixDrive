"use client";

import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section
      className="relative flex min-h-screen items-center overflow-hidden text-white
      bg-[radial-gradient(circle_at_top,#1c1a20,#0f0d12,#0b0a0d)]"
    >
      <div className="absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#d97757]/30 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-[#5b7b8a]/25 blur-3xl" />
        <div className="absolute inset-0 bg-black/35" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pt-20 pb-12 sm:px-8 md:grid-cols-2 md:gap-16">
        {/* LEFT */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="mb-5 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/70">
            Studio-ready
            <span className="h-1 w-1 rounded-full bg-white/50" />
            Client-first
          </p>

          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Build a portfolio
            <br />
            that feels bespoke
          </h1>

          <p className="mt-6 text-base text-white/70 sm:text-lg">
            Curate galleries, deliver files, and make every client touchpoint feel premium.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              className="rounded-full bg-[#d97757] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[#d97757]/30 sm:px-10"
            >
              Start your studio
            </motion.button>
            <button className="rounded-full border border-white/25 px-7 py-3 text-sm font-semibold text-white/80">
              View live demo
            </button>
          </div>
        </motion.div>

        {/* RIGHT COLLAGE */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative h-[420px] w-full sm:h-[480px] md:h-[520px]"
        >
          <div className="absolute left-4 top-2 h-48 w-56 overflow-hidden rounded-[24px] border border-white/15 bg-white/10 shadow-2xl sm:left-6 sm:h-56 sm:w-64 sm:rounded-[28px]">
            <div className="h-full w-full bg-[linear-gradient(135deg,#e8d6c1,#879aa7)]" />
          </div>
          <div className="absolute right-0 top-16 h-60 w-60 overflow-hidden rounded-[28px] border border-white/20 bg-white/10 shadow-2xl sm:h-72 sm:w-72 sm:rounded-[34px]">
            <div className="h-full w-full bg-[linear-gradient(135deg,#d2b49b,#5f7483)]" />
          </div>
          <div className="absolute bottom-0 left-6 h-52 w-72 overflow-hidden rounded-[22px] border border-white/15 bg-white/10 shadow-2xl sm:left-12 sm:h-64 sm:w-80 sm:rounded-[26px]">
            <div className="h-full w-full bg-[linear-gradient(135deg,#f2e8db,#b07856)]" />
          </div>
          <div className="absolute -bottom-6 right-8 rounded-full bg-white/10 px-5 py-3 text-xs uppercase tracking-[0.3em] text-white/70 backdrop-blur">
            Curated stories
          </div>
        </motion.div>

      </div>
    </section>
  );
}
