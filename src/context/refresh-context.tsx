import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface RefreshState {
  lastUpdated: Date | null;
  refreshing: boolean;
  /** Pages register their refresh callbacks here. */
  register: (key: string, fn: () => Promise<void>) => void;
  unregister: (key: string) => void;
  /** Calls all registered refresh functions. */
  refreshAll: () => Promise<void>;
  /** Called by pages when they finish fetching. */
  reportUpdate: (timestamp: Date) => void;
}

const RefreshContext = createContext<RefreshState | null>(null);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [callbacks] = useState(() => new Map<string, () => Promise<void>>());

  const register = useCallback(
    (key: string, fn: () => Promise<void>) => {
      callbacks.set(key, fn);
    },
    [callbacks],
  );

  const unregister = useCallback(
    (key: string) => {
      callbacks.delete(key);
    },
    [callbacks],
  );

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([...callbacks.values()].map((fn) => fn()));
    } finally {
      setRefreshing(false);
    }
  }, [callbacks]);

  const reportUpdate = useCallback((timestamp: Date) => {
    setLastUpdated(timestamp);
  }, []);

  return (
    <RefreshContext.Provider
      value={{ lastUpdated, refreshing, register, unregister, refreshAll, reportUpdate }}
    >
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const ctx = useContext(RefreshContext);
  if (!ctx) throw new Error("useRefresh must be used inside RefreshProvider");
  return ctx;
}
