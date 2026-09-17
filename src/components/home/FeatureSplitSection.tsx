"use client";

import Image from "next/image";
import { motion } from "framer-motion";

type FeatureSplitSectionProps = {
  index: string;
  title: string;
  description: string;
  image: string;
  dark?: boolean;
  theme?: "studio" | "drive";
};

export default function FeatureSplitSection({
  index,
  title,
  description,
  image,
  dark = false,
  theme = "studio",
}: FeatureSplitSectionProps) {
  const isDrive = theme === "drive";
  const lightSectionClass = isDrive ? "bg-[#eef5f8] text-[#13202a]" : "bg-[#f7f3ee] text-[#17171b]";
  const darkSectionClass = isDrive ? "bg-[#0e1c26] text-white" : "bg-[#121216] text-white";

  const imageBlock = (
    <motion.div
      initial={{ opacity: 0, x: dark ? 48 : -48 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <div
        className={`absolute ${dark ? "-right-6" : "-left-6"} -top-6 h-full w-full rounded-[28px] ${
          dark ? "border border-white/10" : isDrive ? "border border-[#c7dce6]" : "border border-[#d8cfc4]"
        }`}
      />
      <div className="relative aspect-[4/3] overflow-hidden rounded-[26px] shadow-xl">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition duration-700 hover:scale-[1.04]"
          sizes="(max-width: 768px) 100vw, 42vw"
        />
        <div
          className={`absolute inset-0 ${
            dark
              ? "bg-gradient-to-t from-black/45 via-black/10 to-transparent"
              : isDrive
                ? "bg-gradient-to-t from-[#0d3040]/18 via-transparent to-transparent"
                : "bg-gradient-to-t from-[#191919]/20 via-transparent to-transparent"
          }`}
        />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ delay: 0.15, duration: 0.55 }}
        className={`absolute bottom-4 ${dark ? "left-4" : "right-4"} rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] ${
          dark ? "bg-black/45 text-white backdrop-blur" : isDrive ? "bg-white/90 text-[#0f3040]" : "bg-white/85 text-[#17171b]"
        }`}
      >
        Pixdrive flow
      </motion.div>
    </motion.div>
  );

  return (
    <section className={`${dark ? darkSectionClass : lightSectionClass} py-28 md:py-32`}>
      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        <div className="absolute -top-16 right-10 hidden h-40 w-40 rounded-full border border-current/10 md:block" />
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          {!dark && imageBlock}

          <motion.div
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05, duration: 0.45 }}
              className={`mb-4 text-xs uppercase tracking-[0.4em] ${
                dark ? "text-white/50" : isDrive ? "text-[#557080]" : "text-[#6f6a63]"
              }`}
            >
              {index}
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.12, duration: 0.55 }}
              className="font-display text-4xl font-semibold leading-tight md:text-5xl"
            >
              {title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.55 }}
              className={`mt-5 max-w-xl text-base leading-relaxed ${
                dark ? "text-white/60" : isDrive ? "text-[#49606e]" : "text-[#5f5b55]"
              }`}
            >
              {description}
            </motion.p>
            <motion.a
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.28, duration: 0.5 }}
              className="mt-7 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em]"
            >
              Try for free <span aria-hidden="true">&rarr;</span>
            </motion.a>
          </motion.div>

          {dark && imageBlock}
        </div>
      </div>
    </section>
  );
}
