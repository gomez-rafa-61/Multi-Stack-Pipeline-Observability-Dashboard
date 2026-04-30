import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Activity,
  ClipboardList,
  ListChecks,
  BookOpen,
  User,
  Loader2,
} from "lucide-react";
import { api } from "@/services/api-client";
import { getPlatformMeta } from "@/config/platform-meta";

interface NavItem {
  label: string;
  to: string;
  icon?: React.ReactNode;
  exact?: boolean;
  platformKey?: string;
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
      {
        label: "Catalog",
        to: "/catalog",
        icon: <BookOpen size={16} />,
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
        label: "Current Activities",
        to: "/job-status",
        icon: <ListChecks size={16} />,
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
    items: platforms.map((key) => ({
      label: key,
      to: `/jobs?platform=${key}`,
      platformKey: key,
    })),
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
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-200 min-w-0 ${
        isActive
          ? "bg-nav-active-bg text-nav-active-text font-medium border-l-2 border-nav-active-text -ml-px"
          : "text-nav-muted hover:bg-nav-hover-bg hover:text-nav-text"
      }`}
    >
      {item.platformKey ? (
        (() => {
          const meta = getPlatformMeta(item.platformKey);
          const Icon = meta.icon;
          return (
            <>
              <Icon size={16} />
              {meta.displayName}
            </>
          );
        })()
      ) : (
        <>
          {item.icon}
          {item.label}
        </>
      )}
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
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-nav-bg border-r border-[rgba(255,255,255,0.08)] flex flex-col z-20">
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-[rgba(255,255,255,0.08)]">
        <img
          src="/curaleaf-icon.png"
          alt="Curaleaf icon"
          className="h-7 w-7 object-contain brightness-0 invert"
        />
        <div className="flex flex-col leading-none min-w-0">
          <img
            src="/curaleaf-wordmark.png"
            alt="Curaleaf"
            className="h-4 object-contain object-left brightness-0 invert"
          />
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">
            UAM
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navigation.map((group) => (
          <div key={group.header} className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-nav-muted/60 px-2.5 mb-2">
              {group.header}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.platformKey ?? item.to}>
                  <SidebarLink item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        {loading && (
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-nav-muted/60 px-2.5 mb-2">
              Platforms
            </p>
            <div className="flex items-center gap-2.5 px-2.5 py-2 text-nav-muted">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">Loading&hellip;</span>
            </div>
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <div className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.08)] flex items-center justify-center">
            <User size={16} className="text-nav-muted" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-nav-text truncate">Admin User</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-nav-active-text">
              Pro Plan
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
