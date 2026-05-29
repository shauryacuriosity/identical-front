import {
  Link,
  Navigate,
  Outlet,
  createRootRouteWithContext,
  redirect,
  useLocation,
  useRouter,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { User, X } from "lucide-react";
import { toast } from "sonner";
import { FilePlusIcon, ShapesIcon, CodesandboxIcon } from "@/components/brand-icons";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import appCss from "../styles.css?url";
import lotusMark from "@/assets/logo_lotus.png";
import { LotusMarkActive } from "@/components/lotus-mark-active";
import { setProjectsQueryInvalidator } from "@/lib/projects-store";
import { setAuthTokenGetter } from "@/lib/api/client";
import {
  AuthProvider,
  useAuth,
  isPublicAuthPath,
  profileFromUser,
  getClientAuthSession,
} from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
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
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { navSearchWithProject, projectIdFromSearch } from "@/lib/nav-project-search";

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center flex-col gap-3">
      <p>{error.message}</p>
      <button
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className="text-coral underline"
      >
        Retry
      </button>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  /** Avoid SSR rendering protected pages (e.g. Home) before client session is known. */
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (isPublicAuthPath(location.pathname)) return;
    const session = await getClientAuthSession();
    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.pathname },
      });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lotus — Public health data workbench" },
      { name: "description", content: "Join, aggregate, and analyse public health datasets." },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico", type: "image/png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <p>404</p>
    </div>
  ),
  errorComponent: RootErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=location.pathname;var pub=["/login","/signup","/forgot-password"];if(pub.indexOf(p)===-1)document.documentElement.setAttribute("data-auth-pending","1");})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

type SettingsSection = "general" | "security" | "linked" | "team";
type ProfileState = {
  name: string;
  email: string;
  institution: string;
  country: string;
  avatarUrl: string;
};

