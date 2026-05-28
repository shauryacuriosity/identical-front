import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import lotusMark from "@/assets/logo_lotus.png";

const inputClass =
  "w-full h-11 px-3 rounded-lg bg-surface border border-hairline text-ink text-[14px] placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-coral/40";

const primaryButtonClass =
  "w-full h-11 rounded-lg text-white text-[14px] font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-opacity";

const primaryButtonStyle = { background: "linear-gradient(180deg, #E8928E 0%, #C49090 100%)" };

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-canvas">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center gap-2.5 text-ink">
            <img src={lotusMark} alt="" className="h-7 w-auto" />
            <span className="text-[22px] font-bold tracking-tight">Lotus</span>
          </Link>
          <p className="mt-2 text-[13px] text-ink-2 font-medium">Public health data workbench</p>
        </div>

        <div
          className="rounded-2xl bg-surface border border-hairline p-8"
          style={{ boxShadow: "var(--shadow-depth)" }}
        >
          <h1 className="text-[20px] font-bold text-ink tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-1.5 text-[14px] text-ink-2 leading-relaxed">{subtitle}</p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>

        {footer ? <div className="mt-6 text-center text-[14px] text-ink-2">{footer}</div> : null}
      </div>
    </div>
  );
}

export { inputClass, primaryButtonClass, primaryButtonStyle };
