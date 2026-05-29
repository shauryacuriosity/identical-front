import { useEffect } from "react";
import { Save } from "lucide-react";

export function ProjectSaveBar({
  summary,
  disabled,
  disabledReason,
  saving,
  onSave,
  children,
}: {
  summary: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
  saving?: boolean;
  onSave: () => void;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target;
      if (!(el instanceof HTMLElement)) return;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable) return;
      if (disabled || saving) return;
      e.preventDefault();
      onSave();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, saving, onSave]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-hairline bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto max-w-[1280px] px-6 h-14 flex items-center justify-between gap-4">
        <div className="text-[12.5px] text-ink-2 min-w-0 truncate">{summary}</div>
        <div className="flex items-center gap-2 shrink-0">
          {children}
          <button
            type="button"
            onClick={onSave}
            disabled={disabled || saving}
            title={disabled ? disabledReason : undefined}
            className="h-9 px-4 rounded-lg border border-hairline bg-surface text-[13px] font-medium text-ink hover:bg-surface-hover transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
