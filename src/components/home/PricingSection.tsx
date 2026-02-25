export default function PricingSection() {
  return (
    <section className="py-32 bg-[#f5f5f3] text-center">
      <p className="mb-3">35% discount for first year</p>

      <h2 className="text-5xl font-semibold mb-6">
        Price for all <span className="line-through text-gray-400">$49.99</span> $32.49 / year
      </h2>

      <button className="bg-blue-600 text-white px-10 py-4 rounded-md">
        Try for free
      </button>
    </section>
  );
}