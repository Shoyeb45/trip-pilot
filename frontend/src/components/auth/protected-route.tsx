import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/use-auth";

export function ProtectedRoute() {
  return <Outlet />;
}
