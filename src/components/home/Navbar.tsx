export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-10 py-6 text-white">
      <div className="font-bold text-xl">Pixora</div>

      <div className="flex gap-6 items-center text-sm">
        <a>Site + Drive</a>
        <a>Drive</a>
        <a className="underline">Log in</a>
        <button className="border px-5 py-2 rounded-full">
          Try for free
        </button>
      </div>
    </nav>
  );
}