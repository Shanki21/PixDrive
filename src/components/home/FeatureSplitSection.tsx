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
  return (
    <section className={`${dark ? "bg-[#121212] text-white" : "bg-[#f5f5f3]"} py-32`}>
      <div className="max-w-7xl mx-auto px-10 grid md:grid-cols-2 gap-16 items-center">

        {!dark && (
          <img src={image} className="rounded-xl shadow-xl" alt={title} />
        )}

        <div>
          <p className="mb-3">{index}</p>
          <h2 className="text-4xl font-semibold mb-6">{title}</h2>
          <p className={`${dark ? "text-gray-400" : "text-gray-600"}`}>
            {description}
          </p>
          <a className="inline-block mt-6 underline">Try for free</a>
        </div>

        {dark && (
          <img src={image} className="rounded-xl shadow-xl" alt={title} />
        )}

      </div>
    </section>
  );
}