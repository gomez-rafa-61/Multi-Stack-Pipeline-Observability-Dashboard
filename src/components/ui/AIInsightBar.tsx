import { Sparkles, Settings } from "lucide-react";

interface AIInsightBarProps {
  message?: string;
}

export function AIInsightBar({
  message = "AI-powered anomaly detection is monitoring your pipelines",
}: AIInsightBarProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5" style={{ backgroundColor: "rgba(26,111,224,0.06)", border: "1px solid rgba(26,111,224,0.12)" }}>
      <Sparkles size={14} className="text-accent shrink-0" />
      <span className="text-xs text-text-secondary flex-1">{message}</span>
      <Settings size={14} className="text-text-muted shrink-0" />
    </div>
  );
}
