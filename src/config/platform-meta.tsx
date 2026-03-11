import {
  Database,
  CloudLightning,
  Snowflake,
  Zap,
  Box,
  Layers,
  type LucideIcon,
} from "lucide-react";

interface PlatformMeta {
  displayName: string;
  icon: LucideIcon;
}

const KNOWN_PLATFORMS: Record<string, PlatformMeta> = {
  AIRBYTE: { displayName: "Airbyte", icon: Database },
  DATABRICKS: { displayName: "Databricks", icon: CloudLightning },
  DBT_CLOUD: { displayName: "dbt Cloud", icon: Box },
  POWER_AUTOMATE: { displayName: "Power Automate", icon: Zap },
  SNOWFLAKE: { displayName: "Snowflake", icon: Snowflake },
};

const DEFAULT_ICON: LucideIcon = Layers;

function toTitleCase(key: string): string {
  return key
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function getPlatformMeta(key: string): PlatformMeta {
  const upper = key.toUpperCase();
  return (
    KNOWN_PLATFORMS[upper] ?? {
      displayName: toTitleCase(upper),
      icon: DEFAULT_ICON,
    }
  );
}

export function getPlatformDisplayName(key: string): string {
  return getPlatformMeta(key).displayName;
}

export function getPlatformIcon(key: string): LucideIcon {
  return getPlatformMeta(key).icon;
}
