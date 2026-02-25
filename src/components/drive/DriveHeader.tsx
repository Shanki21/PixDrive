export default function DriveHeader() {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <h1 className="text-3xl font-semibold">Cloud Drive</h1>
        <p className="text-gray-500 mt-1">Manage galleries</p>
      </div>

      {/* Storage Box */}
      <div className="bg-gray-50 rounded-lg px-4 py-3 w-65">
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