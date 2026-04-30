import { getPlatformMeta } from "@/config/platform-meta";
import { getPlatformColor, getPlatformColorDarkNav } from "@/config/platform-colors";

type Surface = "light" | "dark";

interface PlatformBadgeProps {
  platform: string;
  className?: string;
  surface?: Surface;
  iconSize?: number;
  compact?: boolean;
}

export function PlatformBadge({
  platform,
  className = "",
  surface = "light",
  iconSize = 12,
  compact = false,
}: PlatformBadgeProps) {
  const meta = getPlatformMeta(platform);
  const colors =
    surface === "dark" ? getPlatformColorDarkNav(platform) : getPlatformColor(platform);
  const Icon = meta.icon;

  if (compact) {
    return (
      <span
        title={meta.displayName}
        className={`inline-flex items-center justify-center w-7 h-7 rounded-md border ${className}`.trim()}
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
        }}
      >
        <Icon size={iconSize} style={{ color: colors.text }} className="opacity-90" aria-hidden />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap min-w-0 ${className}`.trim()}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      }}
    >
      <Icon size={iconSize} className="shrink-0 opacity-90" aria-hidden />
      <span className="truncate min-w-0">{meta.displayName}</span>
    </span>
  );
}
