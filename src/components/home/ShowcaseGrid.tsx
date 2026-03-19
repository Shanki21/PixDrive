"use client";

import Image from "next/image";
import { motion } from "framer-motion";

type ShowcaseGridProps = {
  theme?: "studio" | "drive";
};

const studioImages = [
  "/Img/pexels-apasaric-2464535.webp",
  "/Img/pexels-carlos-oratto-1115158-2111255.webp",
  "/Img/pexels-habib-hosseini-3673459.webp",
  "/Img/pexels-ian-panelo-3049394.webp",
  "/Img/pexels-pham-hoang-kha-1582786-3785644.webp",
  "/Img/pexels-soldiervip-1406766.webp",
];

const driveImages = [
  "/Img/pexels-ian-panelo-3049394.webp",
  "/Img/pexels-habib-hosseini-2908569.webp",
  "/Img/pexels-soldiervip-1406766.webp",
  "/Img/pexels-pixabay-258421.webp",
  "/Img/pexels-1434506-11388577.webp",
  "/Img/pexels-hatice-baran-153179658-14783579.webp",
];

export default function ShowcaseGrid({ theme = "studio" }: ShowcaseGridProps) {
  const isDrive = theme === "drive";
  const showcaseImages = isDrive ? driveImages : studioImages;
  const carouselImages = [...showcaseImages, ...showcaseImages];

  return (
    <section className={`overflow-hidden py-28 text-white ${isDrive ? "bg-[#0b1520]" : "bg-[#0f1013]"}`}>
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">
              {isDrive ? "Delivery preview" : "Showcase"}
            </p>
            <h2 className="font-display mt-3 text-4xl font-semibold md:text-5xl">
              {isDrive ? "See the client delivery rhythm" : "Make your work feel cinematic"}
            </h2>
          </div>
          <p className="max-w-md text-sm text-white/65">
            {isDrive
              ? "From gallery preview to final download, the drive view should feel fast, calm, and obvious to navigate."
              : "Build a portfolio grid that feels curated, not crowded. Each image gets room to breathe and your style gets to set the tone."}
          </p>
        </motion.div>

        <div
          className={`mt-10 overflow-hidden rounded-[30px] border p-4 ${
            isDrive ? "border-[#204255] bg-[#112130]" : "border-white/10 bg-white/[0.03]"
          }`}
        >
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 28, ease: "linear", repeat: Infinity }}
            className="flex w-max gap-4"
          >
            {carouselImages.map((src, index) => (
              <div
                key={`${src}-${index}`}
                className={`relative h-32 w-52 shrink-0 overflow-hidden rounded-[22px] border ${
                  isDrive ? "border-[#2c5468]" : "border-white/10"
                }`}
              >
                <Image src={src} alt={`Carousel photograph ${index + 1}`} fill className="object-cover" sizes="208px" />
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
          className="mt-12 grid gap-6 md:grid-cols-3"
        >
          {showcaseImages.map((src, i) => (
            <motion.div
              key={src}
              variants={{
                hidden: { opacity: 0, y: 26 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
              }}
              className={`group relative overflow-hidden rounded-[26px] border ${
                isDrive ? "border-[#21495d]" : "border-white/10"
              }`}
            >
              <div className="relative h-64 w-full">
                <Image
                  src={src}
                  alt={`Showcase photograph ${i + 1}`}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 30vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-85" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
