type FeatureItemProps = {
  title: string;
  text: string;
};

function Item({ title, text }: FeatureItemProps) {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{text}</p>
    </div>
  );
}

export default function CloudDriveSection() {
  return (
    <section className="relative overflow-hidden bg-[#15151a] py-28 text-white">
      <div className="absolute -right-32 -top-28 h-72 w-72 rounded-full bg-[#d97757]/20 blur-3xl" />
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Cloud drive</p>
            <h2 className="font-display mt-4 text-4xl font-semibold md:text-5xl">Deliver files with confidence</h2>
            <p className="mt-5 text-base text-white/65">
              Share full galleries, track favorites, and keep every delivery polished and consistent.
            </p>
          </div>
          <div className="rounded-[26px] border border-white/10 bg-white/5 p-8 shadow-2xl">
            <div className="grid gap-6 md:grid-cols-2">
              <Item title="Best way to share" text="Upload, preview, and deliver in minutes." />
              <Item title="Favorites" text="Clients can like and comment instantly." />
              <Item title="Impress" text="Branded presentation and clean downloads." />
              <Item title="Attract" text="Keep links private or showcase publicly." />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
