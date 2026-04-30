import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import type { PipelineStatus } from "@/types/pipeline";

const styles: Record<PipelineStatus, { bg: string; text: string; border: string; icon: typeof CheckCircle2 }> = {
  SUCCESS: {
    bg: "rgba(22,163,74,0.08)",
    text: "#16A34A",
    border: "rgba(22,163,74,0.2)",
    icon: CheckCircle2,
  },
  FAILED: {
    bg: "rgba(220,38,38,0.08)",
    text: "#DC2626",
    border: "rgba(220,38,38,0.2)",
    icon: XCircle,
  },
  CANCELLED: {
    bg: "rgba(217,119,6,0.08)",
    text: "#D97706",
    border: "rgba(217,119,6,0.2)",
    icon: MinusCircle,
  },
};

export function StatusBadge({ status }: { status: PipelineStatus }) {
  const s = styles[status];
  const Icon = s.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.02em]"
      style={{
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
      }}
    >
      <Icon size={12} />
      {status}
    </span>
  );
}
