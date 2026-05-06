"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

type HeroSectionProps = {
  eyebrow: string;
  titleLineOne: string;
  titleLineTwo: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  primaryHref: string;
  secondaryHref: string;
  badgeLabel: string;
  theme?: "studio" | "drive";
};

const studioImages = [
  "/Img/pexels-1434506-11388577.webp",
  "/Img/pexels-hatice-baran-153179658-14783579.webp",
  "/Img/pexels-pixabay-258421.webp",
];

const driveImages = [
  "/Img/pexels-ian-panelo-3049394.webp",
  "/Img/pexels-habib-hosseini-2908569.webp",
  "/Img/pexels-soldiervip-1406766.webp",
];

export default function HeroSection({
  eyebrow,
  titleLineOne,
  titleLineTwo,
  description,
  primaryCta,
  secondaryCta,
  primaryHref,
  secondaryHref,
  badgeLabel,
  theme = "studio",
}: HeroSectionProps) {
  const isDrive = theme === "drive";
  const heroImages = isDrive ? driveImages : studioImages;

  return (
    <section
      className={`relative flex min-h-screen items-center overflow-hidden text-white ${
        isDrive
          ? "bg-[linear-gradient(145deg,#3a2112,#2a170d,#160c07)]"
          : "bg-[linear-gradient(145deg,#5b2b0c,#2a170d,#160c07)]"
      }`}
    >
      <div className="absolute inset-0">
        <div className={`absolute inset-0 ${isDrive ? "bg-[#04101b]/42" : "bg-black/35"}`} />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-12 pt-20 sm:px-8 md:grid-cols-2 md:gap-16">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mb-5 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/70"
          >
            {eyebrow}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          >
            <motion.span className="block" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.7 }}>
              {titleLineOne}
            </motion.span>
            <motion.span className="block" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.7 }}>
              {titleLineTwo}
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.28 }}
            className="mt-6 max-w-xl text-base text-white/70 sm:text-lg"
          >
            {description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link
                href={primaryHref}
                className={`inline-flex rounded-full px-8 py-3 text-sm font-semibold text-white shadow-lg sm:px-10 ${
                  isDrive ? "bg-[#2a85b8] shadow-[#2a85b8]/25" : "bg-[#d97757] shadow-[#d97757]/30"
                }`}
              >
                {primaryCta}
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link
                href={secondaryHref}
                className="inline-flex rounded-full border border-white/25 px-7 py-3 text-sm font-semibold text-white/80"
              >
                {secondaryCta}
              </Link>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative h-[420px] w-full sm:h-[480px] md:h-[520px]"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-4 top-2 h-48 w-56 overflow-hidden rounded-[24px] border border-white/15 bg-white/10 shadow-2xl sm:left-6 sm:h-56 sm:w-64 sm:rounded-[28px]"
          >
            <Image src={heroImages[0]} alt="Hero visual one" fill className="object-cover" sizes="(max-width: 768px) 50vw, 22vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent" />
          </motion.div>

          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            className="absolute right-0 top-16 h-60 w-60 overflow-hidden rounded-[28px] border border-white/20 bg-white/10 shadow-2xl sm:h-72 sm:w-72 sm:rounded-[34px]"
          >
            <Image src={heroImages[1]} alt="Hero visual two" fill className="object-cover" sizes="(max-width: 768px) 58vw, 26vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          </motion.div>

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            className="absolute bottom-0 left-6 h-52 w-72 overflow-hidden rounded-[22px] border border-white/15 bg-white/10 shadow-2xl sm:left-12 sm:h-64 sm:w-80 sm:rounded-[26px]"
          >
            <Image src={heroImages[2]} alt="Hero visual three" fill className="object-cover" sizes="(max-width: 768px) 70vw, 32vw" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-transparent" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="absolute -bottom-6 right-8 rounded-full border border-white/10 bg-white/10 px-5 py-3 text-xs uppercase tracking-[0.3em] text-white/70 backdrop-blur"
          >
            {badgeLabel}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
