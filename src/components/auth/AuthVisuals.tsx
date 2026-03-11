type VisualMode = "darkGallery" | "contactCard" | "tutorial";

type AuthVisualsProps = {
  mode: VisualMode;
  tutorialStep?: number;
};

export default function AuthVisuals({ mode, tutorialStep = 0 }: AuthVisualsProps) {
  if (mode === "contactCard") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_25%_25%,#f5ecdb_0%,#e3d6bf_45%,#b9a890_100%)] p-10">
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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_25%_25%,#f5ecdb_0%,#e3d6bf_45%,#b9a890_100%)] p-10">
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0e0f13] p-14">
      <div className="absolute top-16 text-center text-2xl font-semibold text-white">
        <p>Website and photo gallery for smart</p>
        <p>photographers</p>
      </div>
      <div className="relative mt-24 h-135 w-175 rounded-[30px] border border-white/30 bg-[linear-gradient(135deg,#95a0a8,#66737f)] p-10 shadow-2xl">
        <div className="mb-8 h-36 rounded-xl bg-[#2d3944]/40" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-56 rounded-lg bg-white/75" />
          <div className="h-56 rounded-lg bg-white/75" />
        </div>
        <div className="absolute -bottom-8 right-0 h-85 w-55 rounded-[35px] border border-white/30 bg-[linear-gradient(150deg,#768390,#404951)]" />
      </div>
    </div>
  );
}


