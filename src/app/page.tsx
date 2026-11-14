"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  ChevronDown,
  CircleHelp,
  Clock3,
  Globe2,
  LockKeyhole,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Wifi,
} from "lucide-react";
import type { KevEntry } from "@/lib/cisa-kev";

type Threat = {
  id: string;
  source: string;
  target: string;
  type: string;
  severity: string;
  confidence: number;
  timestamp: string;
  color: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
};

type PredictionSource = "api" | "sample";
type KevApiResponse = { count: number; vulnerabilities: KevEntry[] };

const nodes = [
  { id: "edge", label: "EDGE GATEWAY", sub: "edge-01 · 10.0.0.1", x: 48, y: 48, icon: "gateway" },
  { id: "web", label: "WEB SERVER", sub: "web-02 · 10.0.1.12", x: 68, y: 48, icon: "server" },
  { id: "db", label: "DATABASE", sub: "db-01 · 10.0.2.8", x: 82, y: 70, icon: "database" },
  { id: "files", label: "FILE SERVER", sub: "fs-01 · 10.0.2.14", x: 48, y: 78, icon: "server" },
  { id: "workstation", label: "WORKSTATION", sub: "ws-14 · 10.0.3.24", x: 28, y: 58, icon: "device" },
];

const connections = [
  [0, 1],
  [1, 2],
  [0, 3],
  [3, 4],
  [0, 4],
] as const;

function NodeIcon({ type }: { type: string }) {
  if (type === "gateway") return <Shield className="h-4 w-4" />;
  if (type === "database") return <div className="h-3.5 w-3.5 rounded-sm border-2 border-current" />;
  if (type === "device") return <Wifi className="h-4 w-4" />;
  return <Activity className="h-4 w-4" />;
}

