import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Overview } from "@/pages/Overview";
import { JobPerformance } from "@/pages/JobPerformance";

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/jobs" element={<JobPerformance />} />
      </Route>
    </Routes>
  );
}
