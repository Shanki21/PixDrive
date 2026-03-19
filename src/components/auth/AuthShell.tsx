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
    <div className="font-body min-h-screen bg-[#f7f3ee]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative flex min-h-screen flex-col bg-[#f7f3ee]">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between px-9 pt-8"
          >
            <Link href="/" className="font-display text-3xl font-semibold leading-none tracking-tight text-black">
              pixora
            </Link>
            <Link href="/" className="text-2xl font-light text-[#8f99a8] transition hover:text-[#4b5563]">
              x
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-6"
          >
            {children}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="pb-10 text-center text-base font-medium text-[#101522]"
          >
            {bottom}
          </motion.div>
        </section>

        <section className="hidden min-h-screen lg:block">{right}</section>
      </div>
    </div>
  );
}
