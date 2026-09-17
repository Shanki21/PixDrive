import Link from "next/link";
import Container from "@/components/ui/Container";
import { buttonClasses } from "@/components/ui/Button";

export default function CTA() {
  return (
    <section
      className="pixora-cta-bloom border-t border-[#ead7c5] py-24 text-white"
    >
      <Container className="text-center">
        <h2 className="text-[32px] font-semibold leading-tight text-white">Start Your First Event</h2>
        <p className="mx-auto mt-4 max-w-[620px] text-[16px] text-white/78">
          Create your first Pixdrive event in minutes and give clients an experience they will remember.
        </p>
        <div className="mt-8">
          <Link href="/signup" className={buttonClasses({ variant: "primary", size: "lg" })}>
            Create Event
          </Link>
        </div>
      </Container>
    </section>
  );
}
