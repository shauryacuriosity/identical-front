import { Link, Outlet, createRootRouteWithContext, useLocation, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Home, Database, BarChart3, Sparkles, User } from "lucide-react";
import appCss from "../styles.css?url";
import lotusMark from "@/assets/logo_lotus.png";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lotus — Public health data workbench" },
      { name: "description", content: "Join, aggregate, and analyse public health datasets." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" },
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
    { to: "/", label: "Home", icon: Home },
    { to: "/datasets", label: "Datasets", icon: Database },
    { to: "/visualisation", label: "Visualisation", icon: BarChart3 },
    { to: "/ai-analysis", label: "AI Analysis", icon: Sparkles },
  ];
  return (
    <header className="sticky top-0 z-30 pt-4 pb-2 px-6">
      <div className="mx-auto max-w-[1280px] flex items-start gap-4">
        {/* Wordmark */}
        <div className="hidden md:block pt-2.5 pr-2">
          <span className="text-[14px] font-semibold text-ink leading-none tracking-tight">Lotus</span>
        </div>

        {/* Floating pill nav */}
        <nav
          className="relative flex-1 h-12 rounded-full bg-surface flex items-center pl-2 pr-3"
          style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.25)" }}
        >
          <div className="flex items-center gap-1 h-full">
            {tabs.map((t) => {
              const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
              const Icon = t.icon;
              if (active) {
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    className="relative h-12 w-12 flex items-center justify-center"
                    aria-label={t.label}
                  >
                    <span
                      className="absolute left-1/2 -translate-x-1/2 -bottom-3 h-14 w-14 rounded-2xl flex items-start justify-center pt-2.5"
                      style={{
                        backgroundColor: "var(--accent-primary)",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
                      }}
                    >
                      <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                    </span>
                  </Link>
                );
              }
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className="h-12 px-4 flex items-center text-[15px] font-medium text-ink hover:opacity-70 transition-opacity"
                >
                  {t.label}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            <button className="hidden sm:flex items-center text-[13px] text-ink font-medium hover:opacity-70 transition">
              UOW eAsia
            </button>
            <button
              className="h-9 w-9 rounded-full bg-surface flex items-center justify-center text-ink"
              style={{ border: "2px solid var(--accent-primary)" }}
              aria-label="Profile"
            >
              <User className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </nav>
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
        <main className="flex-1 pt-4">
          <Outlet />
        </main>
      </div>
    </QueryClientProvider>
  );
}
