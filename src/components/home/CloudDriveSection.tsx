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
    <section className="py-32 bg-[#0b1620] text-white">
      <div className="max-w-7xl mx-auto px-10">

        <h2 className="text-4xl font-semibold mb-6">Cloud drive</h2>

        <div className="grid md:grid-cols-2 gap-12">

          <Item title="Best way to share" text="Upload and share photos." />
          <Item title="Favorites" text="Clients can like photos." />
          <Item title="Impress" text="Beautiful galleries." />
          <Item title="Attract" text="Get more views." />

        </div>

      </div>
    </section>
  );
}