import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Download, Plus } from "lucide-react";

export const Route = createFileRoute("/ai-analysis/results")({
  component: ResultsPage,
});

// ---------- Hard-coded run data ----------

const COHORT = { n: 1847, prevalence: 23.4, ageMin: 20, ageMax: 65 };
const PERF = { auc: 0.76, sens: 0.71, spec: 0.74, acc: 0.73, nTest: 480 };

const ROC: { fpr: number; tpr: number }[] = [
  { fpr: 0, tpr: 0 }, { fpr: 0.04, tpr: 0.22 }, { fpr: 0.08, tpr: 0.38 },
  { fpr: 0.14, tpr: 0.52 }, { fpr: 0.2, tpr: 0.61 }, { fpr: 0.28, tpr: 0.68 },
  { fpr: 0.38, tpr: 0.74 }, { fpr: 0.5, tpr: 0.81 }, { fpr: 0.62, tpr: 0.86 },
  { fpr: 0.74, tpr: 0.91 }, { fpr: 0.86, tpr: 0.96 }, { fpr: 1, tpr: 1 },
];

const SHAP: { feature: string; unit: string; value: number }[] = [
  { feature: "Dietary sodium", unit: "mg/day", value: 0.187 },
  { feature: "Age", unit: "years", value: 0.142 },
  { feature: "Dietary fibre", unit: "g/day", value: 0.118 },
  { feature: "Added sugar", unit: "g/day", value: 0.094 },
  { feature: "Saturated fat", unit: "g/day", value: 0.081 },
  { feature: "Total energy", unit: "kcal", value: 0.067 },
  { feature: "Sex", unit: "male", value: 0.053 },
  { feature: "Refined grain intake", unit: "servings", value: 0.042 },
  { feature: "Vegetable intake", unit: "servings", value: 0.038 },
  { feature: "Alcohol", unit: "g/day", value: 0.031 },
];

type ClusterId = 1 | 2 | 3 | 4;
const CLUSTER_COLORS: Record<ClusterId, string> = {
  1: "var(--coral)",
  2: "var(--data-sage)",
  3: "var(--data-slate)",
  4: "var(--data-ochre)",
};
const CLUSTERS: { id: ClusterId; label: string; n: number; mets: number; center: [number, number] }[] = [
  { id: 1, label: "Low-fibre, high-sodium",   n: 412, mets: 38.1, center: [-2.1,  1.4] },
  { id: 2, label: "Balanced traditional",      n: 521, mets: 18.7, center: [ 1.6,  1.8] },
  { id: 3, label: "High-energy refined-carb", n: 479, mets: 31.2, center: [ 2.4, -1.3] },
  { id: 4, label: "Mediterranean-style",       n: 435, mets: 12.4, center: [-1.8, -1.9] },
];

// Deterministic jittered points per cluster (no Math.random for SSR stability)
function clusterPoints(seed: number, cx: number, cy: number, n = 80) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    // simple deterministic pseudo-random based on seed + i
    const a = Math.sin(seed * 999 + i * 12.9898) * 43758.5453;
    const b = Math.sin(seed * 333 + i * 78.233) * 12345.6789;
    const jx = (a - Math.floor(a) - 0.5) * 2.4;
    const jy = (b - Math.floor(b) - 0.5) * 2.0;
    pts.push({ x: cx + jx, y: cy + jy });
  }
  return pts;
}

