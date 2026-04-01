import { useLocation } from "react-router-dom";
import { Search, Bell, Monitor, User, RefreshCw } from "lucide-react";
import { useRefresh } from "@/context/refresh-context";

const routeLabels: Record<string, string> = {
  "/overview": "Overview",
  "/jobs": "Job Performance",
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
    <header className="sticky top-0 h-14 bg-[var(--color-nav-bg)] border-b border-white/10 flex items-center justify-between px-5 z-10">
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-white/60">Dashboard</span>
        <span className="text-white/30">&rsaquo;</span>
        <span className="text-white font-medium">{currentLabel}</span>
      </div>

      <div className="flex items-center gap-3">
        {lastUpdated && (
          <span className="text-[11px] text-white/50 tabular-nums">
            Updated {formatRelativeTime(lastUpdated)}
          </span>
        )}

        <button
          onClick={refreshAll}
          disabled={refreshing}
          title="Refresh data"
          className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 disabled:opacity-50 transition-colors duration-200"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        </button>

        <div className="w-px h-5 bg-white/15" />

        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            type="text"
            placeholder="Search..."
            className="w-56 h-8 pl-8 pr-12 bg-white/10 border border-white/15 rounded-lg text-sm text-white placeholder:text-white/40 outline-none focus:border-accent transition-colors duration-200"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/40 bg-white/10 px-1.5 py-0.5 rounded border border-white/15">
            ⌘ K
          </kbd>
        </div>

        <button className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors duration-200">
          <Bell size={15} />
        </button>
        <button className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors duration-200">
          <Monitor size={15} />
        </button>

        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-blue-400 p-[2px]">
          <div className="w-full h-full rounded-full bg-[var(--color-nav-bg)] flex items-center justify-center">
            <User size={15} className="text-white/70" />
          </div>
        </div>
      </div>
    </header>
  );
}
