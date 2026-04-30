import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/services/api-client";
import { SearchInput } from "@/components/ui/SearchInput";
import { CatalogSummaryBar } from "@/components/catalog/CatalogSummaryBar";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { CatalogTable } from "@/components/tables/CatalogTable";
import { CatalogDetailPanel } from "@/components/catalog/CatalogDetailPanel";
import { OnboardWizard } from "@/components/catalog/OnboardWizard";
import { BulkImportPanel } from "@/components/catalog/BulkImportPanel";
import { LineageGraph } from "@/components/catalog/LineageGraph";
import { computeQualityScore } from "@/components/catalog/QualityScoreRing";
import type { CatalogEntry, EntityLineageRecord, LineageEdge, CatalogDiagram, CatalogDocument } from "@/types/pipeline";

type TabId = "pipelines" | "lineage" | "onboard";
type OnboardMode = "wizard" | "bulk";

export function CatalogPortal() {
  const [activeTab, setActiveTab] = useState<TabId>("pipelines");
  const [onboardMode, setOnboardMode] = useState<OnboardMode>("wizard");
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [lineage, setLineage] = useState<LineageEdge[]>([]);
  const [entityLineage, setEntityLineage] = useState<EntityLineageRecord[]>([]);
  const [diagrams, setDiagrams] = useState<CatalogDiagram[]>([]);
  const [documents, setDocuments] = useState<CatalogDocument[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [lineageSearch, setLineageSearch] = useState("");

  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [hideDeprecated, setHideDeprecated] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.getCatalog().then(setEntries),
      api.getCatalogLineage().then(setLineage),
      api.getEntityLineage().then(setEntityLineage),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (entries.length > 0) {
      Promise.all(
        entries.map((e) => api.getCatalogDiagrams(e.catalogId)),
      ).then((results) => setDiagrams(results.flat()));
      Promise.all(
        entries.map((e) => api.getCatalogDocuments(e.catalogId)),
      ).then((results) => setDocuments(results.flat()));
    }
  }, [entries]);

  const platforms = useMemo(
    () => [...new Set(entries.map((e) => e.platform))].sort(),
    [entries],
  );

  const qualityScores = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) {
      const entryDiagrams = diagrams.filter((d) => d.catalogId === entry.catalogId);
      const entryDocs = documents.filter((d) => d.catalogId === entry.catalogId);
      map.set(entry.catalogId, computeQualityScore(entry, lineage, entryDiagrams, entryDocs));
    }
    return map;
  }, [entries, lineage, diagrams, documents]);

  const filtered = useMemo(() => {
    let rows = entries;
    if (hideDeprecated) rows = rows.filter((r) => r.catalogStatus !== "DEPRECATED");
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.pipelineName.toLowerCase().includes(q) ||
          (r.pipelineDescription ?? "").toLowerCase().includes(q) ||
          (r.businessSegment ?? "").toLowerCase().includes(q) ||
          (r.dataProvider ?? "").toLowerCase().includes(q) ||
          (r.ownerName ?? "").toLowerCase().includes(q) ||
          (r.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (platformFilter) rows = rows.filter((r) => r.platform === platformFilter);
    if (statusFilter) rows = rows.filter((r) => r.catalogStatus === statusFilter);
    if (classFilter) rows = rows.filter((r) => r.dataClassification === classFilter);
    if (directionFilter) rows = rows.filter((r) => r.dataDirection === directionFilter);
    return rows;
  }, [entries, search, platformFilter, statusFilter, classFilter, directionFilter, hideDeprecated]);

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "pipelines", label: "All Pipelines", count: filtered.length },
    { id: "lineage", label: "Lineage" },
    { id: "onboard", label: "Onboarding" },
  ];

  return (
    <div className="min-h-0 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:p-8">
      <header className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">Pipeline catalog</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Central portal for pipeline documentation, lineage, and governance
        </p>
      </header>

      <CatalogSummaryBar entries={entries} qualityScores={qualityScores} />

      <div className="mt-8 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_4px_6px_-1px_rgb(0_0_0/0.1)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] px-6 py-4">
          <div className="flex flex-wrap gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 text-sm font-medium transition-colors duration-200 ${
                  activeTab === tab.id
                    ? "border-b-[3px] border-[#3B82F6] font-bold text-[#0F172A]"
                    : "border-b-[3px] border-transparent text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {tab.label}
                {tab.count != null && (
                  <span className="ml-1.5 text-xs font-normal text-[#94A3B8]">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
          {activeTab === "pipelines" && (
            <SearchInput
              className="w-full min-w-[200px] shrink-0 sm:w-[280px]"
              variant="catalog"
              value={search}
              onChange={setSearch}
              placeholder="Search catalog..."
            />
          )}
          {activeTab === "lineage" && (
            <SearchInput
              className="w-full min-w-[200px] shrink-0 sm:w-[280px]"
              variant="catalog"
              value={lineageSearch}
              onChange={setLineageSearch}
              placeholder="Search pipelines…"
            />
          )}
        </div>

        {activeTab === "pipelines" && (
          <>
            <div className="border-b border-[#E2E8F0] bg-[#F8FAFC]/90 px-6 py-3">
              <CatalogFilters
                search={search}
                onSearchChange={setSearch}
                hideSearch
                platform={platformFilter}
                onPlatformChange={setPlatformFilter}
                status={statusFilter}
                onStatusChange={setStatusFilter}
                classification={classFilter}
                onClassificationChange={setClassFilter}
                direction={directionFilter}
                onDirectionChange={setDirectionFilter}
                platforms={platforms}
                hideDeprecated={hideDeprecated}
                onHideDeprecatedChange={setHideDeprecated}
              />
            </div>
            <CatalogTable
              variant="landing"
              data={filtered}
              qualityScores={qualityScores}
              onSelect={setSelectedEntry}
              selectedId={selectedEntry?.catalogId ?? null}
              loading={loading}
            />
          </>
        )}

        {activeTab === "lineage" && (
          <div className="p-4 sm:p-6">
            <LineageGraph
              records={entityLineage}
              query={lineageSearch}
            />
          </div>
        )}

        {activeTab === "onboard" && (
          <div className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setOnboardMode("wizard")}
                className={`h-8 rounded-lg px-4 text-xs font-medium transition-colors duration-200 ${
                  onboardMode === "wizard"
                    ? "bg-[#3B82F6] text-white shadow-sm"
                    : "border border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#94A3B8] hover:text-[#0F172A]"
                }`}
              >
                Single pipeline
              </button>
              <button
                type="button"
                onClick={() => setOnboardMode("bulk")}
                className={`h-8 rounded-lg px-4 text-xs font-medium transition-colors duration-200 ${
                  onboardMode === "bulk"
                    ? "bg-[#3B82F6] text-white shadow-sm"
                    : "border border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#94A3B8] hover:text-[#0F172A]"
                }`}
              >
                Bulk CSV import
              </button>
            </div>

            {onboardMode === "wizard" ? (
              <OnboardWizard
                existingEntries={entries}
                onComplete={() => {
                  setActiveTab("pipelines");
                  fetchData();
                }}
              />
            ) : (
              <BulkImportPanel
                onComplete={() => {
                  setActiveTab("pipelines");
                  fetchData();
                }}
              />
            )}
          </div>
        )}
      </div>

      {selectedEntry && (
        <CatalogDetailPanel
          entry={selectedEntry}
          lineage={lineage}
          qualityScore={qualityScores.get(selectedEntry.catalogId) ?? 0}
          onClose={() => setSelectedEntry(null)}
          onUpdated={fetchData}
          allEntries={entries}
          onNavigateEntry={setSelectedEntry}
        />
      )}
    </div>
  );
}
