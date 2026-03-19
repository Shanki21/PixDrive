"use client";

import Link from "next/link";
import { ReactNode } from "react";

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
          <div className="flex items-center justify-between px-9 pt-8">
            <Link href="/" className="font-display text-3xl font-semibold leading-none tracking-tight text-black">
              pixora
            </Link>
            <Link href="/" className="text-2xl font-light text-[#8f99a8]">
              x
            </Link>
          </div>

          <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-6">{children}</div>
          <div className="pb-10 text-center text-base font-medium text-[#101522]">{bottom}</div>
        </section>

        <section className="hidden min-h-screen lg:block">{right}</section>
      </div>
    </div>
  );
}


