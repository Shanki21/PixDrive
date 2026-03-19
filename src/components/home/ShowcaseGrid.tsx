export default function ShowcaseGrid() {
  const gradients = [
    "bg-[linear-gradient(135deg,#e7d5c1,#8fa0ab)]",
    "bg-[linear-gradient(135deg,#d6b89c,#6e7e8b)]",
    "bg-[linear-gradient(135deg,#f0e6da,#b98463)]",
    "bg-[linear-gradient(135deg,#d8c3ad,#7e919d)]",
    "bg-[linear-gradient(135deg,#ead9c5,#8f6c52)]",
    "bg-[linear-gradient(135deg,#cdb29b,#5f7381)]",
  ];

  return (
    <section className="bg-[#0f1013] py-28 text-white">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Showcase</p>
            <h2 className="font-display mt-3 text-4xl font-semibold md:text-5xl">Make your work feel cinematic</h2>
          </div>
          <p className="max-w-md text-sm text-white/65">
            Build a portfolio grid that feels curated, not crowded. Each image gets room to breathe.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {gradients.map((gradient, i) => (
            <div key={i} className="group relative overflow-hidden rounded-[26px] border border-white/10">
              <div className={`h-64 w-full transition duration-500 group-hover:scale-105 ${gradient}`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-80" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
