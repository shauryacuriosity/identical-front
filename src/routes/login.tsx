import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout, inputClass, primaryButtonClass, primaryButtonStyle } from "@/components/auth/auth-layout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect:
      typeof s.redirect === "string" && s.redirect.startsWith("/") && !isPublicRedirect(s.redirect)
        ? s.redirect
        : undefined,
  }),
  component: LoginPage,
});

function isPublicRedirect(path: string) {
  return path === "/login" || path === "/signup" || path === "/forgot-password";
}

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Signed in");
    void navigate({ to: redirectTo ?? "/" });
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access your Lotus workspace with your university or team account."
      footer={
        <>
          No account?{" "}
          <Link to="/signup" className="font-semibold text-coral hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-[13px] font-bold text-coral mb-1.5">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu.au"
            className={inputClass}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="text-[13px] font-bold text-coral">
              Password
            </label>
            <Link to="/forgot-password" className="text-[12px] font-semibold text-ink-2 hover:text-coral">
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className={primaryButtonClass}
          style={primaryButtonStyle}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
