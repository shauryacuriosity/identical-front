import { Link, Outlet, createRootRouteWithContext, useLocation, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Home, User } from "lucide-react";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "eAsia App" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" },
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
        <button onClick={() => { router.invalidate(); reset(); }}>Retry</button>
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

function TopBar() {
  const { pathname } = useLocation();
  const tabs = [
    { to: "/datasets", label: "Datasets" },
    { to: "/visualisation", label: "Visualisation" },
    { to: "/ai-analysis", label: "AI Analysis" },
  ];
  return (
    <header className="relative px-6 pt-5 pb-4">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 text-sm font-semibold text-foreground/90">eAsia App</div>
      <div className="flex items-end justify-between gap-3 mt-6">
        <div className="flex items-end gap-2">
          <Link
            to="/"
            className={`flex h-14 w-14 items-center justify-center rounded-t-2xl rounded-b-md transition-all ${
              pathname === "/" ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]" : "text-foreground hover:bg-card/60"
            }`}
            aria-label="Home"
          >
            <Home className="h-6 w-6" strokeWidth={2.25} />
          </Link>
          <nav className="flex items-end gap-1 ml-2">
            {tabs.map((t) => {
              const active = pathname === t.to;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`px-6 h-12 flex items-center rounded-t-2xl text-base font-semibold transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                      : "text-foreground hover:bg-card/50"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          className="h-11 w-11 rounded-full border border-foreground/30 flex items-center justify-center text-foreground hover:bg-card/60 transition"
          aria-label="Profile"
        >
          <User className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <TopBar />
        <main className="flex-1 px-6 pb-8">
          <Outlet />
        </main>
      </div>
    </QueryClientProvider>
  );
}
