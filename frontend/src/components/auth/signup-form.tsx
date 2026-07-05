import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../network/api-client";
import { useAuth } from "../../hooks/use-auth";

export function SignupForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setIsSubmitting(true);

    try {
      await signup({
        email,
        username,
        password,
        confirm_password: confirmPassword,
      });
      toast.success("Account created successfully");
      navigate("/dashboard/");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-email" className="text-text-muted font-body text-sm">
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-surface-elevated border-border text-text font-body rounded-md border px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-username" className="text-text-muted font-body text-sm">
          Username
        </label>
        <input
          id="signup-username"
          type="text"
          required
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="bg-surface-elevated border-border text-text font-body rounded-md border px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="yourname"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-password" className="text-text-muted font-body text-sm">
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-surface-elevated border-border text-text font-body rounded-md border px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="••••••••"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="signup-confirm-password"
          className="text-text-muted font-body text-sm"
        >
          Confirm password
        </label>
        <input
          id="signup-confirm-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="bg-surface-elevated border-border text-text font-body rounded-md border px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground font-body mt-1 rounded-md px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>

      <p className="text-text-muted font-body text-center text-sm">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-secondary hover:underline"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
