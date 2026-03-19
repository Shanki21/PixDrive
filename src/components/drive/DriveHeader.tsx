export default function DriveHeader() {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Cloud Drive</h1>
        <p className="mt-2 text-sm text-[#6b645c] sm:text-base">Manage galleries and deliver assets.</p>
      </div>

      {/* Storage Box */}
      <div className="w-full rounded-2xl border border-[#e3d8cc] bg-white/70 px-5 py-4 shadow-sm sm:w-72">
        <div className="mb-2 text-sm text-[#6b645c]">
          Used 0 Bytes of 120 GB
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-[#efe6dc]">
          <div className="h-full w-[5%] rounded-full bg-[#d97757]" />
        </div>
      </div>
    </div>
  );
}
