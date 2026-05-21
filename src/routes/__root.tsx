import { Link, Outlet, createRootRouteWithContext, useLocation, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { User, X } from "lucide-react";
import { toast } from "sonner";
import { FilePlusIcon, ShapesIcon, CodesandboxIcon } from "@/components/brand-icons";
import * as React from "react";
import { useEffect, useState } from "react";
import appCss from "../styles.css?url";
import lotusMark from "@/assets/logo_lotus.png";
import { LotusMarkActive } from "@/components/lotus-mark-active";
import { setProjectsQueryInvalidator } from "@/lib/projects-store";
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

type SettingsSection = "general" | "security" | "linked" | "team";
type ProfileState = { name: string; email: string; institution: string; country: string };

const PROFILE_STORAGE_KEY = "lotus-profile";

const DEFAULT_PROFILE: ProfileState = {
  name: "",
  email: "",
  institution: "UOW eAsia",
  country: "Australia",
};

function loadProfile(): ProfileState {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<ProfileState>;
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function saveProfile(profile: ProfileState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function AppHeader() {
  const { pathname } = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeSection, setActiveSection] = useState<"general" | "security" | "linked" | "team">("general");
  const [profile, setProfile] = useState<ProfileState>(DEFAULT_PROFILE);

  const openSettings = (section: SettingsSection = "general") => {
    setActiveSection(section);
    setSettingsOpen(true);
  };

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

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
            <span className="hidden sm:flex items-center text-[13px] text-ink-2 font-medium">
              UOW eAsia
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-10 w-10 rounded-full bg-surface flex items-center justify-center text-ink cursor-pointer border border-hairline-strong hover:bg-surface-hover/40 transition-colors"
                  aria-label="Account menu"
                >
                  <User className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-surface border-hairline">
                <DropdownMenuItem
                  className="text-ink cursor-pointer"
                  onSelect={() => openSettings("general")}
                >
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-ink cursor-pointer"
                  onSelect={() => openSettings("general")}
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
                <DropdownMenuItem
                  className="text-ink-3 cursor-not-allowed opacity-60 flex items-center justify-between gap-3"
                  onSelect={(e) => e.preventDefault()}
                  disabled
                >
                  <span>Sign out</span>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-ink-3">soon</span>
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
        darkMode={darkMode}
        onDarkModeChange={toggleDark}
        onSaveProfile={(next) => {
          setProfile(next);
          saveProfile(next);
        }}
      />
    </header>
  );
}

const SETTINGS_SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: "general", label: "General" },
  { id: "security", label: "Security" },
  { id: "linked", label: "Linked Accounts" },
  { id: "team", label: "Team Management" },
];

const inputClass =
  "w-full h-10 px-3 rounded-lg bg-surface border border-hairline text-ink text-[14px] focus:outline-none focus:ring-2 focus:ring-coral/40";
const switchClass = "data-[state=checked]:bg-coral data-[state=unchecked]:bg-coral-muted/30";