type Subject = {
  id: number; risk: number; positive: boolean; cluster: ClusterId; age: number; sex: "M" | "F"; features: string[];
};
const SUBJECTS: Subject[] = [
  { id: 73481, risk: 0.87, positive: true,  cluster: 1, age: 54, sex: "M", features: ["sodium ↑", "fibre ↓", "sugar ↑"] },
  { id: 73482, risk: 0.14, positive: false, cluster: 4, age: 38, sex: "F", features: ["fibre ↑", "veg ↑", "sodium ↓"] },
  { id: 73483, risk: 0.62, positive: true,  cluster: 3, age: 47, sex: "M", features: ["kcal ↑", "refined ↑", "age"] },
  { id: 73484, risk: 0.23, positive: false, cluster: 2, age: 31, sex: "F", features: ["balanced", "age ↓", "veg ↑"] },
  { id: 73485, risk: 0.78, positive: true,  cluster: 1, age: 61, sex: "M", features: ["sodium ↑", "satfat ↑", "age"] },
  { id: 73486, risk: 0.34, positive: false, cluster: 2, age: 42, sex: "F", features: ["fibre ↑", "moderate", "veg"] },
  { id: 73487, risk: 0.71, positive: true,  cluster: 3, age: 58, sex: "F", features: ["sugar ↑", "kcal ↑", "age"] },
  { id: 73488, risk: 0.19, positive: false, cluster: 4, age: 29, sex: "M", features: ["fibre ↑", "veg ↑", "sodium ↓"] },
];

// ---------- Page ----------

