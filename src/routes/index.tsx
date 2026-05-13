import { createFileRoute } from "@tanstack/react-router";
import { FilePlus, Shapes, Box, FileText } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

const recent = [
  { name: "Dataset_A(dietary).csv", active: true },
  { name: "filename.csv", active: true },
  { name: "filename.csv", active: true },
  { name: "filename.csv", active: false },
  { name: "filename.csv", active: false },
];

function ActionCard({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <button className="bg-card rounded-2xl w-56 h-44 flex flex-col items-center justify-center gap-3 shadow-[var(--shadow-card)] hover:translate-y-[-2px] transition">
      <Icon className="h-12 w-12" strokeWidth={1.75} />
      <span className="font-semibold text-base">{label}</span>
    </button>
  );
}

function Radio({ active }: { active: boolean }) {
  return (
    <div className={`h-6 w-6 rounded-full flex items-center justify-center ${active ? "bg-primary" : "bg-muted-foreground/40"}`}>
      <div className="h-2 w-2 rounded-full bg-card" />
    </div>
  );
}

function Index() {
  return (
    <div className="max-w-5xl mx-auto pt-6">
      <div className="flex justify-center gap-8 mb-12">
        <ActionCard icon={FilePlus} label="New Dataset" />
        <ActionCard icon={Shapes} label="New Visualisation" />
        <ActionCard icon={Box} label="New AI Analysis" />
      </div>

      <h2 className="font-sans font-bold text-base mb-3 px-1">Recent files</h2>
      <div className="bg-card/70 rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
        {recent.map((f, i) => (
          <div
            key={i}
            className={`flex items-center gap-4 px-5 py-4 ${i !== recent.length - 1 ? "border-b border-border/60" : ""}`}
          >
            <Radio active={f.active} />
            <div className="h-6 w-px bg-border/80" />
            <FileText className="h-5 w-5 text-foreground/70" strokeWidth={1.75} />
            <span className="font-semibold text-sm">{f.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
