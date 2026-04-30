import type { CatalogEntry, CatalogEntity, LineageEdge, CatalogDiagram, CatalogDocument } from "@/types/pipeline";

const WEIGHTS = {
  description: 10,
  owner: 10,
  engineer: 10,
  lineage: 15,
  diagrams: 10,
  documents: 10,
  classification: 10,
  refreshFrequency: 10,
  entities: 10,
  dataDirection: 5,
} as const;

export function computeQualityScore(
  entry: CatalogEntry,
  lineage: LineageEdge[] = [],
  diagrams: CatalogDiagram[] = [],
  documents: CatalogDocument[] = [],
  entities: CatalogEntity[] = [],
): number {
  let score = 0;
  if (entry.pipelineDescription) score += WEIGHTS.description;
  if (entry.ownerName) score += WEIGHTS.owner;
  if (entry.engineerName) score += WEIGHTS.engineer;
  if (lineage.some((e) => e.sourceCatalogId === entry.catalogId || e.targetCatalogId === entry.catalogId))
    score += WEIGHTS.lineage;
  if (diagrams.length > 0) score += WEIGHTS.diagrams;
  if (documents.length > 0) score += WEIGHTS.documents;
  if (entry.dataClassification) score += WEIGHTS.classification;
  if (entry.refreshFrequency) score += WEIGHTS.refreshFrequency;
  if (entities.length > 0) score += WEIGHTS.entities;
  if (entry.dataDirection) score += WEIGHTS.dataDirection;
  return score;
}

interface Props {
  score: number;
  size?: number;
}

export function QualityScoreRing({ score, size = 40 }: Props) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 70 ? "#16A34A" : score >= 50 ? "#D97706" : "#DC2626";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute text-[10px] font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}
