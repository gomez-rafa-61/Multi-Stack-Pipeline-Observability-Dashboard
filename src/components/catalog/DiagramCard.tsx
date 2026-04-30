import { useState } from "react";
import { ExternalLink, FileImage, Eye, EyeOff } from "lucide-react";
import type { CatalogDiagram } from "@/types/pipeline";

const TYPE_LABELS: Record<string, string> = {
  ARCHITECTURE: "Architecture",
  DATA_FLOW: "Data Flow",
  SEQUENCE: "Sequence",
  ERD: "ERD",
};

const EMBEDDABLE_PATTERNS: { pattern: RegExp; transform: (url: string) => string }[] = [
  {
    pattern: /lucid\.app/i,
    transform: (url) => url.replace(/\/edit\//, "/view/").replace(/\/documents\//, "/embeds/"),
  },
  {
    pattern: /miro\.com/i,
    transform: (url) => url.replace("/board/", "/embed/"),
  },
  {
    pattern: /figma\.com\/file/i,
    transform: (url) => `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`,
  },
  {
    pattern: /docs\.google\.com\/(document|drawings|presentation|spreadsheets)/i,
    transform: (url) => url.replace(/\/edit.*/, "/preview"),
  },
  {
    pattern: /app\.diagrams\.net|draw\.io/i,
    transform: (url) => url,
  },
];

function getEmbedUrl(url: string): string | null {
  for (const { pattern, transform } of EMBEDDABLE_PATTERNS) {
    if (pattern.test(url)) return transform(url);
  }
  return null;
}

interface Props {
  diagram: CatalogDiagram;
}

export function DiagramCard({ diagram }: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const embedUrl = getEmbedUrl(diagram.url);

  return (
    <div className="rounded-lg border border-border-default bg-bg-primary/50 overflow-hidden">
      <div className="flex items-start gap-3 p-3 group">
        <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
          <FileImage size={18} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <a
            href={diagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-text-primary font-medium truncate block hover:text-accent transition-colors duration-200"
          >
            {diagram.title}
          </a>
          {diagram.diagramType && (
            <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted mt-0.5">
              {TYPE_LABELS[diagram.diagramType] ?? diagram.diagramType}
            </p>
          )}
          {diagram.description && (
            <p className="text-xs text-text-secondary mt-1 line-clamp-2">
              {diagram.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {embedUrl && (
            <button
              onClick={() => setShowPreview((p) => !p)}
              className="p-1 rounded hover:bg-bg-primary text-text-muted hover:text-accent transition-colors duration-200 cursor-pointer"
              title={showPreview ? "Hide preview" : "Show preview"}
            >
              {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          )}
          <a
            href={diagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:bg-bg-primary text-text-muted hover:text-accent transition-colors duration-200"
          >
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {showPreview && embedUrl && (
        <div className="border-t border-border-default">
          <iframe
            src={embedUrl}
            title={diagram.title}
            className="w-full bg-white rounded-b-lg"
            style={{ height: 200 }}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
      )}
    </div>
  );
}
