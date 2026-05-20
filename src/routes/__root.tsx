import { Link, Outlet, createRootRouteWithContext, useLocation, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { User, X, ExternalLink } from "lucide-react";
import { FilePlusIcon, ShapesIcon, CodesandboxIcon } from "@/components/brand-icons";
import * as React from "react";
import { useEffect, useState } from "react";
import appCss from "../styles.css?url";
import lotusMark from "@/assets/logo_lotus.png";
import { LotusMarkActive } from "@/components/lotus-mark-active";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";

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
  const [activeSection, setActiveSection] = useState<"general" | "security" | "linked" | "team">("general");
  const [profile, setProfile] = useState({
    name: "Jane Citizen",
    email: "jane.citizen123@email.com",
    institution: "eAsia",
    country: "Australia",
  });

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("lotus-theme") : null;
    const on = stored === "dark";
    setDarkMode(on);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", on);
    }
  }, []);

  const toggleDark = (next: boolean) => {
    setDarkMode(next);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("lotus-theme", next ? "dark" : "light");
    }
  };
  const tabs = [
    { to: "/datasets", label: "Datasets", icon: FilePlusIcon },
    { to: "/visualisation", label: "Visualisation", icon: ShapesIcon },
    { to: "/ai-analysis", label: "AI Analysis", icon: CodesandboxIcon },
  ];
  const homeActive = pathname === "/";

  return (
    <header className="sticky top-0 z-30 pt-4 pb-2 px-6">
      <div className="mx-auto max-w-[1280px]">
        {/* Floating pill nav */}
        <nav
          className="relative h-14 rounded-full bg-surface flex items-center pl-5 pr-3 border border-hairline"
          style={{ boxShadow: "var(--shadow-depth)" }}
        >
          {/* Brand cluster — acts as Home link */}
          <Link
            to="/"
            aria-label="Home"
            className={
              "flex items-center gap-2 px-3 h-10 my-auto rounded-full transition-colors text-ink " +
              (homeActive ? "bg-coral" : "hover:bg-highlight/50")
            }
          >
            {homeActive ? (
              <LotusMarkActive className="h-[18px] w-auto text-ink" />
            ) : (
              <img src={lotusMark} alt="" className="h-[18px] w-auto" />
            )}
            <span className="text-[16px] font-semibold text-ink leading-none tracking-tight">Lotus</span>
          </Link>

          {/* Divider */}
          <span className="mx-3 h-6 w-px bg-hairline" />

          {/* Tabs */}
          <div className="flex items-center gap-1 h-full">
            {tabs.map((t) => {
              const active = pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  aria-label={t.label}
                  className={
                    "h-10 px-4 my-auto flex items-center gap-2 text-[14px] font-semibold tracking-tight rounded-full transition-colors text-ink " +
                    (active ? "bg-coral" : "hover:bg-highlight/50")
                  }
                >
                  <Icon size={18} strokeWidth={2.5} />
                  {t.label}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            <button className="hidden sm:flex items-center text-[13px] text-ink-2 font-medium hover:text-ink transition">
              UOW eAsia
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-10 w-10 rounded-full bg-surface flex items-center justify-center text-ink cursor-pointer border border-hairline-strong hover:bg-surface-hover/40 transition-colors"
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
                  className="text-ink cursor-pointer flex items-center justify-between gap-3"
                  onSelect={(e) => e.preventDefault()}
                >
                  <span>Dark mode</span>
                  <Switch
                    checked={darkMode}
                    onCheckedChange={toggleDark}
                    className="data-[state=checked]:bg-coral data-[state=unchecked]:bg-coral-muted/40"
                  />
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

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        profile={profile}
        setProfile={setProfile}
      />
    </header>
  );
}

type SettingsSection = "general" | "security" | "linked" | "team";
type ProfileState = { name: string; email: string; institution: string; country: string };

function SettingsDialog({
  open,
  onOpenChange,
  activeSection,
  setActiveSection,
  profile,
  setProfile,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  activeSection: SettingsSection;
  setActiveSection: (s: SettingsSection) => void;
  profile: ProfileState;
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>;
}) {
  const sections: { id: SettingsSection; label: string }[] = [
    { id: "general", label: "General" },
    { id: "security", label: "Security" },
    { id: "linked", label: "Linked Accounts" },
    { id: "team", label: "Team Management" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-hairline p-0 max-w-[880px] w-[92vw] rounded-2xl overflow-hidden [&>button]:hidden">
        <div className="grid grid-cols-[220px_1fr] min-h-[560px]">
          {/* Left rail */}
          <aside className="bg-coral/90 p-5 flex flex-col gap-2">
            <div className="px-3 py-3 mb-2">
              <h2 className="text-[18px] font-bold text-white tracking-tight">Edit Profile</h2>
            </div>
            {sections.map((s) => {
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={
                    "text-left px-4 py-3 rounded-lg text-[15px] font-semibold transition-colors " +
                    (active ? "bg-surface text-ink shadow-sm" : "text-white hover:bg-white/15")
                  }
                >
                  {s.label}
                </button>
              );
            })}
          </aside>

          {/* Right pane */}
          <div className="bg-surface relative flex flex-col">
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="absolute right-4 top-4 h-7 w-7 rounded-full flex items-center justify-center text-ink-2 hover:bg-surface-hover/40 hover:text-ink transition"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header strip */}
            <div className="px-8 pt-8 pb-6 flex items-start gap-5">
              <div className="flex flex-col items-center">
                <div className="h-20 w-20 rounded-full bg-surface border-2 border-coral" />
                <button className="mt-1 text-[11px] text-coral font-medium hover:underline">
                  Replace image
                </button>
              </div>
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-2 text-[18px] text-ink">
                  <span className="font-bold">{profile.name}</span>
                  <span className="text-ink-2">·</span>
                  <span className="font-medium">Researcher</span>
                </div>
                <a
                  href={`mailto:${profile.email}`}
                  className="block mt-1 text-[14px] text-coral hover:underline underline-offset-2"
                >
                  {profile.email}
                </a>
                <div className="mt-1 text-[13px] text-ink-2">
                  {profile.institution} | {profile.country}
                </div>
              </div>
            </div>

            <div className="h-px bg-hairline mx-8" />

            {/* Section body */}
            <div className="flex-1 px-8 py-6 overflow-y-auto">
              {activeSection === "general" ? (
                <div className="space-y-5">
                  <Field label="Name">
                    <input
                      value={profile.name}
                      onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                      className="w-full h-10 px-3 rounded-md bg-surface-hover/40 border border-hairline text-ink text-[14px] focus:outline-none focus:ring-2 focus:ring-coral/50"
                    />
                  </Field>
                  <Field label="Role">
                    <div className="text-[14px] text-ink-2 flex items-center gap-1.5 pt-1">
                      <span>Change role in</span>
                      <a className="text-coral font-semibold inline-flex items-center gap-1 hover:underline" href="#">
                        Team Management
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </Field>
                  <Field label="Email">
                    <input
                      value={profile.email}
                      onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                      className="w-full h-10 px-3 rounded-md bg-surface-hover/40 border border-hairline text-ink text-[14px] focus:outline-none focus:ring-2 focus:ring-coral/50"
                    />
                  </Field>
                  <Field label="Institution">
                    <input
                      value={profile.institution}
                      disabled
                      className="w-full h-10 px-3 rounded-md bg-surface-hover/30 border border-hairline text-ink-2 text-[14px] cursor-not-allowed"
                    />
                  </Field>
                  <Field label="Country">
                    <input
                      value={profile.country}
                      onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value }))}
                      className="w-full h-10 px-3 rounded-md bg-surface-hover/40 border border-hairline text-ink text-[14px] focus:outline-none focus:ring-2 focus:ring-coral/50"
                    />
                  </Field>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center py-16">
                  <div>
                    <p className="text-[15px] font-semibold text-ink">Coming soon</p>
                    <p className="mt-1 text-[13px] text-ink-2">
                      This section isn't available yet.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {activeSection === "general" && (
              <div className="px-8 py-4 border-t border-hairline flex items-center justify-end gap-3">
                <span className="text-[12px] text-ink-2">Saving coming soon</span>
                <button
                  disabled
                  className="h-9 px-4 rounded-md bg-coral text-white text-[13px] font-semibold opacity-50 cursor-not-allowed"
                >
                  Save changes
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-bold text-coral mb-1.5">{label}</label>
      {children}
    </div>
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