function SettingsDialog({
  open,
  onOpenChange,
  activeSection,
  setActiveSection,
  profile,
  setProfile,
  darkMode,
  onDarkModeChange,
  onSaveProfile,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  activeSection: SettingsSection;
  setActiveSection: (s: SettingsSection) => void;
  profile: ProfileState;
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>;
  darkMode: boolean;
  onDarkModeChange: (v: boolean) => void;
  onSaveProfile: (profile: ProfileState) => void;
}) {
  const [draft, setDraft] = useState(profile);

  useEffect(() => {
    if (open) setDraft(profile);
  }, [open, profile]);

  const handleSaveProfile = () => {
    const trimmed: ProfileState = {
      ...draft,
      name: draft.name.trim(),
      email: draft.email.trim(),
      country: draft.country.trim(),
    };
    setDraft(trimmed);
    setProfile(trimmed);
    onSaveProfile(trimmed);
    toast.success("Profile saved");
  };

  const displayName = draft.name.trim() || "Your name";
  const displayEmail = draft.email.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-hairline p-0 max-w-[900px] w-[92vw] rounded-2xl overflow-hidden shadow-[var(--shadow-elevated)] [&>button]:hidden">
        <div className="grid grid-cols-[200px_1fr] min-h-[580px]">
          <aside
            className="p-5 flex flex-col gap-1"
            style={{ background: "linear-gradient(180deg, #E8928E 0%, #C49090 55%, #A06B6B 100%)" }}
          >
            <h2 className="px-3 py-3 mb-1 text-[17px] font-bold text-white tracking-tight">Edit Profile</h2>
            {SETTINGS_SECTIONS.map((s) => {
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={
                    "text-left px-4 py-2.5 rounded-lg text-[14px] font-semibold transition-colors " +
                    (active ? "bg-white/25 text-white" : "text-white/90 hover:bg-white/15")
                  }
                >
                  {s.label}
                </button>
              );
            })}
          </aside>

          <div className="bg-surface relative flex flex-col min-h-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 h-7 w-7 rounded-full flex items-center justify-center text-ink-2 hover:bg-surface-hover/50 hover:text-ink transition"
            >
              <X className="h-4 w-4" />
            </button>

            <SettingsProfileHeader
              name={displayName}
              email={displayEmail}
              institution={draft.institution}
              country={draft.country}
            />

            <div className="h-px bg-hairline mx-8 shrink-0" />

            <div className="flex-1 px-8 py-6 overflow-y-auto min-h-0">
              {activeSection === "general" && (
                <div className="space-y-5 max-w-lg">
                  <Field label="Name">
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Your name"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      value={draft.email}
                      onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
                      placeholder="you@university.edu.au"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Institution">
                    <input value={draft.institution} disabled className={inputClass + " bg-surface-hover/50 text-ink-2 cursor-not-allowed"} />
                  </Field>
                  <Field label="Country">
                    <input
                      value={draft.country}
                      onChange={(e) => setDraft((p) => ({ ...p, country: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <div className="pt-4">
                    <h3 className="text-[13px] font-bold text-coral mb-3">Preferences</h3>
                    <PreferenceRow label="Dark mode" last>
                      <Switch checked={darkMode} onCheckedChange={onDarkModeChange} className={switchClass} />
                    </PreferenceRow>
                  </div>
                </div>
              )}

              {activeSection === "security" && (
                <SettingsPlaceholder
                  title="Account security"
                  description="Password changes, two-factor authentication, and session management will be available once sign-in is connected to your Lotus account."
                />
              )}

              {activeSection === "linked" && (
                <SettingsPlaceholder
                  title="Connected services"
                  description="Import datasets from Google Drive, OneDrive, Dropbox, and other sources. Integrations are planned for a future release."
                />
              )}

              {activeSection === "team" && (
                <div>
                  <h3 className="text-[15px] font-bold text-ink mb-1">Your workspace</h3>
                  <p className="text-[13px] text-ink-2 mb-4">
                    Shared team roles and invites will be available in a future release.
                  </p>
                  <ul className="divide-y divide-hairline">
                    <li className="flex items-center justify-between gap-4 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="h-10 w-10 shrink-0 rounded-full bg-coral/40 flex items-center justify-center text-[12px] font-bold text-white">
                          {profileInitials(displayName)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-ink">{displayName}</p>
                          {displayEmail ? (
                            <a href={`mailto:${displayEmail}`} className="text-[13px] text-[#0077FF] hover:underline truncate block">
                              {displayEmail}
                            </a>
                          ) : (
                            <p className="text-[13px] text-ink-2">Add your email in General</p>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-[12px] font-semibold px-3 py-1 rounded-full bg-coral/20 text-coral">
                        You
                      </span>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {activeSection === "general" && (
              <div className="px-8 py-4 border-t border-hairline shrink-0">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="h-9 px-5 rounded-lg text-white text-[13px] font-semibold shadow-sm"
                  style={{ background: "linear-gradient(180deg, #E8928E 0%, #C49090 100%)" }}
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function profileInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function SettingsProfileHeader({
  name,
  email,
  institution,
  country,
}: {
  name: string;
  email: string;
  institution: string;
  country: string;
}) {
  return (
    <div className="px-8 pt-8 pb-6 flex items-start gap-5 shrink-0">
      <div className="h-[72px] w-[72px] rounded-full bg-coral/35 flex items-center justify-center text-[20px] font-bold text-white/90 shrink-0">
        {profileInitials(name)}
      </div>
      <div className="flex-1 pt-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0 text-[17px] text-ink">
          <span className="font-bold">{name}</span>
          <span className="text-ink-2">·</span>
          <span className="font-medium">Researcher</span>
        </div>
        {email ? (
          <a href={`mailto:${email}`} className="block mt-1 text-[14px] text-[#0077FF] hover:underline truncate">
            {email}
          </a>
        ) : (
          <p className="mt-1 text-[14px] text-ink-2">Add your email in General</p>
        )}
        <p className="mt-1 text-[13px] text-ink-2">
          {institution} | {country}
        </p>
      </div>
    </div>
  );
}

function SettingsPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-md py-2">
      <h3 className="text-[15px] font-bold text-ink">{title}</h3>
      <p className="mt-2 text-[14px] text-ink-2 leading-relaxed">{description}</p>
    </div>
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

function PreferenceRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={"flex items-center justify-between gap-4 py-3 " + (last ? "" : "border-b border-hairline")}>
      <span className="text-[14px] text-ink">{label}</span>
      {children}
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    setProjectsQueryInvalidator(() => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    });
  }, [queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 pt-4">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
