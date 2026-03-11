import type { PipelineStatus } from "@/types/pipeline";

const styles: Record<PipelineStatus, { bg: string; text: string; border: string }> = {
  SUCCESS: {
    bg: "rgba(74,222,128,0.1)",
    text: "var(--color-success)",
    border: "rgba(74,222,128,0.2)",
  },
  FAILED: {
    bg: "rgba(248,113,113,0.1)",
    text: "var(--color-danger)",
    border: "rgba(248,113,113,0.2)",
  },
  CANCELLED: {
    bg: "rgba(251,191,36,0.1)",
    text: "var(--color-warning)",
    border: "rgba(251,191,36,0.2)",
  },
};

export function StatusBadge({ status }: { status: PipelineStatus }) {
  const s = styles[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase"
      style={{
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: s.text }}
      />
      {status}
    </span>
  );
}
