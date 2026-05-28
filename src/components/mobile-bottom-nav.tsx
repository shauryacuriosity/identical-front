import { Link, useLocation } from "@tanstack/react-router";
import { Home, FilePlus, Shapes, Codesandbox } from "lucide-react";

const tabs = [
  { to: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  {
    to: "/datasets",
    label: "Datasets",
    icon: FilePlus,
    match: (p: string) => p.startsWith("/datasets"),
  },
  {
    to: "/visualisation",
    label: "Charts",
    icon: Shapes,
    match: (p: string) => p.startsWith("/visualisation"),
  },
  {
    to: "/ai-analysis",
    label: "AI",
    icon: Codesandbox,
    match: (p: string) => p.startsWith("/ai-analysis"),
  },
] as const;

export function MobileBottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-hairline bg-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)]"
      aria-label="Primary navigation"
    >
      <div className="grid grid-cols-4 h-14 max-w-lg mx-auto">
        {tabs.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              aria-label={t.label}
              aria-current={active ? "page" : undefined}
              className={
                "flex flex-col items-center justify-center gap-0.5 min-h-11 text-[10px] font-semibold transition-colors " +
                (active ? "text-ink" : "text-ink-2 hover:text-ink")
              }
            >
              <span
                className={
                  "flex h-9 w-9 items-center justify-center rounded-full " +
                  (active ? "bg-coral text-ink" : "")
                }
              >
                <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
              </span>
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
