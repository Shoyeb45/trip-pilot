import { useState } from "react";
import { Navigate } from "react-router-dom";
import { LoginForm } from "../components/auth/login-form";
import { SignupForm } from "../components/auth/signup-form";
import { useAuth } from "../hooks/use-auth";

export function AuthPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-text-muted font-body text-sm">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard/" replace />;
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="bg-surface border-border w-full max-w-md rounded-lg border p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-text font-display text-2xl font-bold tracking-wide uppercase">
            ELD Log Generator
          </h1>
          <p className="text-text-muted font-body mt-1 text-sm">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        {mode === "login" ? (
          <LoginForm onSwitchToSignup={() => setMode("signup")} />
        ) : (
          <SignupForm onSwitchToLogin={() => setMode("login")} />
        )}
      </div>
    </div>
  );
}
