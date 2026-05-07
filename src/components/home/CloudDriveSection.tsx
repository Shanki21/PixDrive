"use client";

import { motion } from "framer-motion";

type FeatureItemProps = {
  title: string;
  text: string;
};

type CloudDriveSectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: FeatureItemProps[];
  theme?: "studio" | "drive";
};

function Item({ title, text }: FeatureItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
      }}
    >
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-gray-400">{text}</p>
    </motion.div>
  );
}

export default function CloudDriveSection({
  eyebrow,
  title,
  description,
  items,
  theme = "studio",
}: CloudDriveSectionProps) {
  const isDrive = theme === "drive";

  return (
    <section className={`relative overflow-hidden py-28 text-white ${isDrive ? "bg-[#0c1a24]" : "bg-[#15151a]"}`}>
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">{eyebrow}</p>
            <h2 className="font-display mt-4 text-4xl font-semibold md:text-5xl">{title}</h2>
            <p className="mt-5 text-base text-white/65">{description}</p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1 } },
            }}
            className={`rounded-[26px] border p-8 shadow-2xl ${
              isDrive ? "border-[#2b4657] bg-[#122634]" : "border-white/10 bg-white/5"
            }`}
          >
            <div className="grid gap-6 md:grid-cols-2">
              {items.map((item) => (
                <Item key={item.title} title={item.title} text={item.text} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
