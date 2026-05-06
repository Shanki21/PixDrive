"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { motion } from "framer-motion";

type AuthShellProps = {
  children: ReactNode;
  right: ReactNode;
  bottom: ReactNode;
};

export default function AuthShell({ children, right, bottom }: AuthShellProps) {
  return (
    <div className="font-body min-h-screen bg-[#FAFAF8]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative flex min-h-screen flex-col bg-[#fffaf4]">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 flex items-center justify-between px-9 pt-8"
          >
            <Link href="/" className="text-3xl font-semibold leading-none tracking-tight text-[#111111]">
              Pixora
            </Link>
            <Link href="/" className="rounded-full border border-[#E5E5E5] px-3 py-1 text-sm font-medium text-[#666666] transition hover:text-[#111111]">
              Home
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="relative z-10 mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center px-6"
          >
            {children}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="relative z-10 pb-10 text-center text-[14px] font-medium text-[#666666]"
          >
            {bottom}
          </motion.div>
        </section>

        <section className="hidden min-h-screen lg:block">{right}</section>
      </div>
    </div>
  );
}
