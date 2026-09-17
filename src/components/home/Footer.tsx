export default function Footer() {
  return (
    <footer className="bg-[#0f1013] py-12 text-center text-white/70 sm:py-16">
      <div className="font-display text-xl text-white">Pixdrive</div>
      <p className="mt-3 text-xs uppercase tracking-[0.35em] text-white/50">
        (c) {new Date().getFullYear()} All rights reserved
      </p>
    </footer>
  );
}
