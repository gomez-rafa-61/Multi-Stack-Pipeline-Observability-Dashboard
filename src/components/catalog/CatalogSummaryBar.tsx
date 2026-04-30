import type { CatalogEntry } from "@/types/pipeline";

const U = {
  navy: "#0F172A",
  teal: "#085041",
  border: "#E2E8F0",
  muted: "#64748B",
} as const;

interface Props {
  entries: CatalogEntry[];
  qualityScores: Map<string, number>;
}

function formatUpdatedAgo(entries: CatalogEntry[]): string {
  const dates = entries
    .map((e) => e.lastCatalogUpdate)
    .filter(Boolean) as string[];
  if (dates.length === 0) return "No catalog updates yet";
  const latest = Math.max(...dates.map((d) => new Date(d).getTime()));
  const diffMs = Date.now() - latest;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Updated ${hrs}h ago`;
  return `Updated ${Math.floor(hrs / 24)}d ago`;
}

function SummaryCard({
  label,
  value,
  background,
  status,
}: {
  label: string;
  value: string;
  background: string;
  status?: string;
}) {
  const isLight = background.toUpperCase() === "#FFFFFF" || background === "#fff";
  return (
    <div
      className="flex min-w-0 flex-1 flex-col rounded-xl border p-5 shadow-[0_4px_6px_-1px_rgb(0_0_0/0.1)]"
      style={{
        backgroundColor: background,
        borderColor: U.border,
        color: isLight ? U.navy : "#FFF",
      }}
    >
      <div
        className="text-[11px] font-semibold uppercase opacity-80"
        style={{ color: isLight ? U.muted : "rgba(255,255,255,0.85)" }}
      >
        {label}
      </div>
      <div className="mt-2 text-[32px] font-bold leading-none tracking-tight">{value}</div>
      {status && (
        <div
          className="mt-1 text-[11px] leading-snug opacity-70"
          style={{ color: isLight ? U.muted : "rgba(255,255,255,0.85)" }}
        >
          {status}
        </div>
      )}
    </div>
  );
}

export function CatalogSummaryBar({ entries, qualityScores }: Props) {
  const total = entries.length;
  const documented = entries.filter((e) => e.isDocumented).length;
  const documentedPct = total > 0 ? Math.round((documented / total) * 100) : 0;

  const now = Date.now();
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
  const isStale = (e: CatalogEntry) =>
    !e.lastCatalogUpdate || now - new Date(e.lastCatalogUpdate).getTime() > NINETY_DAYS_MS;

  const prodReady = entries.filter(
    (e) => e.catalogStatus === "ACTIVE" && e.isDocumented && !isStale(e),
  ).length;
  const prodReadyPct = total > 0 ? Math.round((prodReady / total) * 100) : 0;

  const scores = Array.from(qualityScores.values());
  const avgQuality =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const docStatus =
    documentedPct === 0 ? "Action required" : `${documented} of ${total} pipelines documented`;
  const prodStatus =
    prodReadyPct >= 80
      ? "Meets prod-ready bar"
      : prodReadyPct === 0
        ? "Verification pending"
        : "Verification pending for remainder";

  const globalStatus =
    avgQuality >= 70 ? "Portfolio health strong" : avgQuality >= 40 ? "Room to improve" : "Focus on documentation & lineage";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
      <SummaryCard
        label="Total pipelines"
        value={String(total)}
        background={U.navy}
        status={formatUpdatedAgo(entries)}
      />
      <SummaryCard
        label="Documentation"
        value={`${documentedPct}%`}
        background="#FFFFFF"
        status={docStatus}
      />
      <SummaryCard
        label="Prod ready"
        value={`${prodReadyPct}%`}
        background="#FFFFFF"
        status={prodStatus}
      />
      <SummaryCard
        label="Global availability"
        value={`${avgQuality}%`}
        background={U.teal}
        status={globalStatus}
      />
    </div>
  );
}
