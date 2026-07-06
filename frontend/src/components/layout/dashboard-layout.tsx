import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LogOut,
  Truck,
  Menu,
  X,
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
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate("/");
  };

  return (
    <div className="bg-background flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Mobile Top Bar */}
      <div className="flex items-center justify-between bg-surface border-b border-border px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="bg-primary/15 text-primary flex size-8 items-center justify-center rounded-lg">
            <Truck className="size-4" strokeWidth={2.25} />
          </div>
          <span className="text-text font-display text-md font-bold tracking-wide">
            Trip Pilot
          </span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface-elevated/60 transition-colors cursor-pointer"
          title="Open Menu"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* Sidebar Backdrop Overlay on Mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`bg-surface border-border flex w-56 shrink-0 flex-col border-r px-3 py-5 fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/15 text-primary flex size-8 items-center justify-center rounded-lg">
              <Truck className="size-4" strokeWidth={2.25} />
            </div>
            <span className="text-text font-display text-lg font-bold tracking-wide">
              Trip Pilot
            </span>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="text-text-muted hover:text-text p-1 rounded-lg hover:bg-surface-elevated/60 md:hidden cursor-pointer"
            title="Close Menu"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setIsOpen(false)}
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

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
