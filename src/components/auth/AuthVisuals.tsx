type VisualMode = "darkGallery" | "contactCard" | "tutorial";

type AuthVisualsProps = {
  mode: VisualMode;
  tutorialStep?: number;
};

export default function AuthVisuals({ mode, tutorialStep = 0 }: AuthVisualsProps) {
  if (mode === "contactCard") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#f3e8d6,#d4b496,#a98467)] p-10">
        <div className="absolute inset-0 bg-white/70" />
        <div className="w-full max-w-md rounded-[36px] bg-white/85 p-10 shadow-2xl">
          <div className="mx-auto mb-8 h-20 w-20 rounded-full bg-[linear-gradient(135deg,#dac2a2,#9c6e45)]" />
          <h3 className="text-center text-3xl font-semibold text-[#1e1f22]">Anna Smith</h3>
          <p className="mt-2 text-center text-base text-[#52555d]">Wedding photographer</p>
          <p className="mt-7 text-center text-3xl font-semibold text-[#15161a]">+44 (207) 123 40 00</p>
          <div className="mt-8 space-y-4">
            <div className="rounded-xl border border-[#dbdbdb] py-4 text-center text-[#8e8e8e]">WhatsApp</div>
            <div className="rounded-xl border border-[#dbdbdb] py-4 text-center text-[#8e8e8e]">Telegram</div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "tutorial") {
    const stepTitle = ["Client galleries", "Projects", "Shop"][tutorialStep] ?? "Client galleries";
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#f4f0ea,#d6c3ae,#9ba9b2)] p-10">
        <div className="absolute inset-0 bg-white/75" />
        <div className="w-full max-w-4xl rounded-sm border border-[#d6d6d6] bg-[#f4f4f4] shadow-xl">
          <div className="grid grid-cols-[220px_1fr]">
            <aside className="bg-[#1c1d20] p-6 text-white">
              <p className="text-4xl font-black">pixora</p>
              <div className="mt-8 space-y-4 text-base text-[#d8d8d8]">
                <p>Galleries</p>
                <p>Shop</p>
                <p>Card</p>
              </div>
            </aside>
            <main className="p-8">
              <h3 className="text-4xl font-semibold text-[#191c21]">{stepTitle}</h3>
              <p className="mt-2 text-base text-[#8c8f96]">Project management</p>
              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="h-32 rounded bg-white" />
                <div className="h-32 rounded bg-white" />
                <div className="h-32 rounded bg-white" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="h-32 rounded bg-white" />
                <div className="h-32 rounded bg-white" />
                <div className="h-32 rounded bg-white" />
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#3d2b24,#17161b,#0d0d11)] p-14">
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute top-10 z-10 text-center text-white">
        <div className="font-display inline-flex flex-col gap-1 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-xl font-semibold tracking-tight shadow-lg backdrop-blur-md md:text-2xl">
          <span className="drop-shadow">Website and photo gallery for smart</span>
          <span className="drop-shadow">photographers</span>
        </div>
      </div>

      <div className="relative mt-24 h-[560px] w-[720px]">
        <div className="absolute inset-0 rounded-[34px] border border-white/25 bg-black/20 shadow-2xl" />

        <div className="absolute left-4 top-4 h-[420px] w-[640px] overflow-hidden rounded-[30px] border border-white/30 bg-white/10 shadow-2xl">
          <div className="h-[300px] bg-[linear-gradient(135deg,#d9b99c,#8ea0ad)]" />
          <div className="grid grid-cols-3 gap-3 bg-white p-4">
            <div className="h-28 rounded-xl bg-[linear-gradient(135deg,#d8c2a5,#8e9ba5)]" />
            <div className="h-28 rounded-xl bg-[linear-gradient(135deg,#cbb09d,#6e7e8c)]" />
            <div className="h-28 rounded-xl bg-[linear-gradient(135deg,#eadac8,#b98562)]" />
          </div>
        </div>

        <div className="absolute -bottom-2 right-8 h-[360px] w-[240px] overflow-hidden rounded-[32px] border border-white/30 bg-white shadow-2xl">
          <div className="h-56 bg-[linear-gradient(135deg,#e5d1ba,#8fa0ad)]" />
          <div className="p-4 text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#111320]">PORTFOLIO</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[#6b7280]">See more</p>
          </div>
        </div>
      </div>
    </div>
  );
}


