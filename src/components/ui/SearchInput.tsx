import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Applied to the outer wrapper (e.g. width) */
  className?: string;
  /** Catalog toolbar: slate border, 8px radius, taller field */
  variant?: "default" | "catalog";
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  variant = "default",
}: SearchInputProps) {
  const catalog = variant === "catalog";
  return (
    <div className={`relative ${className}`.trim()}>
      <Search
        size={14}
        className={`absolute left-3 top-1/2 -translate-y-1/2 ${catalog ? "text-[#94A3B8]" : "text-text-muted"}`}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={
          catalog
            ? "h-9 w-full min-w-0 rounded-lg border border-[#E2E8F0] bg-white py-2 pl-9 pr-4 text-sm text-[#0F172A] shadow-sm outline-none transition-all duration-200 placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/25"
            : "h-8 w-56 min-w-0 rounded-lg border border-border-default bg-bg-primary pl-8 pr-3 text-sm text-text-primary outline-none transition-all duration-200 placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/20"
        }
      />
    </div>
  );
}