export default function Home() {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedThreat, setSelectedThreat] = useState(0);
  const [speed, setSpeed] = useState("1×");
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [predictionSource, setPredictionSource] = useState<PredictionSource>("sample");
  const [kevEntries, setKevEntries] = useState<KevEntry[]>([]);
  const [kevCount, setKevCount] = useState(0);
  const [kevLoading, setKevLoading] = useState(true);
  const [kevError, setKevError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/threat-predictions", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Could not load predictions.");
        return payload as { predictions: Threat[]; source: PredictionSource };
      })
      .then(({ predictions, source }) => {
        setThreats(predictions);
        setSelectedThreat(0);
        setPredictionSource(source);
        setApiError("");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setApiError(error instanceof Error ? error.message : "Could not load predictions.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/vulnerabilities", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Could not load CISA catalog.");
        return payload as KevApiResponse;
      })
      .then(({ count, vulnerabilities }) => {
        setKevCount(count);
        setKevEntries(vulnerabilities);
        setKevError("");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setKevError(error instanceof Error ? error.message : "Could not load CISA catalog.");
      })
      .finally(() => setKevLoading(false));
    return () => controller.abort();
  }, []);

  const orderedThreats = useMemo(
    () => [...threats].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)),
    [threats],
  );
  const windowStart = orderedThreats[0] ? Date.parse(orderedThreats[0].timestamp) : 0;
  const windowEnd = orderedThreats.length ? Date.parse(orderedThreats[orderedThreats.length - 1].timestamp) : 0;
  const playbackTime = windowStart + ((windowEnd - windowStart) * progress) / 100;
  const visibleThreats = orderedThreats.filter((threat) => Date.parse(threat.timestamp) <= playbackTime);
  const activeThreat = threats[selectedThreat];
  const highRiskCount = threats.filter(
    (threat) => threat.severity === "Critical" || threat.severity === "High",
  ).length;
  const averageConfidence = threats.length
    ? Math.round(threats.reduce((total, threat) => total + threat.confidence, 0) / threats.length)
    : 0;
  const metrics = [
    { label: "PREDICTED THREATS", value: String(threats.length), note: "In this feed", icon: <ShieldAlert className="h-4 w-4" />, color: "text-rose-300", trend: <ArrowUpRight className="h-3 w-3" /> },
    { label: "NETWORK NODES", value: String(nodes.length), note: "Mapped assets", icon: <Radio className="h-4 w-4" />, color: "text-cyan-300", trend: <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> },
    { label: "HIGH RISK", value: String(highRiskCount).padStart(2, "0"), note: "Critical or high", icon: <AlertTriangle className="h-4 w-4" />, color: "text-amber-300", trend: <ArrowUpRight className="h-3 w-3" /> },
    { label: "AVG. CONFIDENCE", value: `${averageConfidence}%`, note: "Across predictions", icon: <Activity className="h-4 w-4" />, color: "text-violet-300", trend: <ArrowDownRight className="h-3 w-3" /> },
  ];

  const seekToThreat = (threat: Threat) => {
    const threatTime = Date.parse(threat.timestamp);
    if (!Number.isFinite(threatTime)) return;

    const index = threats.findIndex((item) => item.id === threat.id);
    if (index < 0) return;

    setSelectedThreat(index);
    setPlaying(false);
    setProgress(
      windowEnd === windowStart
        ? 100
        : ((threatTime - windowStart) / (windowEnd - windowStart)) * 100,
    );
  };

  const moveSelection = (direction: -1 | 1) => {
    if (!orderedThreats.length) return;
    const currentIndex = orderedThreats.findIndex((threat) => threat.id === activeThreat?.id);
    const nextIndex =
      currentIndex < 0
        ? 0
        : (currentIndex + direction + orderedThreats.length) % orderedThreats.length;
    seekToThreat(orderedThreats[nextIndex]);
  };

  useEffect(() => {
    if (!playing || !orderedThreats.length) return;
    const speedMultiplier = speed === "2×" ? 2 : speed === "0.5×" ? 0.5 : 1;
    const timer = window.setInterval(() => {
      setProgress((value) => {
        if (value >= 100) {
          setPlaying(false);
          return 100;
        }
        return Math.min(100, value + 0.2 * speedMultiplier);
      });
    }, 120);
    return () => window.clearInterval(timer);
  }, [playing, speed, orderedThreats.length]);

  useEffect(() => {
    if (!visibleThreats.length) return;
    const latestVisible = visibleThreats[visibleThreats.length - 1];
    const index = threats.findIndex((threat) => threat.id === latestVisible.id);
    if (index >= 0) setSelectedThreat((current) => current === index ? current : index);
  }, [progress, threats, visibleThreats]);

  return (
    <main className="min-h-screen bg-[#080b10] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(30,64,90,0.2),transparent_60%)]" />
      <div className="relative mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-300"><Shield className="h-5 w-5" /></div>
            <div><p className="text-[15px] font-semibold tracking-wide">threat<span className="text-cyan-300">viz</span></p><p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">Network intelligence</p></div>
            <div className="ml-5 hidden h-8 w-px bg-white/10 md:block" />
            <div className="hidden md:block"><p className="text-xs font-medium text-slate-300">Acme Studio</p><p className="mt-0.5 text-[10px] text-slate-500">Business network <ChevronDown className="ml-1 inline h-3 w-3" /></p></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-[11px] font-medium text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />SYSTEMS OPERATIONAL</span>
            <button aria-label="Search" className="rounded-lg border border-white/[0.08] p-2 text-slate-400 hover:text-white"><Search className="h-4 w-4" /></button>
            <button aria-label="Notifications" className="relative rounded-lg border border-white/[0.08] p-2 text-slate-400 hover:text-white"><Bell className="h-4 w-4" /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-400" /></button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-[11px] font-semibold text-slate-200">JD</div>
          </div>
        </header>

        <section className="flex flex-wrap items-end justify-between gap-4 py-7">
          <div><div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-300"><span className="h-px w-5 bg-cyan-300" />Threat intelligence</div><h1 className="text-2xl font-semibold tracking-tight sm:text-[30px]">Attack map <span className="font-normal text-slate-500">/ Playback</span></h1><p className="mt-2 text-sm text-slate-400">Replay predicted threat activity across your network.</p></div>
          <div className="flex items-center gap-2 text-xs text-slate-400"><span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5">Last 60 minutes <ChevronDown className="ml-2 inline h-3 w-3" /></span><span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5">All severity <ChevronDown className="ml-2 inline h-3 w-3" /></span><button aria-label="Playback settings" className="rounded-md border border-white/[0.08] bg-white/[0.03] p-2"><SlidersHorizontal className="h-3.5 w-3.5" /></button></div>
        </section>

        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-white/[0.07] bg-[#0d1219]/90 p-4 sm:p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium tracking-[0.13em] text-slate-500">
                  {metric.label}
                </span>
                <span className={metric.color}>{metric.icon}</span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-2xl font-semibold tracking-tight">{metric.value}</span>
                <span className="mb-1 flex items-center gap-1 text-[10px] text-slate-500">
                  {metric.trend}
                  {metric.note}
                </span>
              </div>
            </div>
          ))}
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b1017]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
              <div><div className="flex items-center gap-2"><h2 className="text-sm font-semibold">Network topology</h2><span className="rounded border border-cyan-300/15 bg-cyan-300/[0.06] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-cyan-300">Live playback</span></div><p className="mt-1 text-[11px] text-slate-500">Predicted threat paths across your environment</p></div>
              <div className="flex items-center gap-3 text-[10px] text-slate-400"><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-rose-400" />Critical</span><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-orange-400" />High</span><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-yellow-300" />Elevated</span></div>
            </div>
            <div className="relative h-[390px] overflow-hidden sm:h-[470px]">
              <div className="absolute inset-0 opacity-[0.16]" style={{ backgroundImage: "linear-gradient(rgba(148,163,184,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.18) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(14,116,144,0.09),transparent_65%)]" />
              <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md border border-white/[0.08] bg-[#0b1017]/90 px-2.5 py-1.5 text-[10px] text-slate-400"><Globe2 className="h-3 w-3 text-cyan-300" />ACME STUDIO · US-WEST-2</div>
              <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 text-[10px] text-slate-500"><span className={`h-1.5 w-1.5 rounded-full ${loading ? "animate-pulse bg-amber-400" : apiError ? "bg-rose-400" : "animate-pulse bg-emerald-400"}`} />{loading ? "Loading predictions" : apiError ? "API unavailable" : predictionSource === "api" ? "Live prediction feed" : "Sample predictions"}</div>
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Animated predicted threat paths across network nodes">
                <defs><pattern id="dots" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx=".5" cy=".5" r=".18" fill="#64748b" /></pattern></defs>
                <rect width="100" height="100" fill="url(#dots)" opacity=".35" />
                {connections.map(([from, to]) => <line key={`link-${from}-${to}`} x1={nodes[from].x} y1={nodes[from].y} x2={nodes[to].x} y2={nodes[to].y} stroke="#334155" strokeWidth=".22" strokeDasharray="1 1" />)}
                {visibleThreats.map((threat, index) => <g key={threat.id} opacity={activeThreat?.id === threat.id ? 1 : 0.42}>
                  <line x1={threat.x} y1={threat.y} x2={threat.tx} y2={threat.ty} stroke={threat.color} strokeWidth={activeThreat?.id === threat.id ? ".42" : ".25"} strokeDasharray="1.2 1.2" />
                  <circle r=".8" fill={threat.color}><animateMotion dur={`${3.2 + index * 0.8}s`} repeatCount="indefinite" path={`M ${threat.x} ${threat.y} L ${threat.tx} ${threat.ty}`} /></circle>
                  <circle cx={threat.x} cy={threat.y} r="1.1" fill={threat.color} opacity=".8"><animate attributeName="r" values="1;2.5;1" dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values=".8;.15;.8" dur="2s" repeatCount="indefinite" /></circle>
                </g>)}
              </svg>
              {visibleThreats.map((threat) => <button key={threat.id} onClick={() => setSelectedThreat(threats.findIndex((item) => item.id === threat.id))} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-left" style={{ left: `${threat.x}%`, top: `${threat.y}%` }} aria-label={`Select threat ${threat.id}`}><span className="relative flex h-3 w-3 items-center justify-center"><span className="absolute h-3 w-3 animate-ping rounded-full opacity-30" style={{ backgroundColor: threat.color }} /><span className="h-2 w-2 rounded-full border border-[#0b1017]" style={{ backgroundColor: threat.color }} /></span><span className="absolute left-4 top-[-8px] whitespace-nowrap rounded border border-white/[0.08] bg-[#0b1017]/90 px-1.5 py-1 text-[9px] text-slate-300">{threat.id}</span></button>)}
              {nodes.map((node) => <div key={node.id} className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${node.x}%`, top: `${node.y}%` }}><div className={`flex h-9 w-9 items-center justify-center rounded-lg border bg-[#101923] shadow-lg sm:h-10 sm:w-10 ${node.id === "edge" ? "border-cyan-300/40 text-cyan-300 shadow-cyan-950/40" : "border-slate-600/60 text-slate-300"}`}><NodeIcon type={node.icon} /></div><div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-center"><p className="text-[8px] font-semibold tracking-[0.12em] text-slate-300 sm:text-[9px]">{node.label}</p><p className="mt-0.5 hidden text-[9px] text-slate-500 sm:block">{node.sub}</p></div></div>)}
              <div className="absolute bottom-4 left-4 rounded-md border border-white/[0.07] bg-[#0b1017]/90 px-2.5 py-2 text-[9px] text-slate-500"><span className="text-slate-300">{nodes.length}</span> nodes <span className="mx-2 text-slate-700">|</span><span className="text-slate-300">{connections.length}</span> connections</div>
              <button aria-label="Map help" className="absolute bottom-4 right-4 rounded-md border border-white/[0.08] bg-[#0b1017]/90 p-2 text-slate-500 hover:text-slate-300"><CircleHelp className="h-3.5 w-3.5" /></button>
            </div>
            <div className="border-t border-white/[0.07] bg-[#0d1219] px-4 py-4 sm:px-5">
              <div className="mb-3 flex items-center justify-between text-[10px]"><span className="font-mono text-slate-300">{playbackTime ? new Date(playbackTime).toLocaleTimeString("en-US", { timeZone: "UTC", hour12: false }) : "--:--:--"} <span className="text-slate-600">UTC</span></span><span className="text-slate-500">PREDICTION WINDOW</span></div>
              <input aria-label="Playback timeline" type="range" min="0" max="100" value={progress} onChange={(event) => setProgress(Number(event.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-cyan-300" />
              <div className="mt-2 flex justify-between font-mono text-[9px] text-slate-600">{[0, 0.25, 0.5, 0.75, 1].map((fraction) => <span key={fraction}>{windowStart ? new Date(windowStart + (windowEnd - windowStart) * fraction).toLocaleTimeString("en-US", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--"}</span>)}</div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <button
                    aria-label="Restart playback"
                    onClick={() => {
                      setProgress(0);
                      setPlaying(false);
                    }}
                    className="rounded-md p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Previous event"
                    disabled={!threats.length}
                    onClick={() => moveSelection(-1)}
                    className="rounded-md p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <button
                    aria-label={playing ? "Pause playback" : "Start playback"}
                    disabled={!threats.length}
                    onClick={() => {
                      if (playing) {
                        setPlaying(false);
                      } else {
                        if (progress >= 100) setProgress(0);
                        setPlaying(true);
                      }
                    }}
                    className="mx-1 flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/30 hover:bg-cyan-200 disabled:opacity-40"
                  >
                    {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                  </button>
                  <button
                    aria-label="Next event"
                    disabled={!threats.length}
                    onClick={() => moveSelection(1)}
                    className="rounded-md p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSpeed(speed === "1×" ? "2×" : speed === "2×" ? "0.5×" : "1×")}
                    className="ml-2 rounded-md border border-white/[0.08] px-2.5 py-1.5 text-[10px] font-medium text-slate-300"
                  >
                    {speed} <ChevronDown className="ml-1 inline h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500"><Clock3 className="h-3 w-3" />{apiError || (loading ? "Loading prediction events" : `Showing ${visibleThreats.length} of ${threats.length} predictions`)}</div>
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-5">
            <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d1219]">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4">
                <div>
                  <h2 className="text-sm font-semibold">CISA KEV</h2>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Known exploited vulnerabilities
                  </p>
                </div>
                <a
                  href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-cyan-300 hover:text-cyan-200"
                >
                  Source ↗
                </a>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {kevLoading ? (
                  <p className="px-4 py-6 text-center text-xs text-slate-500">
                    Loading CISA catalog…
                  </p>
                ) : kevError ? (
                  <p className="px-4 py-6 text-center text-xs text-rose-300">
                    {kevError}
                  </p>
                ) : (
                  kevEntries.map((entry) => (
                    <article key={entry.cveID} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <a
                          href={`https://www.cve.org/CVERecord?id=${entry.cveID}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[10px] text-cyan-300 hover:text-cyan-200"
                        >
                          {entry.cveID}
                        </a>
                        <span className="text-[9px] text-slate-500">
                          Added {entry.dateAdded}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-medium text-slate-200">
                        {entry.vulnerabilityName}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {entry.vendorProject} · {entry.product}
                      </p>
                      <p className="mt-2 max-h-10 overflow-hidden text-[10px] leading-relaxed text-slate-500">
                        {entry.shortDescription}
                      </p>
                    </article>
                  ))
                )}
              </div>
              <p className="border-t border-white/[0.07] px-4 py-3 text-[10px] leading-relaxed text-slate-500">
                {kevLoading
                  ? "CISA feed"
                  : kevError
                    ? "CISA feed unavailable"
                    : `${kevEntries.length} newest of ${kevCount.toLocaleString()} catalog entries`}
                . Catalog entries are not activity observed on your network.
              </p>
            </section>
            <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d1219]">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4"><div><h2 className="text-sm font-semibold">Threat activity</h2><p className="mt-1 text-[10px] text-slate-500">Predictions in this playback window</p></div><span className="rounded-md bg-rose-400/10 px-2 py-1 text-[10px] font-medium text-rose-300">{threats.length} total</span></div>
              <div className="divide-y divide-white/[0.06]">{loading ? <p className="px-4 py-6 text-center text-xs text-slate-500">Loading predictions…</p> : apiError ? <p className="px-4 py-6 text-center text-xs text-rose-300">{apiError}</p> : threats.map((threat, index) => <button key={threat.id} onClick={() => { setSelectedThreat(index); setProgress(windowEnd === windowStart ? 100 : ((Date.parse(threat.timestamp) - windowStart) / (windowEnd - windowStart)) * 100); setPlaying(false); }} className={`w-full px-4 py-3.5 text-left transition-colors ${selectedThreat === index ? "bg-white/[0.035]" : "hover:bg-white/[0.025]"}`}><div className="flex items-start justify-between gap-2"><div className="flex items-start gap-2.5"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: threat.color, boxShadow: `0 0 10px ${threat.color}66` }} /><div><p className="text-xs font-medium text-slate-200">{threat.type}</p><p className="mt-1 text-[10px] text-slate-500">{threat.source}</p><p className="mt-0.5 text-[10px] text-slate-500">Target: {threat.target}</p></div></div><span className="whitespace-nowrap font-mono text-[9px] text-slate-500">{new Date(threat.timestamp).toLocaleTimeString("en-US", { timeZone: "UTC", hour12: false })}</span></div><div className="ml-[18px] mt-3 flex items-center justify-between"><span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${threat.severity === "Critical" ? "bg-rose-400/10 text-rose-300" : threat.severity === "High" ? "bg-orange-400/10 text-orange-300" : "bg-yellow-300/10 text-yellow-200"}`}>{threat.severity}</span><span className="text-[9px] text-slate-500">Confidence <span className="ml-1 font-medium text-slate-300">{threat.confidence}%</span></span></div></button>)}</div>
              <div className="w-full border-t border-white/[0.07] px-4 py-3 text-center text-[10px] text-slate-500">{apiError ? "Prediction feed unavailable" : `Showing ${threats.length} predictions`}</div>
            </section>
            <section className="rounded-xl border border-white/[0.08] bg-[#0d1219] p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-300/[0.08] text-cyan-300"><LockKeyhole className="h-3.5 w-3.5" /></div><h2 className="text-xs font-semibold">Selected prediction</h2></div><span className="text-[9px] font-mono text-slate-500">{activeThreat?.id ?? "—"}</span></div>{activeThreat ? <><p className="mt-4 text-sm font-medium text-slate-200">{activeThreat.type}</p><p className="mt-1 text-[10px] leading-relaxed text-slate-500">Predicted path from <span className="text-slate-300">{activeThreat.source.split(" · ")[0]}</span> toward <span className="text-slate-300">{activeThreat.target.split(" · ")[0]}</span>.</p><div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10px]"><span className="text-slate-500">Model confidence</span><span className="font-medium text-cyan-300">{activeThreat.confidence}%</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${activeThreat.confidence}%` }} /></div></> : <p className="mt-4 text-xs text-slate-500">{loading ? "Waiting for prediction events…" : "No prediction selected."}</p>}</section>
            <div className="flex items-start gap-2 rounded-lg border border-amber-300/10 bg-amber-300/[0.035] p-3 text-[10px] leading-relaxed text-slate-500"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/80" /><p><span className="font-medium text-amber-200/80">Prediction notice.</span> Threat paths are model-generated indicators, not confirmation of an active attack.</p></div>
          </aside>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 py-5 text-[10px] text-slate-600"><span>Threatviz <span className="mx-1">·</span> Network intelligence for your business</span><span>Latest prediction {windowEnd ? new Date(windowEnd).toLocaleTimeString("en-US", { timeZone: "UTC", hour12: false }) : "—"} UTC <span className="mx-1">·</span> <button className="text-slate-500 hover:text-slate-300">Documentation</button></span></footer>
      </div>
    </main>
  );
}
