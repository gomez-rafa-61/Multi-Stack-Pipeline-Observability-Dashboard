import { useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "@/services/api-client";

const SEMANTIC_OPTIONS = [
  {
    value: "PRD_EDW_STG.UAM_MONITORING.SV_PIPELINE_EVENT_ANALYTICS",
    label: "Pipeline events",
  },
  {
    value: "PRD_EDW_STG.UAM_MONITORING.SV_CYCLE_ANALYTICS",
    label: "Cycle analytics",
  },
  {
    value: "PRD_EDW_STG.UAM_MONITORING.SV_PIPELINE_OBSERVABILITY",
    label: "Unified observability",
  },
] as const;

type SemanticViewId = (typeof SEMANTIC_OPTIONS)[number]["value"];

export function CortexAnalystPanel() {
  const [question, setQuestion] = useState("");
  const [semanticView, setSemanticView] = useState<SemanticViewId>(
    SEMANTIC_OPTIONS[0].value,
  );
  const [loading, setLoading] = useState(false);
  const [responseJson, setResponseJson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setResponseJson(null);
    try {
      const data = await api.postCortexAnalystMessage(question.trim(), semanticView);
      setResponseJson(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[14px] border border-border-default bg-bg-surface p-4 space-y-3 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
        <Sparkles size={16} className="text-accent" />
        Cortex Analyst
      </div>
      <p className="text-xs text-text-muted">
        Ask questions in natural language using the same semantic views as Snowsight. The
        API must be configured with OAuth (Azure AD) or a Snowflake programmatic access
        token (PAT).
      </p>
      <form onSubmit={onSubmit} className="space-y-2">
        <select
          value={semanticView}
          onChange={(e) =>
            setSemanticView(e.target.value as SemanticViewId)
          }
          className="w-full h-9 px-3 bg-bg-primary border border-border-default rounded-lg text-xs text-text-primary outline-none focus:border-accent transition-colors duration-200"
        >
          {SEMANTIC_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about pipeline health, trends, or failures..."
          rows={3}
          className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 resize-y min-h-[72px] transition-all duration-200"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all duration-200 cursor-pointer"
        >
          {loading ? "Asking..." : "Ask Cortex Analyst"}
        </button>
      </form>
      {error && (
        <pre className="text-xs text-danger whitespace-pre-wrap break-words">
          {error}
        </pre>
      )}
      {responseJson && (
        <pre className="text-xs text-text-secondary overflow-x-auto max-h-80 p-3 rounded-lg bg-bg-primary border border-border-default font-mono">
          {responseJson}
        </pre>
      )}
    </section>
  );
}
