import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/protected-route";
import { DashboardLayout } from "../components/layout/dashboard-layout";
import { AuthPage } from "../pages/auth-page";
import { PagePlaceholder } from "../pages/page-placeholder";
import { ProfilePage } from "../pages/profile-page";
import { TripDetailPage } from "../pages/trip-detail-page";
import { TripsPage } from "../pages/trips-page";

export const MainApp = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard/" element={<PagePlaceholder />} />
            <Route path="/dashboard/trips/" element={<TripsPage />} />
            <Route path="/dashboard/trips/:tripId" element={<TripDetailPage />} />
            <Route path="/dashboard/profile/" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