function AppHeader() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const navProjectSearch = navSearchWithProject(projectIdFromSearch(search));
  const { user, signOut } = useAuth();
  const profile = profileFromUser(user);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeSection, setActiveSection] = useState<"general" | "security" | "linked" | "team">(
    "general",
  );

  const openSettings = (section: SettingsSection = "general") => {
    setActiveSection(section);
    setSettingsOpen(true);
  };

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
    <header className="sticky top-0 z-30 pt-3 pb-3 sm:pt-4 sm:pb-4 px-3 sm:px-6 overflow-visible">
      <div className="mx-auto max-w-[1280px]">
        {/* Floating pill nav — compact on mobile; full tabs from lg */}
        <nav
          className="relative h-12 sm:h-14 rounded-full bg-surface flex items-center pl-3 sm:pl-5 pr-2 sm:pr-3 border border-hairline"
          style={{ boxShadow: "var(--shadow-depth)" }}
        >
          {/* Brand cluster — acts as Home link */}
          <Link
            to="/"
            aria-label="Home"
            className={
              "flex items-center gap-2 px-3 min-h-11 h-11 my-auto rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-coral/50 " +
              (homeActive ? "bg-coral text-white" : "text-ink hover:bg-highlight/50")
            }
          >
            {homeActive ? (
              <LotusMarkActive className="h-[18px] w-auto text-white" />
            ) : (
              <img src={lotusMark} alt="" className="h-[18px] w-auto" />
            )}
            <span className="hidden sm:inline text-[15px] sm:text-[16px] font-semibold leading-none tracking-tight">
              Lotus
            </span>
          </Link>

          {/* Divider — desktop tabs only */}
          <span className="hidden lg:block mx-3 h-6 w-px bg-hairline" />

          {/* Tabs — hidden below lg (mobile uses bottom nav) */}
          <div className="hidden lg:flex items-center gap-1 h-full">
            {tabs.map((t) => {
              const active = pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  search={navProjectSearch}
                  aria-label={t.label}
                  className={
                    "h-11 min-w-[44px] px-4 my-auto flex items-center gap-2 text-[14px] font-semibold tracking-tight rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-coral/50 " +
                    (active ? "bg-coral text-white" : "text-ink hover:bg-highlight/50")
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
              {profile.institution}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full bg-surface flex items-center justify-center text-ink cursor-pointer border border-hairline-strong hover:bg-surface-hover/40 transition-colors focus-visible:ring-2 focus-visible:ring-coral/50"
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
                  className="text-ink cursor-pointer"
                  onSelect={() => {
                    void (async () => {
                      await signOut();
                      if (typeof document !== "undefined") {
                        document.documentElement.classList.remove("dark");
                      }
                      if (typeof window !== "undefined") {
                        localStorage.removeItem("lotus-theme");
                      }
                      setDarkMode(false);
                      toast.success("Signed out");
                      void navigate({ to: "/login", replace: true });
                    })();
                  }}
                >
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
        darkMode={darkMode}
        onDarkModeChange={toggleDark}
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
  darkMode,
  onDarkModeChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  activeSection: SettingsSection;
  setActiveSection: (s: SettingsSection) => void;
  profile: ProfileState;
  darkMode: boolean;
  onDarkModeChange: (v: boolean) => void;
}) {
  const [draft, setDraft] = useState(profile);
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setDraft(profile);
  }, [open, profile]);

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be 2 MB or smaller");
      return;
    }
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not signed in");
      setSaving(false);
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    let avatarUrl = "";
    if (uploadError) {
      if (file.size <= 180_000) {
        avatarUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ""));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
      } else {
        toast.error("Avatar upload failed", {
          description:
            uploadError.message +
            " — create a public avatars bucket in Supabase Storage, or use a smaller image.",
        });
        setSaving(false);
        return;
      }
    } else {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      avatarUrl = urlData.publicUrl;
    }

    const { error } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft((prev) => ({ ...prev, avatarUrl }));
    toast.success("Profile photo updated");
  };

  const handleSaveProfile = async () => {
    const trimmed: ProfileState = {
      ...draft,
      name: draft.name.trim(),
      email: profile.email.trim(),
      country: draft.country.trim(),
    };
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: trimmed.name,
        institution: trimmed.institution,
        country: trimmed.country,
      },
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft(trimmed);
    toast.success("Profile saved");
  };

  const displayName = draft.name.trim() || "Your name";
  const displayEmail = draft.email.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-hairline p-0 max-w-[900px] w-[92vw] rounded-2xl overflow-hidden shadow-[var(--shadow-elevated)] [&>button]:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] min-h-[min(580px,85vh)]">
          <aside
            className="p-5 flex flex-col gap-1"
            style={{ background: "linear-gradient(180deg, #E8928E 0%, #C49090 55%, #A06B6B 100%)" }}
          >
            <h2 className="px-3 py-3 mb-1 text-[17px] font-bold text-white tracking-tight">
              Edit Profile
            </h2>
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
              avatarUrl={draft.avatarUrl}
              onAvatarClick={() => avatarInputRef.current?.click()}
              uploading={saving}
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleAvatarUpload(file);
                e.target.value = "";
              }}
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
                      readOnly
                      placeholder="you@university.edu.au"
                      className={inputClass + " bg-surface-hover/50 text-ink-2 cursor-not-allowed"}
                    />
                  </Field>
                  <Field label="Institution">
                    <input
                      value={draft.institution}
                      disabled
                      className={inputClass + " bg-surface-hover/50 text-ink-2 cursor-not-allowed"}
                    />
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
                      <Switch
                        checked={darkMode}
                        onCheckedChange={onDarkModeChange}
                        className={switchClass}
                      />
                    </PreferenceRow>
                  </div>
                </div>
              )}

              {activeSection === "security" && <SecuritySection />}

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
                            <a
                              href={`mailto:${displayEmail}`}
                              className="text-[13px] text-[#0077FF] hover:underline truncate block"
                            >
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
                  onClick={() => void handleSaveProfile()}
                  disabled={saving}
                  className="h-9 px-5 rounded-lg text-white text-[13px] font-semibold shadow-sm disabled:opacity-60"
                  style={{ background: "linear-gradient(180deg, #E8928E 0%, #C49090 100%)" }}
                >
                  {saving ? "Saving…" : "Save Changes"}
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
  avatarUrl,
  onAvatarClick,
  uploading,
}: {
  name: string;
  email: string;
  institution: string;
  country: string;
  avatarUrl?: string;
  onAvatarClick?: () => void;
  uploading?: boolean;
}) {
  return (
    <div className="px-8 pt-8 pb-6 flex items-start gap-5 shrink-0">
      <button
        type="button"
        onClick={onAvatarClick}
        disabled={!onAvatarClick || uploading}
        className="relative h-[72px] w-[72px] rounded-full shrink-0 group disabled:opacity-60"
        aria-label="Change profile photo"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-[72px] w-[72px] rounded-full object-cover border border-hairline"
          />
        ) : (
          <div className="h-[72px] w-[72px] rounded-full bg-coral/35 flex items-center justify-center text-[20px] font-bold text-white/90">
            {profileInitials(name)}
          </div>
        )}
        <span className="absolute inset-0 rounded-full bg-black/45 text-white text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          {uploading ? "…" : "Edit"}
        </span>
      </button>
      <div className="flex-1 pt-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0 text-[17px] text-ink">
          <span className="font-bold">{name}</span>
          <span className="text-ink-2">·</span>
          <span className="font-medium">Researcher</span>
        </div>
        {email ? (
          <a
            href={`mailto:${email}`}
            className="block mt-1 text-[14px] text-[#0077FF] hover:underline truncate"
          >
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

function SecuritySection() {
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleEnrollMfa = async () => {
    setEnrolling(true);
    setQrCode(null);
    setFactorId(null);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator app",
    });
    setEnrolling(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data?.totp?.qr_code) {
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      toast.info("Scan the QR code, then enter the 6-digit code below.");
    } else {
      toast.error(
        "No QR code returned — enable TOTP under Supabase Dashboard → Authentication → MFA.",
      );
    }
  };

  const handleVerifyMfa = async () => {
    if (!factorId || !verifyCode.trim()) return;
    setVerifying(true);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeError) {
      setVerifying(false);
      toast.error(challengeError.message);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: verifyCode.trim(),
    });
    setVerifying(false);
    if (verifyError) {
      toast.error(verifyError.message);
      return;
    }
    toast.success("Authenticator app enabled");
    setQrCode(null);
    setVerifyCode("");
    setFactorId(null);
  };

  return (
    <div className="max-w-md py-2 space-y-5">
      <div>
        <h3 className="text-[15px] font-bold text-ink">Two-factor authentication</h3>
        <p className="mt-2 text-[14px] text-ink-2 leading-relaxed">
          Add a TOTP authenticator app for an extra layer of protection on your Lotus account.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleEnrollMfa()}
        disabled={enrolling}
        className="h-9 px-5 rounded-lg text-white text-[13px] font-semibold shadow-sm disabled:opacity-60"
        style={{ background: "linear-gradient(180deg, #E8928E 0%, #C49090 100%)" }}
      >
        {enrolling ? "Starting enrollment…" : "Set up authenticator app"}
      </button>
      {qrCode && (
        <div className="space-y-3 rounded-xl border border-hairline bg-surface-hover/40 p-4">
          <p className="text-[13px] text-ink-2">
            Scan this QR code with Google Authenticator, 1Password, or similar:
          </p>
          <img
            src={qrCode}
            alt="Authenticator QR code"
            className="w-44 h-44 rounded-lg border border-hairline bg-white p-2"
          />
          <input
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="6-digit code"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => void handleVerifyMfa()}
            disabled={verifying || verifyCode.length !== 6}
            className="h-9 px-5 rounded-lg border border-hairline bg-surface text-[13px] font-semibold text-ink hover:border-coral/40 disabled:opacity-50"
          >
            {verifying ? "Verifying…" : "Verify and enable"}
          </button>
        </div>
      )}
      <p className="text-[12px] text-ink-3 leading-relaxed">
        Password changes use the reset link on the sign-in page. MFA requires TOTP to be enabled in
        the Supabase project (Dashboard → Authentication → Multi-Factor).
      </p>
    </div>
  );
}

function SessionLoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-canvas">
      <img src={lotusMark} alt="" className="h-8 w-auto opacity-90" />
      <div
        className="h-5 w-5 rounded-full border-2 border-coral border-t-transparent animate-spin"
        aria-label="Loading session"
      />
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    setAuthTokenGetter(() => session?.access_token ?? null);
  }, [session]);

  useEffect(() => {
    if (loading) return;
    const pending = document.documentElement.getAttribute("data-auth-pending");
    if (pending) {
      document.documentElement.removeAttribute("data-auth-pending");
    }
  }, [loading, session, pathname]);

  const isPublic = isPublicAuthPath(pathname);

  if (loading && !isPublic) {
    return <SessionLoadingScreen />;
  }

  if (!session && !isPublic) {
    return <Navigate to="/login" search={{ redirect: pathname }} replace />;
  }

  if (session && isPublic) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppShell() {
  const { pathname } = useLocation();
  const isAuthPage = isPublicAuthPath(pathname);

  return (
    <div className="min-h-screen flex flex-col" data-app-shell="true">
      {!isAuthPage && <AppHeader />}
      <main className={isAuthPage ? "" : "flex-1 pt-2 sm:pt-4 pb-20 lg:pb-0"}>
        <Outlet />
      </main>
      {!isAuthPage && <MobileBottomNav />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-bold text-coral-deep mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function PreferenceRow({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={
        "flex items-center justify-between gap-4 py-3 " + (last ? "" : "border-b border-hairline")
      }
    >
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
      <AuthProvider>
        <AuthGate>
          <AppShell />
        </AuthGate>
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}
