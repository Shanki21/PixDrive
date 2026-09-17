import Image from "next/image";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";

export default function Gallery() {
  return (
    <section
      id="gallery"
      className="relative pb-24 pt-24"
    >
      <Container>
        <div>
          <SectionHeading title="Gallery Preview" />
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="relative h-[440px] overflow-hidden rounded-lg md:col-span-6">
            <Image src="/optimized/home-hero-main.webp" alt="Large gallery tile" fill className="object-cover transition duration-500 hover:scale-105" sizes="(max-width: 768px) 100vw, 50vw" />
          </div>
          <div className="grid gap-6 md:col-span-6">
            <div className="relative h-[208px] overflow-hidden rounded-lg">
              <Image
                src="/optimized/home-hero-portrait.webp"
                alt="Top right gallery tile"
                fill
                className="object-cover transition duration-500 hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="relative h-[208px] overflow-hidden rounded-lg">
              <Image
                src="/optimized/home-gallery-small.webp"
                alt="Bottom right gallery tile"
                fill
                className="object-cover transition duration-500 hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
          <div className="relative h-[180px] overflow-hidden rounded-lg md:col-span-3">
            <Image src="/optimized/home-gallery-block-1.webp" alt="Gallery block one" fill className="object-cover transition duration-500 hover:scale-105" sizes="(max-width: 768px) 100vw, 25vw" />
          </div>
          <div className="relative h-[220px] overflow-hidden rounded-lg md:col-span-5">
            <Image src="/optimized/home-event-wide.webp" alt="Gallery block two" fill className="object-cover transition duration-500 hover:scale-105" sizes="(max-width: 768px) 100vw, 42vw" />
          </div>
          <div className="relative h-[180px] overflow-hidden rounded-lg md:col-span-4">
            <Image src="/optimized/home-gallery-block-3.webp" alt="Gallery block three" fill className="object-cover transition duration-500 hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
        </div>
      </Container>
    </section>
  );
}
