import Link from "next/link";
import Container from "@/components/ui/Container";

export default function HomeFooter() {
  return (
    <footer className="border-t border-[#E5E5E5] bg-[#f2f4f1]">
      <Container className="flex flex-col gap-6 py-14 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[24px] font-semibold tracking-[-0.02em] text-[#111111]">Pixora</p>
          <p className="mt-2 text-[14px] text-[#666666]">Beautiful event delivery for modern photography teams.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[14px] font-medium text-[#666666]">
          <Link href="/login" className="transition hover:text-[#111111]">
            Log in
          </Link>
          <Link href="/signup" className="transition hover:text-[#111111]">
            Sign up
          </Link>
          <span className="text-[#999999]">{new Date().getFullYear()} Pixora</span>
        </div>
      </Container>
    </footer>
  );
}
