import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { RefreshProvider } from "@/context/refresh-context";

export function DashboardLayout() {
  return (
    <RefreshProvider>
      <div className="min-h-screen bg-bg-primary">
        <Sidebar />
        <div className="ml-56">
          <Header />
          <main className="p-5">
            <Outlet />
          </main>
        </div>
      </div>
    </RefreshProvider>
  );
}
