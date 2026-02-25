type SortField =
  | "title"
  | "size"
  | "shootingDate"
  | "createdAt"
  | "expiresAt"
  | "flag"
  | "downloads";

type SortOrder = "asc" | "desc";

export default function SortDropdown({
  field,
  order,
  onFieldChange,
  onOrderChange,
}: {
  field: SortField;
  order: SortOrder;
  onFieldChange: (f: SortField) => void;
  onOrderChange: (o: SortOrder) => void;
}) {
  return (
    <div className="absolute right-0 top-10 w-40 h-64 overflow-y-scroll bg-white rounded-xl shadow-lg border z-50">

      {/* FIELDS */}
      <div className="p-2">
        {[
          ["title", "Title"],
          ["size", "Size"],
          ["shootingDate", "Shooting date"],
          ["createdAt", "Creation date"],
          ["expiresAt", "Expiration date"],
          ["flag", "Flag"],
          ["downloads", "Downloads"],
        ].map(([v, label]) => (
          <button
            key={v}
            onClick={() => onFieldChange(v as SortField)}
            className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100
              ${field === v ? "font-semibold" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="border-t" />

      {/* ORDER */}
      <div className="p-2">
        <button
          onClick={() => onOrderChange("asc")}
          className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100
            ${order === "asc" ? "font-semibold" : ""}`}
        >
          Ascendance
        </button>

        <button
          onClick={() => onOrderChange("desc")}
          className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100
            ${order === "desc" ? "font-semibold" : ""}`}
        >
          Descendance
        </button>
      </div>

    </div>
  );
}