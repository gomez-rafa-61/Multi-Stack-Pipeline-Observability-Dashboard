import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Activity,
  ClipboardList,
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
      {
        label: "Job Registry",
        to: "/registry",
        icon: <ClipboardList size={16} />,
        exact: true,
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
    ? location.pathname === item.to
    : fullPath === item.to;

  return (
    <Link
      to={item.to}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors duration-200 ${
        isActive
          ? "bg-white/15 text-white font-medium"
          : "text-white/60 hover:bg-white/8 hover:text-white/90"
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
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-[var(--color-nav-bg)] flex flex-col z-20">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <Activity size={18} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-white tracking-tight">
          UAM Pipeline
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navigation.map((group) => (
          <div key={group.header} className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40 px-2.5 mb-2">
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
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40 px-2.5 mb-2">
              Platforms
            </p>
            <div className="flex items-center gap-2.5 px-2.5 py-2 text-white/40">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">Loading&hellip;</span>
            </div>
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
            <User size={16} className="text-white/70" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">Admin User</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-accent">
              Pro Plan
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
