import { SearchInput } from "@/components/ui/SearchInput";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  /** When true, search is rendered elsewhere (e.g. catalog toolbar). */
  hideSearch?: boolean;
  platform: string;
  onPlatformChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  classification: string;
  onClassificationChange: (v: string) => void;
  direction: string;
  onDirectionChange: (v: string) => void;
  platforms: string[];
  hideDeprecated: boolean;
  onHideDeprecatedChange: (v: boolean) => void;
}

function ChipGroup({
  value,
  onChange,
  options,
  allLabel,
  catalogTone,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
  catalogTone?: boolean;
}) {
  const all = [{ value: "", label: allLabel }, ...options];
  const activeClass = catalogTone
    ? "bg-[#3B82F6] text-white shadow-[0_0_8px_rgba(59,130,246,0.25)]"
    : "bg-accent text-white shadow-[0_0_8px_rgba(37,99,235,0.2)]";
  const inactiveBorder = catalogTone ? "border-[#E2E8F0]" : "border-border-default";
  return (
    <div className="flex items-center gap-1">
      {all.map((o) => {
        const isActive = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-3 h-7 rounded-full text-[11px] font-medium transition-all duration-200 whitespace-nowrap ${
              isActive
                ? activeClass
                : `bg-transparent border ${inactiveBorder} text-[#64748B] hover:border-[#94A3B8] hover:text-[#0F172A]`
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function CatalogFilters({
  search,
  onSearchChange,
  hideSearch = false,
  platform,
  onPlatformChange,
  status,
  onStatusChange,
  classification,
  onClassificationChange,
  direction,
  onDirectionChange,
  platforms,
  hideDeprecated,
  onHideDeprecatedChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {!hideSearch && (
        <>
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder="Search pipelines..."
          />
          <div className="w-px h-5 bg-[#E2E8F0]" />
        </>
      )}

      <ChipGroup
        value={platform}
        onChange={onPlatformChange}
        allLabel="All Platforms"
        options={platforms.map((p) => ({ value: p, label: p.replace(/_/g, " ") }))}
        catalogTone={hideSearch}
      />

      <ChipGroup
        value={status}
        onChange={onStatusChange}
        allLabel="All Statuses"
        options={[
          { value: "ACTIVE", label: "Active" },
          { value: "DEPRECATED", label: "Deprecated" },
          { value: "PLANNED", label: "Planned" },
        ]}
        catalogTone={hideSearch}
      />

      <ChipGroup
        value={classification}
        onChange={onClassificationChange}
        allLabel="All Classes"
        options={[
          { value: "PUBLIC", label: "Public" },
          { value: "INTERNAL", label: "Internal" },
          { value: "CONFIDENTIAL", label: "Confidential" },
          { value: "RESTRICTED", label: "Restricted" },
        ]}
        catalogTone={hideSearch}
      />

      <ChipGroup
        value={direction}
        onChange={onDirectionChange}
        allLabel="All Directions"
        options={[
          { value: "INGESTION", label: "Ingestion" },
          { value: "EGRESS", label: "Egress" },
          { value: "TRANSFORMATION", label: "Transform" },
        ]}
        catalogTone={hideSearch}
      />

      <label className="group ml-auto flex cursor-pointer select-none items-center gap-1.5">
        <input
          type="checkbox"
          checked={hideDeprecated}
          onChange={(e) => onHideDeprecatedChange(e.target.checked)}
          className={`h-3.5 w-3.5 cursor-pointer rounded border bg-white accent-[#3B82F6] ${hideSearch ? "border-[#E2E8F0]" : "border-border-default"}`}
        />
        <span
          className={`text-xs transition-colors duration-200 ${hideSearch ? "text-[#64748B] group-hover:text-[#0F172A]" : "text-text-muted group-hover:text-text-primary"}`}
        >
          Hide deprecated
        </span>
      </label>
    </div>
  );
}
