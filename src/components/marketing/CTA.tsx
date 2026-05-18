"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Container from "@/components/ui/Container";
import { buttonClasses } from "@/components/ui/Button";

export default function CTA() {
  return (
    <motion.section
      className="pixora-cta-bloom border-t border-[#ead7c5] py-24 text-white"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
    >
      <Container className="text-center">
        <h2 className="text-[32px] font-semibold leading-tight text-white">Start Your First Event</h2>
        <p className="mx-auto mt-4 max-w-[620px] text-[16px] text-white/78">
          Create your first Pixora event in minutes and give clients an experience they will remember.
        </p>
        <div className="mt-8">
          <Link href="/signup" className={buttonClasses({ variant: "primary", size: "lg" })}>
            Create Event
          </Link>
        </div>
      </Container>
    </motion.section>
  );
}