function ResultsPage() {
  const navigate = useNavigate();
  const [runName, setRunName] = useState("Run 2025-05-18 14:32");
  const [editing, setEditing] = useState(false);

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-24 pt-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="text-[13px] text-ink-2 flex items-center gap-2 flex-wrap">
          <Link to="/ai-analysis" className="hover:text-coral transition-colors">Analysis</Link>
          <span className="text-ink-3">·</span>
          {editing ? (
            <input
              autoFocus
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
              className="bg-transparent border-b border-coral/50 text-ink focus:outline-none px-0.5"
            />
          ) : (
            <button onClick={() => setEditing(true)} className="text-ink hover:text-coral transition-colors">
              {runName}
            </button>
          )}
          <span className="text-ink-3">·</span>
          <span className="mono text-ink-2">Dataset_A_dietary.csv</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate({ to: "/ai-analysis" })}
            className="h-9 px-3 rounded-lg border border-hairline bg-surface text-ink-2 hover:text-ink hover:border-coral/40 text-[13px] inline-flex items-center gap-1.5 transition"
          >
            <Plus className="h-3.5 w-3.5" /> New Analysis
          </button>
          <button
            onClick={() => console.log("export", { runName })}
            className="h-9 px-4 rounded-lg bg-coral text-white text-[13px] font-medium inline-flex items-center gap-2 hover:opacity-95 transition"
          >
            <Download className="h-4 w-4" /> Export Report
          </button>
        </div>
      </div>

      {/* PANEL 1 — Run summary */}
      <section className="mt-6 rounded-2xl border border-hairline bg-surface p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:divide-x md:divide-hairline/70">
          <div className="md:pr-6">
            <Caption>Cohort</Caption>
            <div className="mt-2 font-serif text-[28px] text-ink tabular leading-none" style={{ letterSpacing: "-0.02em" }}>
              <span className="mono text-[26px]">{COHORT.n.toLocaleString()}</span> <span className="text-[14px] text-ink-3 font-sans">rows</span>
            </div>
            <div className="mt-2 text-[13px] text-ink-2 tabular">
              <span className="mono">{COHORT.prevalence}%</span> MetS prevalence
            </div>
            <div className="mt-1 text-[12.5px] text-ink-3 tabular">
              Age <span className="mono">{COHORT.ageMin}–{COHORT.ageMax}</span> · 51% F / 49% M
            </div>
          </div>

          <div className="md:px-6">
            <Caption>Model performance (test set)</Caption>
            <div className="mt-2 font-serif text-[28px] tabular leading-none" style={{ letterSpacing: "-0.02em", color: "var(--coral)" }}>
              <span className="text-[14px] text-ink-3 font-sans mr-2">AUC</span>
              <span className="mono">{PERF.auc.toFixed(2)}</span>
            </div>
            <div className="mt-2 text-[13px] text-ink-2 tabular">
              Sensitivity <span className="mono text-ink">{PERF.sens.toFixed(2)}</span> · Specificity <span className="mono text-ink">{PERF.spec.toFixed(2)}</span>
            </div>
            <div className="mt-1 text-[12.5px] text-ink-3 tabular">
              Accuracy <span className="mono">{PERF.acc.toFixed(2)}</span> (n=<span className="mono">{PERF.nTest}</span>)
            </div>
            <div className="mt-2 text-[11.5px] text-ink-3 italic">honest test-set metrics</div>
          </div>

          <div className="md:pl-6 flex flex-col">
            <Caption>ROC curve</Caption>
            <div className="mt-2 h-[120px] w-full max-w-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ROC} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <defs>
                    <linearGradient id="rocFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--coral)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--coral)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="fpr" type="number" domain={[0, 1]} hide />
                  <YAxis dataKey="tpr" type="number" domain={[0, 1]} hide />
                  <ReferenceLine
                    segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
                    stroke="var(--hairline)"
                    strokeDasharray="3 3"
                    ifOverflow="extendDomain"
                  />
                  <Area type="monotone" dataKey="tpr" stroke="var(--coral)" strokeWidth={1.75} fill="url(#rocFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* PANELS 2 + 3 */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-4">
        {/* SHAP */}
        <section className="rounded-2xl border border-hairline bg-surface p-6">
          <PanelHeader title="Top predictors of MetS" subtitle="Ranked by mean absolute SHAP across the cohort" />
          <div className="mt-4 h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={SHAP}
                layout="vertical"
                margin={{ top: 0, right: 48, bottom: 0, left: 8 }}
              >
                <CartesianGrid horizontal={false} stroke="var(--hairline)" strokeOpacity={0.6} />
                <XAxis type="number" hide domain={[0, 0.22]} />
                <YAxis
                  type="category"
                  dataKey="feature"
                  axisLine={false}
                  tickLine={false}
                  width={170}
                  tick={(props) => {
                    const { x, y, payload } = props;
                    const item = SHAP.find((s) => s.feature === payload.value);
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text x={-8} y={0} dy={4} textAnchor="end" fontSize={12} fill="var(--ink)">
                          {payload.value}
                          <tspan fontSize={10.5} fill="var(--ink-3)" fontFamily="var(--font-mono)" dx={6}>
                            {item ? item.unit : ""}
                          </tspan>
                        </text>
                      </g>
                    );
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="var(--coral)"
                  radius={[3, 3, 3, 3]}
                  barSize={14}
                  label={({ x, y, width, height, value }) => (
                    <text
                      x={Number(x) + Number(width) + 6}
                      y={Number(y) + Number(height) / 2}
                      dy={4}
                      fontSize={11}
                      fontFamily="var(--font-mono)"
                      fill="var(--ink-2)"
                    >
                      {Number(value).toFixed(3)}
                    </text>
                  )}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-[12px] text-ink-3 italic">
            Dietary fibre ranks third — consistent with eAsia's research focus on fibre intake.
          </p>
        </section>

        {/* Clusters */}
        <section className="rounded-2xl border border-hairline bg-surface p-6">
          <PanelHeader title="Sub-population clusters" subtitle="K-Means (k=4) projected via PCA" />
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 8, bottom: 24, left: 0 }}>
                <CartesianGrid stroke="var(--hairline)" strokeOpacity={0.5} />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[-5, 5]}
                  tick={{ fontSize: 10, fill: "var(--ink-3)", fontFamily: "var(--font-mono)" }}
                  stroke="var(--hairline)"
                  label={{ value: "PC1 (28% var)", position: "insideBottom", offset: -12, fill: "var(--ink-3)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[-5, 5]}
                  tick={{ fontSize: 10, fill: "var(--ink-3)", fontFamily: "var(--font-mono)" }}
                  stroke="var(--hairline)"
                  label={{ value: "PC2 (19% var)", angle: -90, position: "insideLeft", fill: "var(--ink-3)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                />
                {CLUSTERS.map((c) => (
                  <Scatter
                    key={c.id}
                    name={`Cluster ${c.id}`}
                    data={clusterPoints(c.id, c.center[0], c.center[1])}
                    fill={CLUSTER_COLORS[c.id]}
                    fillOpacity={0.45}
                    shape="circle"
                    legendType="none"
                  />
                ))}
                {CLUSTERS.map((c) => (
                  <Scatter
                    key={`c-${c.id}`}
                    data={[{ x: c.center[0], y: c.center[1] }]}
                    fill="transparent"
                    stroke={CLUSTER_COLORS[c.id]}
                    strokeWidth={2}
                    shape="circle"
                    legendType="none"
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {CLUSTERS.map((c) => (
              <button
                key={c.id}
                className="text-left rounded-xl border border-hairline bg-canvas/40 hover:border-coral/40 hover:-translate-y-px transition-all p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[c.id] }} />
                  <span className="text-[11px] text-ink-3 mono">cluster {c.id}</span>
                </div>
                <div className="mt-1 text-[13px] text-ink font-medium leading-tight">{c.label}</div>
                <div className="mt-1 text-[12px] text-ink-2 tabular">
                  n = <span className="mono">{c.n}</span> · MetS <span className="mono">{c.mets.toFixed(1)}%</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* PANEL 4 — Predictions */}
      <section className="mt-4 rounded-2xl border border-hairline bg-surface p-6">
        <PanelHeader title="Per-subject predictions" subtitle="Click a row to view individual SHAP breakdown (coming soon)" />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-ink-3 border-b border-hairline">
                <Th>subject_id</Th>
                <Th>predicted_risk</Th>
                <Th>mets_flag</Th>
                <Th>cluster</Th>
                <Th>age</Th>
                <Th>sex</Th>
                <Th>key_features</Th>
              </tr>
            </thead>
            <tbody>
              {SUBJECTS.map((s) => (
                <tr key={s.id} className="border-b border-hairline/60 hover:bg-surface-hover/70 transition-colors cursor-pointer">
                  <Td><span className="mono">{s.id}</span></Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="mono tabular w-9">{s.risk.toFixed(2)}</span>
                      <div className="h-1 w-16 rounded-full bg-hairline overflow-hidden">
                        <div className="h-full bg-coral" style={{ width: `${s.risk * 100}%` }} />
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <FlagPill positive={s.positive} />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[s.cluster] }} />
                      <span className="mono">{s.cluster}</span>
                    </div>
                  </Td>
                  <Td><span className="mono">{s.age}</span></Td>
                  <Td><span className="mono">{s.sex}</span></Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {s.features.map((f) => (
                        <span key={f} className="mono text-[11px] px-1.5 py-0.5 rounded border border-hairline bg-surface-hover text-ink-2">{f}</span>
                      ))}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px] text-ink-3 tabular">
          <span>Showing <span className="mono">1–8</span> of <span className="mono">1,847</span></span>
          <button className="inline-flex items-center gap-1 hover:text-coral transition-colors">
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </section>

      {/* Run manifest */}
      <p className="mt-6 text-[11px] text-ink-3 mono leading-relaxed">
        Model: XGBoost (n_estimators=300, max_depth=5) · Features: 14 (8 dietary, 6 demographic) · Data hash: a4f7…b29c · Run: 2025-05-18 14:32 UTC · eAsia Workbench v0.1
      </p>
    </div>
  );
}

// ---------- Small pieces ----------

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-3 font-medium">{children}</div>;
}

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="font-serif text-[18px] text-ink leading-tight" style={{ letterSpacing: "-0.015em" }}>{title}</h2>
      <p className="text-[12.5px] text-ink-3 mt-0.5">{subtitle}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-2 px-2 font-medium">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="py-2.5 px-2 align-middle">{children}</td>;
}

function FlagPill({ positive }: { positive: boolean }) {
  return (
    <span
      className="inline-flex items-center h-5 px-2 rounded-full text-[10.5px] font-medium border border-transparent"
      style={
        positive
          ? { backgroundColor: "var(--coral-tint)", color: "var(--coral)" }
          : {
              backgroundColor: "color-mix(in oklab, var(--data-sage) 15%, transparent)",
              color: "color-mix(in oklab, var(--data-sage) 60%, var(--ink))",
            }
      }
    >
      {positive ? "positive" : "negative"}
    </span>
  );
}
