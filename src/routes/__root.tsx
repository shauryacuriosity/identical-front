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
      <div className="mx-auto max-w-[1280px]">
        {/* Floating pill nav */}
        <nav
          className="relative h-12 rounded-full bg-surface flex items-center pl-4 pr-3"
          style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.25)" }}
        >
          {/* Brand cluster */}
          <div className="flex items-center gap-2 pr-5">
            <img src={lotusMark} alt="" className="h-[18px] w-auto" />
            <span className="text-[16px] font-semibold text-ink leading-none tracking-tight">Lotus</span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 h-full">
            {tabs.map((t) => {
              const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
              const Icon = t.icon;
              if (active) {
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    className="relative h-12 w-16 flex items-start justify-center"
                    aria-label={t.label}
                  >
                    <span
                      className="absolute left-0 right-0 top-0 -bottom-3.5 flex items-start justify-center pt-[11px]"
                      style={{
                        backgroundColor: "var(--accent-primary)",
                        borderRadius: "2px 2px 16px 16px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
                      }}
                    >
                      <Icon className="h-[18px] w-[18px] text-white" strokeWidth={2} />
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
