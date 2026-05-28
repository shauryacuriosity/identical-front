import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout, inputClass, primaryButtonClass, primaryButtonStyle } from "@/components/auth/auth-layout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSent(true);
    toast.success("Password reset email sent");
  };

  return (
    <AuthLayout
      title="Reset password"
      subtitle="We will email you a link to choose a new password."
      footer={
        <Link to="/login" className="font-semibold text-coral hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p className="text-[14px] text-ink-2 leading-relaxed">
          If an account exists for <span className="font-semibold text-ink">{email}</span>, check your inbox for
          reset instructions.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="block text-[13px] font-bold text-coral mb-1.5">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu.au"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className={primaryButtonClass}
            style={primaryButtonStyle}
          >
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
