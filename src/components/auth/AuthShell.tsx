"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Manrope } from "next/font/google";

const manrope = Manrope({ subsets: ["latin"] });

type AuthShellProps = {
  children: ReactNode;
  right: ReactNode;
  bottom: ReactNode;
};

export default function AuthShell({ children, right, bottom }: AuthShellProps) {
  return (
    <div className={`${manrope.className} min-h-screen bg-white`}>
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative flex min-h-screen flex-col bg-[#efefef]">
          <div className="flex items-center justify-between px-9 pt-8">
            <Link href="/" className="text-3xl font-extrabold leading-none tracking-tight text-black">
              pixora
            </Link>
            <Link href="/" className="text-2xl font-light text-[#8f99a8]">
              x
            </Link>
          </div>

          <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center px-6">{children}</div>
          <div className="pb-8 text-center text-base font-medium text-[#101522]">{bottom}</div>
        </section>

        <section className="hidden min-h-screen lg:block">{right}</section>
      </div>
    </div>
  );
}


