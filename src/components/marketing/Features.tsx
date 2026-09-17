import Image from "next/image";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import { CORE_FEATURES } from "./content";

export default function Features() {
  return (
    <>
      <section
        id="features"
        className="relative py-24"
      >
        <Container>
          <div>
            <SectionHeading title="Core Features" />
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-12">
            {CORE_FEATURES.map((feature) => (
            <div key={feature.title} className="md:col-span-4">
                <Card hover className="h-full bg-white/88 p-8 backdrop-blur">
                  <h3 className="text-[20px] font-medium leading-snug text-[#111111]">{feature.title}</h3>
                  <p className="mt-4 text-[16px] text-[#666666]">{feature.description}</p>
                </Card>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section
        className="pb-24"
      >
        <Container className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="relative h-72 overflow-hidden rounded-lg md:col-span-6 md:h-96">
            <Image src="/optimized/home-event-wide.webp" alt="Event gallery preview" fill className="object-cover transition duration-500 hover:scale-105" sizes="(max-width: 768px) 100vw, 50vw" />
          </div>
          <div className="md:col-span-6">
            <Card className="flex h-full flex-col justify-center bg-white/88 p-8 backdrop-blur">
              <h3 className="text-[32px] font-semibold leading-tight text-[#111111]">Design Fast, Deliver Confidently</h3>
              <p className="mt-4 text-[16px] text-[#666666]">
                Pixdrive helps teams move from raw uploads to final client delivery with structure and clarity.
              </p>
            </Card>
          </div>
          <div className="md:col-span-6">
            <Card className="flex h-full flex-col justify-center bg-white/88 p-8 backdrop-blur">
              <h3 className="text-[32px] font-semibold leading-tight text-[#111111]">Everything Stays Organized</h3>
              <p className="mt-4 text-[16px] text-[#666666]">
                Keep events, folders, and selections grouped so clients always see a neat and premium interface.
              </p>
            </Card>
          </div>
          <div className="relative h-72 overflow-hidden rounded-lg md:col-span-6 md:h-96">
            <Image
              src="/optimized/home-gallery-block-3.webp"
              alt="Photographer managing event workflow"
              fill
              className="object-cover transition duration-500 hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </Container>
      </section>
    </>
  );
}
