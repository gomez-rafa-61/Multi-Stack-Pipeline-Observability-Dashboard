import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Activity,
  User,
  Loader2,
} from "lucide-react";
import { api } from "@/services/api-client";
import { getPlatformMeta } from "@/config/platform-meta";

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  exact?: boolean;
}

interface NavGroup {
  header: string;
  items: NavItem[];
}

const staticNavigation: NavGroup[] = [
  {
    header: "Main Menu",
    items: [
      {
        label: "Overview",
        to: "/overview",
        icon: <LayoutDashboard size={16} />,
        exact: true,
      },
    ],
  },
  {
    header: "Analytics",
    items: [
      {
        label: "Job Performance",
        to: "/jobs",
        icon: <Briefcase size={16} />,
        exact: true,
      },
      {
        label: "Cycle Monitor",
        to: "/overview#cycles",
        icon: <Activity size={16} />,
      },
    ],
  },
];

function buildPlatformGroup(platforms: string[]): NavGroup {
  return {
    header: "Platforms",
    items: platforms.map((key) => {
      const meta = getPlatformMeta(key);
      const Icon = meta.icon;
      return {
        label: meta.displayName,
        to: `/jobs?platform=${key}`,
        icon: <Icon size={16} />,
      };
    }),
  };
}

function SidebarLink({ item }: { item: NavItem }) {
  const location = useLocation();
  const fullPath = location.pathname + location.search + location.hash;

  const isActive = item.exact
    ? location.pathname === item.to && !location.search
    : fullPath === item.to;

  return (
    <Link
      to={item.to}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors duration-200 ${
        isActive
          ? "bg-accent-muted text-accent"
          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      }`}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getPlatforms()
      .then(setPlatforms)
      .finally(() => setLoading(false));
  }, []);

  const navigation: NavGroup[] = [
    ...staticNavigation,
    ...(platforms.length ? [buildPlatformGroup(platforms)] : []),
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-bg-surface border-r border-border-elevated flex flex-col z-20">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border-elevated">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <Activity size={18} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-text-primary tracking-tight">
          UAM Pipeline
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navigation.map((group) => (
          <div key={group.header} className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted px-2.5 mb-2">
              {group.header}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.label}>
                  <SidebarLink item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        {loading && (
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted px-2.5 mb-2">
              Platforms
            </p>
            <div className="flex items-center gap-2.5 px-2.5 py-2 text-text-muted">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">Loading&hellip;</span>
            </div>
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-border-elevated">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <div className="w-9 h-9 rounded-full bg-border-elevated flex items-center justify-center">
            <User size={16} className="text-text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary truncate">Admin User</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-accent">
              Pro Plan
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
