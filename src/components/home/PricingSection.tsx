"use client";

import { motion } from "framer-motion";

type PricingSectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  theme?: "studio" | "drive";
};

export default function PricingSection({ eyebrow, title, description, theme = "studio" }: PricingSectionProps) {
  const isDrive = theme === "drive";

  return (
    <section className={`relative overflow-hidden py-28 ${isDrive ? "bg-[#eaf4f8]" : "bg-[#f6f1ea]"}`}>
      <div
        className={`absolute -left-28 top-0 h-72 w-72 rounded-full blur-3xl ${
          isDrive ? "bg-[#71b4d4]/20" : "bg-[#5b7b8a]/15"
        }`}
      />
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 34 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className={`rounded-[34px] border p-10 shadow-2xl md:p-14 ${
            isDrive ? "border-[#c7dce6] bg-white" : "border-[#e3d8cc] bg-white"
          }`}
        >
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05, duration: 0.45 }}
            className={`text-xs uppercase tracking-[0.35em] ${isDrive ? "text-[#5a7d8f]" : "text-[#8a7f73]"}`}
          >
            {eyebrow}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12, duration: 0.55 }}
            className={`font-display mt-4 text-4xl font-semibold leading-tight md:text-5xl ${
              isDrive ? "text-[#112432]" : "text-[#1a1a1f]"
            }`}
          >
            {title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.18, duration: 0.55 }}
            className={`mt-4 text-base ${isDrive ? "text-[#4e6775]" : "text-[#6b645c]"}`}
          >
            {description}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.24, duration: 0.55 }}
            className="mt-8 flex flex-wrap items-end gap-4"
          >
            <div className={`text-4xl font-semibold ${isDrive ? "text-[#112432]" : "text-[#1a1a1f]"}`}>$32.49</div>
            <div className={`text-sm ${isDrive ? "text-[#5a7d8f]" : "text-[#8a7f73]"}`}>
              / year <span className="ml-2 line-through">$49.99</span>
            </div>
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/85 ${
                isDrive ? "bg-[#1f6f9d]" : "bg-[#101114]"
              }`}
            >
              35% off
            </motion.div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.55 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`rounded-full px-8 py-3 text-sm font-semibold text-white ${
                isDrive ? "bg-[#1f6f9d]" : "bg-[#101114]"
              }`}
            >
              Try for free
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`rounded-full border px-7 py-3 text-sm font-semibold ${
                isDrive ? "border-[#b7d3e0] text-[#335262]" : "border-[#cbbeb0] text-[#4a433d]"
              }`}
            >
              View details
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
