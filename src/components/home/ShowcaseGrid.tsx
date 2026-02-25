export default function ShowcaseGrid() {
  const images = [
    "https://images.unsplash.com/photo-1495567720989-cebdbdd97913",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f",
    "https://images.unsplash.com/photo-1519741497674-611481863552",
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
  ];

  return (
    <section className="py-32 bg-white text-center">
      <h2 className="text-4xl font-semibold mb-12">
        Create a stunning website
      </h2>

      <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto px-10">
        {images.map((img, i) => (
          <img key={i} src={img} className="rounded-xl h-64 w-full object-cover" />
        ))}
      </div>
    </section>
  );
}