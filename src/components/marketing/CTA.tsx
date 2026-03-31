"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Container from "@/components/ui/Container";
import { buttonClasses } from "@/components/ui/Button";

export default function CTA() {
  return (
    <motion.section
      className="border-t border-[#E5E5E5] bg-white/70 py-24"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
    >
      <Container className="text-center">
        <h2 className="text-[32px] font-semibold leading-tight text-[#111111]">Start Your First Event</h2>
        <p className="mx-auto mt-4 max-w-[620px] text-[16px] text-[#666666]">
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
