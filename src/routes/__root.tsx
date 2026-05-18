import { Link, Outlet, createRootRouteWithContext, useLocation, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { User, ChevronDown } from "lucide-react";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "eAsia — Public health data workbench" },
      { name: "description", content: "Join, aggregate, and analyse public health datasets." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center"><p>404</p></div>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-3">
        <p>{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="text-coral underline">Retry</button>
      </div>
    );
  },
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function AppHeader() {
  const { pathname } = useLocation();
  const tabs = [
    { to: "/", label: "Home" },
    { to: "/datasets", label: "Datasets" },
    { to: "/visualisation", label: "Visualisation" },
    { to: "/ai-analysis", label: "AI Analysis" },
  ];
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-canvas/80 border-b border-hairline">
      <div className="mx-auto max-w-[1280px] h-14 px-6 flex items-center justify-between">
        {/* Wordmark */}
        <Link to="/" className="flex items-baseline gap-2 group">
          <span className="text-[22px] font-semibold text-ink leading-none" style={{ letterSpacing: "-0.02em" }}>
            eAsia
          </span>
          <span className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-medium">workbench</span>
        </Link>

        {/* Center tabs */}
        <nav className="flex items-center gap-1 h-full">
          {tabs.map((t) => {
            const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className="relative h-14 px-4 flex items-center text-[13.5px] font-medium transition-colors"
              >
                <span className={active ? "text-ink" : "text-ink-2 hover:text-ink"}>{t.label}</span>
                {active && (
                  <span className="absolute left-3 right-3 bottom-0 h-[2px] bg-coral rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: workspace + profile */}
        <div className="flex items-center gap-2">
          <button className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12.5px] text-ink-2 hover:bg-surface-hover hover:text-ink transition">
            <span className="h-4 w-4 rounded-[4px] bg-coral/15 border border-coral/30" />
            UOW Capstone
            <ChevronDown className="h-3.5 w-3.5 text-ink-3" />
          </button>
          <div className="h-5 w-px bg-hairline mx-1" />
          <button className="h-8 w-8 rounded-full bg-surface border border-hairline flex items-center justify-center text-ink-2 hover:text-ink hover:border-coral/40 transition" aria-label="Profile">
            <User className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </QueryClientProvider>
  );
}
