import Link from "next/link";
import Container from "@/components/ui/Container";
import { buttonClasses } from "@/components/ui/Button";
import { NAV_LINKS } from "./content";

export default function HomeNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E5E5] bg-[#FAFAF8]/85 backdrop-blur">
      <Container className="flex items-center justify-between py-4">
        <Link href="/" className="text-[24px] font-semibold tracking-[-0.02em] text-[#111111]">
          Pixora
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className="text-[14px] font-medium text-[#666666] transition hover:text-[#111111]">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-[14px] font-medium text-[#666666] transition hover:text-[#111111]">
            Log in
          </Link>
          <Link href="/signup" className={buttonClasses({ variant: "primary", size: "sm" })}>
            Sign up
          </Link>
        </div>
      </Container>
    </header>
  );
}
