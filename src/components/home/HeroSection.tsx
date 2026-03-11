"use client";

import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section
      className="relative flex min-h-screen items-center overflow-hidden text-white
      bg-[radial-gradient(circle_at_top,#7a0f12,#3b0507,#160102)]"
    >

      {/* soft overlay */}
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pt-20 pb-12 sm:px-8 md:grid-cols-2 md:gap-16">

        {/* LEFT */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Website and photo gallery <br /> for smart photographers
          </h1>

          <p className="mt-6 text-base text-gray-300 sm:text-lg">
            Attract your future clients
          </p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            className="mt-8 rounded-full bg-white px-8 py-3 font-medium text-black shadow-xl sm:px-10"
          >
            Get started
          </motion.button>
        </motion.div>

        {/* RIGHT IMAGE */}
        <motion.img
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e"
          className="w-full rounded-xl shadow-2xl"
          loading="lazy"
          alt="Photography showcase"
        />

      </div>
    </section>
  );
}
