export default function PricingSection() {
  return (
    <section className="relative overflow-hidden bg-[#f6f1ea] py-28">
      <div className="absolute -left-28 top-0 h-72 w-72 rounded-full bg-[#5b7b8a]/15 blur-3xl" />
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="rounded-[34px] border border-[#e3d8cc] bg-white p-10 shadow-2xl md:p-14">
          <p className="text-xs uppercase tracking-[0.35em] text-[#8a7f73]">Launch offer</p>
          <h2 className="font-display mt-4 text-4xl font-semibold leading-tight text-[#1a1a1f] md:text-5xl">
            All-inclusive studio plan
          </h2>
          <p className="mt-4 text-base text-[#6b645c]">
            Everything you need to deliver work, share files, and close new clients.
          </p>
          <div className="mt-8 flex flex-wrap items-end gap-4">
            <div className="text-4xl font-semibold text-[#1a1a1f]">$32.49</div>
            <div className="text-sm text-[#8a7f73]">
              / year <span className="ml-2 line-through">$49.99</span>
            </div>
            <div className="rounded-full bg-[#101114] px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80">
              35% off
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="rounded-full bg-[#101114] px-8 py-3 text-sm font-semibold text-white">
              Try for free
            </button>
            <button className="rounded-full border border-[#cbbeb0] px-7 py-3 text-sm font-semibold text-[#4a433d]">
              View details
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
