import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LogOut,
  Truck,
} from "lucide-react";
import { useAuth } from "../../hooks/use-auth";
import { navItems } from "../../constants/routing";


function navLinkClass(isActive: boolean) {
  return [
    "font-body flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-surface-elevated text-text"
      : "text-text-muted hover:bg-surface-elevated/60 hover:text-text",
  ].join(" ");
}

export function DashboardLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="bg-background flex min-h-screen">
      <aside className="bg-surface border-border flex w-56 shrink-0 flex-col border-r px-3 py-5">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="bg-primary/15 text-primary flex size-8 items-center justify-center rounded-lg">
            <Truck className="size-4" strokeWidth={2.25} />
          </div>
          <span className="text-text font-display text-lg font-bold tracking-wide">
            Trip Pilot
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Icon className="size-4.5 shrink-0" strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="text-text-muted hover:bg-surface-elevated/60 hover:text-text font-body mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
        >
          <LogOut className="size-4.5 shrink-0" strokeWidth={1.75} />
          Log out
        </button>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
