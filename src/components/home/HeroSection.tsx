"use client";

import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden text-white flex items-center
      bg-[radial-gradient(circle_at_top,#7a0f12,#3b0507,#160102)]">

      {/* soft overlay */}
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative max-w-7xl mx-auto px-10 grid md:grid-cols-2 gap-16 items-center">

        {/* LEFT */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-6xl font-semibold leading-tight tracking-tight">
            Website and photo gallery <br /> for smart photographers
          </h1>

          <p className="mt-6 text-gray-300 text-lg">
            Attract your future clients
          </p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            className="mt-10 bg-white text-black px-10 py-3 rounded-full font-medium shadow-xl"
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
          className="rounded-xl shadow-2xl"
        />

      </div>
    </section>
  );
}