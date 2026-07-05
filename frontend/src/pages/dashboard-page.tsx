import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/use-auth";

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-surface border-border flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-text font-display text-xl font-bold tracking-wide uppercase">
          Dashboard
        </h1>
        <button
          type="button"
          onClick={handleLogout}
          className="text-text-muted font-body hover:text-text border-border rounded-md border px-3 py-1.5 text-sm transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="px-6 py-8">
        <div className="bg-surface border-border rounded-lg border p-6">
          <p className="text-text-muted font-body text-sm">Welcome back,</p>
          <p className="text-text font-body mt-1 text-lg font-semibold">
            {user?.username ?? user?.email}
          </p>
          <p className="text-text-subtle font-body mt-1 text-sm">{user?.email}</p>
        </div>
      </main>
    </div>
  );
}
