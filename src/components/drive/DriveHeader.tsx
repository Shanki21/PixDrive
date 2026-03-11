export default function DriveHeader() {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:gap-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Cloud Drive</h1>
        <p className="mt-1 text-sm text-gray-500 sm:text-base">Manage galleries</p>
      </div>

      {/* Storage Box */}
      <div className="w-full rounded-lg bg-gray-50 px-4 py-3 sm:w-72">
        <div className="text-sm text-gray-600 mb-2">
          Used 0 Bytes of 120 GB
        </div>

        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full w-[5%] bg-blue-500 rounded-full" />
        </div>
      </div>
    </div>
  );
}
