import { useLocation } from "react-router-dom";
import { Search, Bell, Monitor, User, RefreshCw } from "lucide-react";
import { useRefresh } from "@/context/refresh-context";

const routeLabels: Record<string, string> = {
  "/overview": "Overview",
  "/catalog": "Catalog",
  "/jobs": "Job Performance",
  "/job-status": "Job Status",
  "/registry": "Job Registry",
};

function formatRelativeTime(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

export function Header() {
  const location = useLocation();
  const currentLabel = routeLabels[location.pathname] ?? "Dashboard";
  const { lastUpdated, refreshing, refreshAll } = useRefresh();

  return (
    <header className="sticky top-0 h-14 bg-nav-bg border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between px-5 z-10">
      <div className="flex items-center gap-1.5 text-sm tracking-[-0.01em]">
        <span className="text-white/40">Dashboard</span>
        <span className="text-white/25">&rsaquo;</span>
        <span className="text-white font-medium">{currentLabel}</span>
      </div>

      <div className="flex items-center gap-3">
        {lastUpdated && (
          <span className="text-[11px] text-white/35 font-mono tabular-nums">
            Updated {formatRelativeTime(lastUpdated)}
          </span>
        )}

        <button
          onClick={refreshAll}
          disabled={refreshing}
          title="Refresh data"
          className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/[0.1] active:scale-[0.98] disabled:opacity-50 transition-all duration-200 cursor-pointer"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        </button>

        <div className="w-px h-5 bg-white/[0.08]" />

        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
          />
          <input
            type="text"
            placeholder="Search..."
            className="w-56 h-8 pl-8 pr-12 bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/30 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-all duration-200"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.08]">
            ⌘ K
          </kbd>
        </div>

        <button className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/[0.1] active:scale-[0.98] transition-all duration-200 cursor-pointer">
          <Bell size={15} />
        </button>
        <button className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/[0.1] active:scale-[0.98] transition-all duration-200 cursor-pointer">
          <Monitor size={15} />
        </button>

        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-blue-400 p-[2px]">
          <div className="w-full h-full rounded-full bg-nav-bg flex items-center justify-center">
            <User size={15} className="text-white/50" />
          </div>
        </div>
      </div>
    </header>
  );
}
