import { useState, type FormEvent } from "react";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../hooks/use-auth";
import { getApiErrorMessage } from "../network/api-client";
import type { UpdateProfilePayload, User } from "../types/auth";
import { ProfileField } from "../components/shared/profile-field";

const inputClassName =
  "bg-surface-elevated border-border text-text font-body w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-primary";

function toFormState(user: User): UpdateProfilePayload {
  return {
    email: user.email,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
  };
}

export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<UpdateProfilePayload>({
    email: "",
    username: "",
    first_name: "",
    last_name: "",
  });

  if (!user) {
    return null;
  }

  const handleEdit = () => {
    setForm(toFormState(user));
    setIsEditing(true);
  };

  const handleCancel = () => {
    setForm(toFormState(user));
    setIsEditing(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await updateProfile(form);
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-text font-display text-3xl font-bold tracking-wide">
            Profile
          </h1>
          <p className="text-text-muted font-body mt-1 text-sm">
            Manage your account details
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={handleEdit}
            className="text-text border-border hover:bg-surface-elevated font-body flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors"
          >
            <Pencil className="size-4" strokeWidth={1.75} />
            Edit profile
          </button>
        )}
      </div>

      <div className="bg-surface border-border rounded-lg border p-6">
        {!isEditing ? (
          <div className="flex flex-col gap-6">
            <div className="border-border border-b pb-6">
              <p className="text-text-muted font-body text-sm">Display name</p>
              <p className="text-text font-body mt-1 text-xl font-semibold">
                {fullName || user.username}
              </p>
              <p className="text-text-subtle font-body mt-1 text-sm">{user.email}</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <ProfileField label="First name" value={user.first_name} />
              <ProfileField label="Last name" value={user.last_name} />
              <ProfileField label="Username" value={user.username} />
              <ProfileField label="Email" value={user.email} />
            </div>

          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-first-name" className="text-text-muted font-body text-sm">
                  First name
                </label>
                <input
                  id="profile-first-name"
                  type="text"
                  autoComplete="given-name"
                  value={form.first_name}
                  onChange={(e) => setForm((current) => ({ ...current, first_name: e.target.value }))}
                  className={inputClassName}
                  placeholder="John"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-last-name" className="text-text-muted font-body text-sm">
                  Last name
                </label>
                <input
                  id="profile-last-name"
                  type="text"
                  autoComplete="family-name"
                  value={form.last_name}
                  onChange={(e) => setForm((current) => ({ ...current, last_name: e.target.value }))}
                  className={inputClassName}
                  placeholder="Doe"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-username" className="text-text-muted font-body text-sm">
                  Username
                </label>
                <input
                  id="profile-username"
                  type="text"
                  required
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) => setForm((current) => ({ ...current, username: e.target.value }))}
                  className={inputClassName}
                  placeholder="johndoe"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-email" className="text-text-muted font-body text-sm">
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                  className={inputClassName}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="border-border flex items-center justify-end gap-3 border-t pt-6">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="text-text-muted hover:text-text font-body flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <X className="size-4" strokeWidth={1.75} />
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground font-body rounded-md px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
