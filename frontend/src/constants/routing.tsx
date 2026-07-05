import { LayoutDashboard, Route, User } from "lucide-react";

export const navItems = [
  { to: "/dashboard/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/dashboard/trips/", label: "Trips", icon: Route, end: false },
  { to: "/dashboard/profile/", label: "Profile", icon: User, end: false },
] as const;
