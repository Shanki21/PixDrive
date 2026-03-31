import Image from "next/image";

type VisualMode = "darkGallery" | "contactCard" | "tutorial";

type AuthVisualsProps = {
  mode: VisualMode;
  tutorialStep?: number;
};

const authGalleryImages = [
  "/Img/pexels-1434506-11388577.webp",
  "/Img/pexels-apasaric-2464535.webp",
  "/Img/pexels-pixabay-258421.webp",
];

const tutorialImages = [
  "/Img/pexels-carlos-oratto-1115158-2111255.webp",
  "/Img/pexels-habib-hosseini-2908569.webp",
  "/Img/pexels-habib-hosseini-3673459.webp",
  "/Img/pexels-ian-panelo-3049394.webp",
  "/Img/pexels-pham-hoang-kha-1582786-3785644.webp",
  "/Img/pexels-soldiervip-1406766.webp",
];

export default function AuthVisuals({ mode, tutorialStep = 0 }: AuthVisualsProps) {
  if (mode === "contactCard") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#d6efe8,#cfe2ff,#f1f5f3)] p-10">
        <div className="absolute inset-0 bg-white/60" />
        <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#E5E5E5] bg-white/90 p-10 shadow-2xl">
          <div className="absolute inset-x-0 top-0 h-40 overflow-hidden">
            <Image
              src="/Img/pexels-hatice-baran-153179658-14783579.webp"
              alt="Portfolio contact cover"
              fill
              className="object-cover"
              sizes="33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/15 to-transparent" />
          </div>
          <div className="relative mx-auto mb-8 mt-14 h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-lg">
            <Image
              src="/Img/pexels-habib-hosseini-3673459.webp"
              alt="Photographer portrait"
              fill
              className="object-cover"
              sizes="96px"
            />
          </div>
          <h3 className="text-center text-3xl font-semibold text-[#111111]">Anna Smith</h3>
          <p className="mt-2 text-center text-base text-[#666666]">Wedding photographer</p>
          <p className="mt-7 text-center text-3xl font-semibold text-[#111111]">+44 (207) 123 40 00</p>
          <div className="mt-8 space-y-4">
            <div className="rounded-xl border border-[#E5E5E5] py-4 text-center text-[#666666]">WhatsApp</div>
            <div className="rounded-xl border border-[#E5E5E5] py-4 text-center text-[#666666]">Telegram</div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "tutorial") {
    const stepTitle = ["Client galleries", "Projects", "Shop"][tutorialStep] ?? "Client galleries";
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#d8eee8,#dce9fb,#ecf2ef)] p-10">
          <div className="absolute inset-0 bg-white/72" />
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-[#E5E5E5] bg-[#f8f9f7] shadow-xl">
            <div className="grid grid-cols-[220px_1fr]">
              <aside className="bg-[#0f766e] p-6 text-white">
                <p className="text-4xl font-black">Pixora</p>
                <div className="mt-8 space-y-4 text-base text-white/85">
                  <p>Galleries</p>
                  <p>Shop</p>
                  <p>Card</p>
                </div>
              </aside>
              <main className="p-8">
                <h3 className="text-4xl font-semibold text-[#111111]">{stepTitle}</h3>
                <p className="mt-2 text-base text-[#666666]">Project management</p>
              <div className="mt-8 grid grid-cols-3 gap-4">
                {tutorialImages.map((src, index) => (
                  <div key={src} className="relative h-32 overflow-hidden rounded bg-white">
                    <Image
                      src={src}
                      alt={`Tutorial gallery ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="16vw"
                    />
                  </div>
                ))}
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#cee8ff,#bbe5d8,#edf3ef)] p-14">
      <div className="absolute inset-0 bg-[#0f766e]/20" />
      <div className="absolute top-10 z-10 text-center text-[#111111]">
        <div className="inline-flex flex-col gap-1 rounded-full border border-[#d8e3e0] bg-white/90 px-6 py-3 text-xl font-semibold tracking-tight shadow-lg backdrop-blur-md md:text-2xl">
          <span>Website and photo gallery for smart</span>
          <span>photographers</span>
        </div>
      </div>

      <div className="relative mt-24 h-[560px] w-[720px]">
        <div className="absolute inset-0 rounded-[34px] border border-[#dce8e5] bg-white/40 shadow-2xl" />

        <div className="absolute left-4 top-4 h-[420px] w-[640px] overflow-hidden rounded-[30px] border border-[#dce8e5] bg-white/90 shadow-2xl">
          <div className="relative h-[300px]">
            <Image
              src={authGalleryImages[0]}
              alt="Featured portfolio moment"
              fill
              className="object-cover"
              sizes="44vw"
            />
          </div>
          <div className="grid grid-cols-3 gap-3 bg-white p-4">
            {authGalleryImages.map((src, index) => (
              <div key={`${src}-${index}`} className="relative h-28 overflow-hidden rounded-xl">
                <Image
                  src={src}
                  alt={`Portfolio preview ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="12vw"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="absolute -bottom-2 right-8 h-[360px] w-[240px] overflow-hidden rounded-[32px] border border-[#dce8e5] bg-white shadow-2xl">
          <div className="relative h-56">
            <Image
              src={authGalleryImages[1]}
              alt="Portfolio mobile preview"
              fill
              className="object-cover"
              sizes="18vw"
            />
          </div>
          <div className="p-4 text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#111111]">PORTFOLIO</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[#666666]">See more</p>
          </div>
        </div>
      </div>
    </div>
  );
}
