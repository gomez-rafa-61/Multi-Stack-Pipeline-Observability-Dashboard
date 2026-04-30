import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Overview } from "@/pages/Overview";
import { JobPerformance } from "@/pages/JobPerformance";
import { JobRegistry } from "@/pages/JobRegistry";
import { CurrentActivities } from "@/pages/JobStatus";
import { CatalogPortal } from "@/pages/CatalogPortal";

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/catalog" element={<CatalogPortal />} />
        <Route path="/jobs" element={<JobPerformance />} />
        <Route path="/job-status" element={<CurrentActivities />} />
        <Route path="/registry" element={<JobRegistry />} />
      </Route>
    </Routes>
  );
}
