import { Link, Outlet, createRootRouteWithContext, useLocation, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Database, BarChart3, Sparkles, User, Check } from "lucide-react";
import { useState } from "react";
import appCss from "../styles.css?url";
import lotusMark from "@/assets/logo_lotus.png";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const tabs = [
    { to: "/datasets", label: "Datasets", icon: Database },
    { to: "/visualisation", label: "Visualisation", icon: BarChart3 },
    { to: "/ai-analysis", label: "AI Analysis", icon: Sparkles },
  ];
  const homeActive = pathname === "/";

  return (
    <header className="sticky top-0 z-30 pt-4 pb-2 px-6">
      <div className="mx-auto max-w-[1280px]">
        {/* Floating pill nav */}
        <nav
          className="relative h-12 rounded-full bg-surface flex items-center pl-4 pr-3"
          style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.25)" }}
        >
          {/* Brand cluster — acts as Home link */}
          <Link
            to="/"
            aria-label="Home"
            className={
              "relative flex items-center gap-2 px-4 h-9 my-auto rounded-2xl transition-colors " +
              (homeActive ? "text-ink" : "text-ink hover:opacity-80")
            }
            style={
              homeActive
                ? { backgroundColor: "color-mix(in oklab, var(--accent-primary) 18%, transparent)" }
                : undefined
            }
          >
            {/* Hide the lotus icon when active (coral background can wash it out) */}
            {!homeActive && <img src={lotusMark} alt="" className="h-[18px] w-auto" />}
            <span className="text-[16px] font-semibold text-ink leading-none tracking-tight">Lotus</span>
            {homeActive && (
              <span
                className="absolute left-3 right-3 bottom-1 h-[2px] rounded-full"
                style={{ backgroundColor: "var(--accent-primary)" }}
              />
            )}
          </Link>

          {/* Tabs */}
          <div className="flex items-center gap-1 h-full ml-2">
            {tabs.map((t) => {
              const active = pathname.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  aria-label={t.label}
                  className={
                    "relative h-9 px-4 my-auto flex items-center justify-center text-[15px] font-medium rounded-2xl transition-colors " +
                    (active ? "text-ink" : "text-ink hover:opacity-70")
                  }
                  style={
                    active
                      ? { backgroundColor: "color-mix(in oklab, var(--accent-primary) 18%, transparent)" }
                      : undefined
                  }
                >
                  {t.label}
                  {active && (
                    <span
                      className="absolute left-3 right-3 bottom-1 h-[2px] rounded-full"
                      style={{ backgroundColor: "var(--accent-primary)" }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            <button className="hidden sm:flex items-center text-[13px] text-ink font-medium hover:opacity-70 transition">
              UOW eAsia
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-9 w-9 rounded-full bg-surface flex items-center justify-center text-ink cursor-pointer"
                  style={{ border: "2px solid var(--accent-primary)" }}
                  aria-label="Account menu"
                >
                  <User className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-surface border-hairline">
                <DropdownMenuItem className="text-ink cursor-pointer" onSelect={() => {}}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-ink cursor-pointer"
                  onSelect={(e) => { e.preventDefault(); setSettingsOpen(true); }}
                >
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-ink cursor-pointer flex items-center justify-between"
                  onSelect={(e) => { e.preventDefault(); setDarkMode((d) => !d); }}
                >
                  <span>Dark mode</span>
                  {darkMode && <Check className="h-3.5 w-3.5 text-coral" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-hairline" />
                <DropdownMenuItem className="text-ink cursor-pointer" onSelect={() => {}}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-surface border-hairline">
          <DialogHeader>
            <DialogTitle className="text-ink">Settings</DialogTitle>
            <DialogDescription className="text-ink-2">
              Settings coming soon. Account, preferences, and workspace options will live here.
            </DialogDescription>
          </DialogHeader>
          <div className="text-[13px] text-ink-2 pt-2">
            Nothing to configure yet.
          </div>
        </DialogContent>
      </Dialog>
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
