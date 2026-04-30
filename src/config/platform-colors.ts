export const PLATFORM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  DATABRICKS: { bg: "rgba(220,38,38,0.06)", text: "#DC2626", border: "rgba(220,38,38,0.15)" },
  AIRBYTE: { bg: "rgba(99,102,241,0.06)", text: "#4F46E5", border: "rgba(99,102,241,0.15)" },
  SNOWFLAKE: { bg: "rgba(14,165,233,0.06)", text: "#0284C7", border: "rgba(14,165,233,0.15)" },
  POWER_AUTOMATE: { bg: "rgba(37,99,235,0.06)", text: "#2563EB", border: "rgba(37,99,235,0.15)" },
  DBT_CLOUD: { bg: "rgba(234,88,12,0.06)", text: "#C2410C", border: "rgba(234,88,12,0.15)" },
};

export const DEFAULT_PLATFORM_COLOR = {
  bg: "rgba(100,116,139,0.06)",
  text: "#475569",
  border: "rgba(100,116,139,0.15)",
};

export function getPlatformColor(platform: string) {
  return PLATFORM_COLORS[platform.toUpperCase()] ?? DEFAULT_PLATFORM_COLOR;
}

export function getPlatformColorDarkNav(platform: string) {
  const c = getPlatformColor(platform);
  return {
    bg: "rgba(255,255,255,0.06)",
    text: c.text,
    border: c.border,
  };
}
