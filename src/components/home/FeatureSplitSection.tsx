type FeatureSplitSectionProps = {
  index: string;
  title: string;
  description: string;
  image: string;
  dark?: boolean;
};

export default function FeatureSplitSection({
  index,
  title,
  description,
  image,
  dark = false,
}: FeatureSplitSectionProps) {
  const placeholderClass = dark
    ? "bg-[linear-gradient(135deg,#d7bca4,#687a87)]"
    : "bg-[linear-gradient(135deg,#eadcca,#96a6b0)]";

  return (
    <section
      className={`${
        dark ? "bg-[#121216] text-white" : "bg-[#f7f3ee] text-[#17171b]"
      } py-28 md:py-32`}
    >
      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        <div className="absolute -top-16 right-10 hidden h-40 w-40 rounded-full border border-current/10 md:block" />
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          {!dark && (
            <div className="relative">
              <div className="absolute -left-6 -top-6 h-full w-full rounded-[28px] border border-[#d8cfc4]" />
              <div className={`aspect-[4/3] overflow-hidden rounded-[26px] shadow-xl ${placeholderClass}`} />
            </div>
          )}

          <div>
            <p className={`mb-4 text-xs uppercase tracking-[0.4em] ${dark ? "text-white/50" : "text-[#6f6a63]"}`}>
              {index}
            </p>
            <h2 className="font-display text-4xl font-semibold leading-tight md:text-5xl">{title}</h2>
            <p className={`mt-5 text-base leading-relaxed ${dark ? "text-white/60" : "text-[#5f5b55]"}`}>
              {description}
            </p>
            <a className="mt-7 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em]">
              Try for free <span aria-hidden="true">&rarr;</span>
            </a>
          </div>

          {dark && (
            <div className="relative">
              <div className="absolute -right-6 -top-6 h-full w-full rounded-[28px] border border-white/10" />
              <div className={`aspect-[4/3] overflow-hidden rounded-[26px] shadow-xl ${placeholderClass}`} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
