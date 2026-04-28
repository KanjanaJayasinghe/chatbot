"use client";
import { useState, useMemo } from "react";
import { useDashboardData } from "../useDashboardData";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, PieChart, Pie,
} from "recharts";

/* ── KPI Card ─────────────────────────────────────── */
const KPI_ACCENT: Record<string, { from: string; to: string; glow: string; icon: string }> = {
  risk:     { from: "#ef4444", to: "#f97316", glow: "rgba(239,68,68,0.18)",   icon: "⚠️" },
  heat:     { from: "#f97316", to: "#fbbf24", glow: "rgba(249,115,22,0.18)",  icon: "🌡️" },
  bleach:   { from: "#eab308", to: "#84cc16", glow: "rgba(234,179,8,0.18)",   icon: "🪸" },
  sites:    { from: "#06b6d4", to: "#3b82f6", glow: "rgba(59,130,246,0.18)",  icon: "📍" },
};

function KPICard({ title, value, sub, gauge, isDark, accentKey }: {
  title: string; value: string | number; sub: string; color?: string; gauge?: number; isDark?: boolean; accentKey?: string;
}) {
  const acc = KPI_ACCENT[accentKey ?? "sites"];
  const barColor = gauge !== undefined
    ? (gauge > 60 ? "#ef4444" : gauge > 35 ? "#f97316" : "#22c55e")
    : acc.from;

  return (
    <div
      style={{
        background: isDark
          ? `linear-gradient(135deg, #0d0d0d 0%, #111827 100%)`
          : `linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)`,
        border: isDark ? `1px solid rgba(255,255,255,0.07)` : `1px solid #dbeafe`,
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        position: "relative",
        overflow: "hidden",
        boxShadow: isDark
          ? `0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04)`
          : `0 2px 12px ${acc.glow}, 0 1px 3px rgba(0,0,0,0.05)`,
      }}
    >
      {/* Accent top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${acc.from}, ${acc.to})`,
        borderRadius: "14px 14px 0 0",
      }} />

      {/* Icon + title row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
        <span style={{ fontSize: 14 }}>{acc.icon}</span>
        <div style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.09em", color: isDark ? "#64748b" : "#94a3b8",
        }}>{title}</div>
      </div>

      {/* Value */}
      <div style={{
        fontSize: 26, fontWeight: 800, lineHeight: 1,
        background: `linear-gradient(90deg, ${acc.from}, ${acc.to})`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}>{value}</div>

      {/* Gauge bar */}
      {gauge !== undefined && (
        <div style={{ height: 4, borderRadius: 4, background: isDark ? "#1e293b" : "#e2e8f0", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 4,
            width: `${Math.min(100, gauge)}%`,
            background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
            transition: "width 0.6s ease",
          }} />
        </div>
      )}

      {/* Sub label */}
      <div style={{ fontSize: 11, color: isDark ? "#475569" : "#64748b" }}>{sub}</div>
    </div>
  );
}

/* ── Risk Gauge (semi-circle SVG) ─────────────────── */
function RiskGauge({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const angle = (pct / 100) * 180 - 90;
  const rad = (angle * Math.PI) / 180;
  const cx = 80, cy = 72, r = 56;
  const nx = cx + r * Math.cos(rad);
  const ny = cy + r * Math.sin(rad);
  const color = pct > 60 ? "#ef4444" : pct > 35 ? "#f97316" : "#22c55e";

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="90" viewBox="0 0 160 90">
        <path d="M 24 72 A 56 56 0 0 1 136 72" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
        <path d="M 24 72 A 56 56 0 0 1 80 16"  fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="round" opacity="0.55" />
        <path d="M 80 16 A 56 56 0 0 1 124 34"  fill="none" stroke="#f97316" strokeWidth="12" strokeLinecap="round" opacity="0.55" />
        <path d="M 124 34 A 56 56 0 0 1 136 72" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" opacity="0.55" />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill={color} />
        <text x="14"  y="86" fill="#94a3b8" fontSize="9">Low</text>
        <text x="69"  y="13" fill="#94a3b8" fontSize="9">Med</text>
        <text x="125" y="86" fill="#94a3b8" fontSize="9">High</text>
      </svg>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{pct.toFixed(1)}</div>
      <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Islandwide Reef Risk</div>
    </div>
  );
}

const CLUSTER_COLORS: Record<string, string> = {
  "High Risk": "#ef4444",
  "Medium Risk": "#eab308",
  "Low Risk": "#22c55e",
};

/* ── Sri Lanka Reef Map ───────────────────────────────── */
type GeoSite = { site: string; cluster: string; bleaching: number; dhw: number; lat: number; lon: number };

function SriLankaMap({ geoData, isDark, card }: { geoData: GeoSite[]; isDark: boolean; card: React.CSSProperties }) {
  const [tooltip, setTooltip] = useState<null | { site: string; cluster: string; bleaching: number; dhw: number; x: number; y: number }>(null);

  // Sri Lanka projection bounds
  const LON_MIN = 79.5, LON_MAX = 82.2, LAT_MIN = 5.7, LAT_MAX = 10.1;
  const W = 300, H = 460;
  const toX = (lon: number) => ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * W;
  const toY = (lat: number) => H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * H;

  // Approximate Sri Lanka coastline polygon
  const outline: [number, number][] = [
    [9.85,80.02],[9.78,80.25],[9.60,80.55],[9.20,81.38],
    [8.57,81.22],[8.33,81.35],[7.72,81.70],[7.29,81.84],
    [6.90,81.78],[6.60,81.56],[6.22,81.18],[5.92,80.50],
    [6.03,80.15],[6.30,79.96],[6.83,79.87],[7.25,79.82],
    [7.85,79.78],[8.30,79.88],[8.56,79.91],[9.19,79.88],
    [9.50,79.85],[9.80,79.82],
  ];
  const pathD = outline.map(([lt, ln], i) => `${i===0?"M":"L"}${toX(ln).toFixed(1)},${toY(lt).toFixed(1)}`).join(" ") + " Z";

  // Deduplicate to unique sites
  const siteMap = new Map<string, GeoSite & { count: number }>();
  for (const d of geoData) {
    if (!siteMap.has(d.site)) siteMap.set(d.site, { ...d, count: 1 });
  }
  const sites = Array.from(siteMap.values());

  const riskOrder = ["High Risk", "Medium Risk", "Low Risk"];
  const riskCount = riskOrder.map(r => ({ label: r, count: sites.filter(s => s.cluster === r).length }));

  return (
    <div className="col-span-2 rounded-xl p-6" style={card}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <h2 style={{ color: isDark?"#f1f5f9":"#0D1F3C", fontWeight:700, fontSize:16, margin:0 }}>🗺️ Sri Lanka Reef Site Risk Map</h2>
          <p style={{ color: isDark?"#64748b":"#4A6080", fontSize:12, marginTop:4 }}>
            {sites.length} monitored reef sites around Sri Lanka — colored by risk cluster. Hover to inspect each site.
          </p>
        </div>
        <div style={{ display:"flex", gap:16 }}>
          {riskCount.map(({ label, count }) => (
            <div key={label} style={{ textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:800, color: CLUSTER_COLORS[label] }}>{count}</div>
              <div style={{ fontSize:10, color: isDark?"#64748b":"#4A6080" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", gap:24, alignItems:"flex-start" }}>
        {/* SVG Map */}
        <div style={{ position:"relative", flexShrink:0 }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width:300, height:460, borderRadius:12, overflow:"hidden" }}>
            {/* Ocean */}
            <rect width={W} height={H} fill={isDark?"#040e1c":"#bfdbfe"} />
            {/* Grid */}
            {[79.5,80,80.5,81,81.5,82].map(ln=>(
              <line key={ln} x1={toX(ln)} y1={0} x2={toX(ln)} y2={H} stroke={isDark?"rgba(255,255,255,0.04)":"rgba(37,99,235,0.1)"} strokeWidth={0.8}/>
            ))}
            {[6,7,8,9,10].map(lt=>(
              <line key={lt} x1={0} y1={toY(lt)} x2={W} y2={toY(lt)} stroke={isDark?"rgba(255,255,255,0.04)":"rgba(37,99,235,0.1)"} strokeWidth={0.8}/>
            ))}
            {/* Land */}
            <path d={pathD} fill={isDark?"#1a3d28":"#bbf7d0"} stroke={isDark?"#22c55e":"#16a34a"} strokeWidth="1.8"/>
            {/* Sites */}
            {sites.map(s=>{
              const x=toX(s.lon), y=toY(s.lat);
              const c=CLUSTER_COLORS[s.cluster]??"#94a3b8";
              return (
                <g key={s.site} style={{cursor:"pointer"}}
                  onMouseEnter={()=>setTooltip({site:s.site,cluster:s.cluster,bleaching:s.bleaching,dhw:s.dhw,x,y})}
                  onMouseLeave={()=>setTooltip(null)}>
                  <circle cx={x} cy={y} r={14} fill={c} opacity={0.15}/>
                  <circle cx={x} cy={y} r={7} fill={c} opacity={0.85} stroke="white" strokeWidth={1.8}/>
                  <circle cx={x} cy={y} r={3} fill="white"/>
                </g>
              );
            })}
            {/* Compass rose */}
            <text x={W-16} y={22} fontSize={13} textAnchor="middle" fontWeight={700} fill={isDark?"rgba(255,255,255,0.4)":"rgba(37,99,235,0.5)"}>N</text>
            <line x1={W-16} y1={26} x2={W-16} y2={36} stroke={isDark?"rgba(255,255,255,0.25)":"rgba(37,99,235,0.4)"} strokeWidth={1.5}/>
          </svg>
          {/* Hover tooltip */}
          {tooltip && (
            <div style={{
              position:"absolute",
              left: Math.min(tooltip.x+16, W-140),
              top: Math.max(tooltip.y-60, 4),
              background: isDark?"#111827":"#fff",
              border: isDark?"1px solid #1f2937":"1px solid #DDE8F8",
              borderRadius:10, padding:"10px 14px",
              boxShadow:"0 8px 32px rgba(0,0,0,0.2)",
              minWidth:140, zIndex:10, pointerEvents:"none",
            }}>
              <div style={{fontWeight:700,fontSize:13,color:isDark?"#f1f5f9":"#0D1F3C"}}>{tooltip.site}</div>
              <div style={{fontSize:11,color:CLUSTER_COLORS[tooltip.cluster],fontWeight:600,margin:"3px 0"}}>{tooltip.cluster}</div>
              <div style={{fontSize:11,color:isDark?"#94a3b8":"#4A6080"}}>Bleaching: <strong>{tooltip.bleaching}%</strong></div>
              <div style={{fontSize:11,color:isDark?"#94a3b8":"#4A6080"}}>Heat Stress: <strong>{tooltip.dhw}</strong></div>
            </div>
          )}
        </div>

        {/* Site list */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:isDark?"#475569":"#4A6080",marginBottom:10 }}>
            All Monitored Sites
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:400, overflowY:"auto" }}>
            {sites.map(s=>(
              <div key={s.site} style={{
                display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
                borderRadius:9, background: isDark?"#0a0a0a":"#F8FAFF",
                border: isDark?"1px solid #1C1C1C":"1px solid #E4EDF7",
                transition:"all 0.15s", cursor:"default",
              }}>
                <div style={{width:10,height:10,borderRadius:"50%",background:CLUSTER_COLORS[s.cluster]??"#94a3b8",flexShrink:0,boxShadow:`0 0 6px ${CLUSTER_COLORS[s.cluster]??"#94a3b8"}80`}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:isDark?"#e2e8f0":"#0D1F3C",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.site}</div>
                  <div style={{fontSize:11,color:isDark?"#64748b":"#4A6080"}}>{s.cluster} · {s.bleaching}% bleaching · DHW {s.dhw}</div>
                </div>
                <div style={{
                  fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,flexShrink:0,
                  background:CLUSTER_COLORS[s.cluster]+"22", color:CLUSTER_COLORS[s.cluster],
                  border:`1px solid ${CLUSTER_COLORS[s.cluster]}44`,
                }}>{s.cluster.split(" ")[0]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:20,marginTop:16,paddingTop:12,borderTop:isDark?"1px solid #1C1C1C":"1px solid #E4EDF7"}}>
        {Object.entries(CLUSTER_COLORS).map(([label,color])=>(
          <div key={label} style={{display:"flex",alignItems:"center",gap:7,fontSize:12}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:color,boxShadow:`0 0 5px ${color}80`}}/>
            <span style={{color:isDark?"#94a3b8":"#4A6080",fontWeight:500}}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Site Time Series Charts ───────────────────────── */
type SiteTS = {
  site: string;
  points: { year: number; bleaching: number; damageState: string; damageNum: number }[];
};

type WaterQualityTS = {
  site: string;
  points: { year: number; ph: number | null; salinity: number | null; nitrate: number | null; dissolved_o2: number | null }[];
};

const DAMAGE_COLORS: Record<string, string> = { healthy: "#22c55e", watch: "#eab308", bleached: "#ef4444", severe_bleach: "#7c3aed" };
const DAMAGE_LABELS: Record<string, string> = { healthy: "Healthy", watch: "Watch", bleached: "Bleached", severe_bleach: "Severe Bleach" };

const WQ_VARS = [
  { key: "ph",          label: "pH",            unit: "",     color: "#06b6d4", gradient: ["#06b6d4","#0891b2"] },
  { key: "salinity",    label: "Salinity",      unit: " ppt", color: "#8b5cf6", gradient: ["#8b5cf6","#7c3aed"] },
  { key: "nitrate",     label: "Nitrate",       unit: " μM",  color: "#f59e0b", gradient: ["#f59e0b","#d97706"] },
  { key: "dissolved_o2",label: "Dissolved O₂",  unit: " mg/L",color: "#10b981", gradient: ["#10b981","#059669"] },
];

function SiteTimeSeriesCharts({
  siteTimeSeries, isDark, card, GRID, TICK, TT, selectedSite, setSelectedSite,
}: {
  siteTimeSeries: SiteTS[];
  isDark: boolean;
  card: React.CSSProperties;
  GRID: string;
  TICK: { fill: string; fontSize: number };
  TT: React.CSSProperties;
  selectedSite: string;
  setSelectedSite: (s: string) => void;
}) {
  const allSites = siteTimeSeries.map((s) => s.site);
  const selected = siteTimeSeries.find((s) => s.site === selectedSite);
  const points = selected?.points ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Shared site filter header spanning both */}
      <div className="lg:col-span-2 flex flex-wrap items-center gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: isDark ? "#475569" : "#4A6080" }}>Filter by Site</div>
          <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} style={{
            background: isDark ? "#0a0a0a" : "#F8FAFF",
            border: isDark ? "1px solid #1C1C1C" : "1px solid #DDE8F8",
            color: isDark ? "#e2e8f0" : "#0D1F3C",
            borderRadius: 8, padding: "6px 12px", fontSize: 13,
            outline: "none", cursor: "pointer", width: "100%", maxWidth: 320,
          }}>
            {allSites.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex gap-3 mt-4">
          {Object.entries(DAMAGE_LABELS).map(([k, label]) => (
            <span key={k} className="flex items-center gap-1.5 text-xs" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: DAMAGE_COLORS[k], display: "inline-block" }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Chart 1: Time vs Bleaching % */}
      <div className="rounded-xl p-4" style={card}>
        <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>📈 Bleaching % Over Time</h2>
        <p className="text-xs mb-3" style={{ color: "#64748b" }}>Annual average bleaching percentage for <strong style={{ color: isDark ? "#e2e8f0" : "#0D1F3C" }}>{selectedSite}</strong>.</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="year" tick={TICK} label={{ value: "Year", position: "insideBottom", offset: -2, fill: TICK.fill, fontSize: 11 }} />
            <YAxis tick={TICK} label={{ value: "Bleaching %", angle: -90, position: "insideLeft", fill: TICK.fill, fontSize: 11 }} />
            <Tooltip contentStyle={TT} formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, "Bleaching"]} />
            <Line type="monotone" dataKey="bleaching" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4, fill: "#f97316" }} name="Bleaching %" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: Time vs Damage State */}
      <div className="rounded-xl p-4" style={card}>
        <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🩺 Damage State Over Time</h2>
        <p className="text-xs mb-3" style={{ color: "#64748b" }}>Annual reef condition for <strong style={{ color: isDark ? "#e2e8f0" : "#0D1F3C" }}>{selectedSite}</strong> — 0 Healthy · 1 Watch · 2 Bleached · 3 Severe.</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="year" tick={TICK} label={{ value: "Year", position: "insideBottom", offset: -2, fill: TICK.fill, fontSize: 11 }} />
            <YAxis domain={[-0.2, 3.2]} ticks={[0, 1, 2, 3]} tick={{ ...TICK, fontSize: 11 }}
              tickFormatter={(v) => ["Healthy", "Watch", "Bleached", "Severe"][v] ?? ""} width={60} />
            <Tooltip contentStyle={TT} content={({ payload, label }) => {
              if (!payload?.[0]) return null;
              const pt = payload[0].payload as { year: number; damageState: string };
              return (
                <div style={{ ...TT, padding: "8px 12px" }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Year: {label}</div>
                  <div style={{ color: DAMAGE_COLORS[pt.damageState] ?? "#94a3b8", fontWeight: 600 }}>
                    {DAMAGE_LABELS[pt.damageState] ?? pt.damageState}
                  </div>
                </div>
              );
            }} />
            <Line type="stepAfter" dataKey="damageNum" strokeWidth={2.5}
              dot={({ cx, cy, payload }) => (
                <circle key={`dot-${payload.year}`} cx={cx} cy={cy} r={5}
                  fill={DAMAGE_COLORS[payload.damageState] ?? "#94a3b8"}
                  stroke={isDark ? "#070707" : "#fff"} strokeWidth={2} />
              )}
              stroke="#0d9488" name="Damage State" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Water Quality Chart ───────────────────────────── */
const SITE_PALETTE = [
  "#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#f97316","#ec4899","#84cc16","#6366f1",
];

function WaterQualityChart({
  waterQualityTimeSeries, isDark, GRID, TICK,
}: {
  waterQualityTimeSeries: WaterQualityTS[];
  isDark: boolean;
  GRID: string;
  TICK: { fill: string; fontSize: number };
}) {
  const allSites = waterQualityTimeSeries.map((s) => s.site);
  const [activeVar, setActiveVar] = useState<string>("dissolved_o2");
  const [selectedSites, setSelectedSites] = useState<string[]>(allSites.slice(0, 1));

  const varMeta = WQ_VARS.find((v) => v.key === activeVar) ?? WQ_VARS[0];

  // Toggle a site on/off; always keep at least one selected
  function toggleSite(site: string) {
    setSelectedSites((prev) => {
      if (prev.includes(site)) {
        return prev.length > 1 ? prev.filter((s) => s !== site) : prev;
      }
      return [...prev, site];
    });
  }

  // Build merged dataset keyed by year with one column per selected site
  const mergedMap = new Map<number, Record<string, number | null>>();
  selectedSites.forEach((site) => {
    const pts = waterQualityTimeSeries.find((s) => s.site === site)?.points ?? [];
    pts.forEach((p) => {
      const val = (p as Record<string, unknown>)[activeVar] as number | null;
      if (!mergedMap.has(p.year)) mergedMap.set(p.year, {});
      mergedMap.get(p.year)![site] = val;
    });
  });
  const chartData = Array.from(mergedMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, vals]) => ({ year, ...vals }));

  // Domain across all selected sites
  const allValues = selectedSites.flatMap((site) =>
    (waterQualityTimeSeries.find((s) => s.site === site)?.points ?? [])
      .map((p) => (p as Record<string, unknown>)[activeVar] as number | null)
      .filter((v): v is number => v !== null)
  );
  const minVal = allValues.length ? Math.min(...allValues) : 0;
  const maxVal = allValues.length ? Math.max(...allValues) : 1;
  const padding = (maxVal - minVal) * 0.15 || 0.5;

  const cardBg = isDark ? "#070707" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #DDE8F8";
  const cardShadow = isDark ? "none" : "0 4px 20px rgba(37,99,235,0.07), 0 1px 4px rgba(0,0,0,0.04)";

  const TT: React.CSSProperties = isDark
    ? { background: "#020202", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#e2e8f0", fontSize: 12 }
    : { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#334155", fontSize: 12 };

  // Stats for single-site view only
  const singleSitePts = selectedSites.length === 1
    ? (waterQualityTimeSeries.find((s) => s.site === selectedSites[0])?.points ?? [])
        .map((p) => (p as Record<string, unknown>)[activeVar] as number | null)
        .filter((v): v is number => v !== null)
    : [];

  return (
    <div className="rounded-2xl p-6" style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
            background: `linear-gradient(135deg, ${varMeta.gradient[0]}22, ${varMeta.gradient[1]}44)`,
            border: `1px solid ${varMeta.color}33`,
          }}>
            <span style={{ fontSize: 18 }}>💧</span>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: isDark ? "#f1f5f9" : "#0D1F3C" }}>Water Quality Trends</h2>
            <p style={{ margin: 0, fontSize: 12, color: isDark ? "#64748b" : "#4A6080" }}>
              {varMeta.label} over time · compare reef sites
            </p>
          </div>
        </div>

        {/* Variable selector tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {WQ_VARS.map((v) => {
            const active = v.key === activeVar;
            return (
              <button key={v.key} onClick={() => setActiveVar(v.key)} style={{
                padding: "7px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: active ? `1.5px solid ${v.color}` : isDark ? "1px solid #1C1C1C" : "1px solid #DDE8F8",
                background: active ? `linear-gradient(135deg, ${v.gradient[0]}22, ${v.gradient[1]}44)` : isDark ? "#0a0a0a" : "#F8FAFF",
                color: active ? v.color : isDark ? "#64748b" : "#94a3b8",
                transition: "all 0.2s",
                boxShadow: active ? `0 0 12px ${v.color}33` : "none",
              }}>
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Site selector */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: isDark ? "#475569" : "#4A6080", marginBottom: 8 }}>
          Select Sites to Compare
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {allSites.map((site, i) => {
            const siteColor = SITE_PALETTE[i % SITE_PALETTE.length];
            const active = selectedSites.includes(site);
            return (
              <button key={site} onClick={() => toggleSite(site)} style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: active ? `1.5px solid ${siteColor}` : isDark ? "1px solid #1C1C1C" : "1px solid #DDE8F8",
                background: active ? `${siteColor}18` : isDark ? "#0a0a0a" : "#F8FAFF",
                color: active ? siteColor : isDark ? "#475569" : "#94a3b8",
                transition: "all 0.2s",
                boxShadow: active ? `0 0 8px ${siteColor}33` : "none",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? siteColor : isDark ? "#334155" : "#cbd5e1", display: "inline-block", flexShrink: 0 }} />
                {site}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats row — only shown for single-site view */}
      {selectedSites.length === 1 && singleSitePts.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { label: "Current", val: singleSitePts[singleSitePts.length - 1]?.toFixed(2) ?? "—" },
            { label: "Min", val: Math.min(...singleSitePts).toFixed(2) },
            { label: "Max", val: Math.max(...singleSitePts).toFixed(2) },
            { label: "Avg", val: (singleSitePts.reduce((a, b) => a + b, 0) / singleSitePts.length).toFixed(2) },
          ].map((s) => (
            <div key={s.label} style={{
              flex: 1, minWidth: 80, padding: "10px 14px", borderRadius: 12,
              background: isDark ? "#0a0a0a" : "#F8FAFF",
              border: isDark ? `1px solid ${varMeta.color}22` : `1px solid ${varMeta.color}33`,
            }}>
              <div style={{ fontSize: 11, color: isDark ? "#475569" : "#94a3b8", marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: varMeta.color }}>{s.val}{varMeta.unit}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ right: 16, left: 0, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false}
            label={{ value: "Year", position: "insideBottom", offset: -4, fill: TICK.fill, fontSize: 11 }} />
          <YAxis
            domain={[Math.floor(minVal - padding), Math.ceil(maxVal + padding)]}
            tick={TICK} axisLine={false} tickLine={false} width={65}
            tickFormatter={(v: number) => Number(v).toFixed(1)}
            label={{ value: `${varMeta.label}${varMeta.unit}`, angle: -90, position: "insideLeft", fill: TICK.fill, fontSize: 11 }} />
          <Tooltip contentStyle={TT}
            formatter={(v: unknown, name: unknown) => [`${Number(v).toFixed(3)}${varMeta.unit}`, String(name)]}
            labelFormatter={(l) => `Year: ${l}`} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {selectedSites.map((site, i) => {
            const siteColor = SITE_PALETTE[i % SITE_PALETTE.length];
            return (
              <Line key={site} type="monotone" dataKey={site} stroke={siteColor} strokeWidth={2.5}
                dot={{ r: 4, fill: siteColor, stroke: isDark ? "#070707" : "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: siteColor, stroke: isDark ? "#070707" : "#fff", strokeWidth: 2 }}
                name={site} connectNulls />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Types for table + pies ───────────────────────── */
type RawRow = {
  year: number | null; month: number | null; day: number | null;
  site: string; lat: number | null; lon: number | null;
  temp: number | null; ssta: number | null; dhw: number | null;
  enso: string; chl: number | null; bleaching: number | null;
  damage: string; salinity: number | null; do2: number | null;
  ph: number | null; nitrate: number | null; depth: number | null;
  distShore: number | null; turbidity: number | null;
};

type PieStat = { name: string; value: number };

/* ── Dataset Table with Filters ────────────────────── */
const MONTH_NAMES = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAMAGE_BADGE: Record<string, string> = {
  healthy: "#22c55e", watch: "#eab308", bleached: "#ef4444",
  "severe bleach": "#7c3aed", "severe_bleach": "#7c3aed",
};

function DatasetTable({ rows, isDark }: { rows: RawRow[]; isDark: boolean }) {
  const [filterSite, setFilterSite] = useState<string>("All");
  const [filterYear, setFilterYear] = useState<string>("All");
  const [filterMonth, setFilterMonth] = useState<string>("All");
  const [filterDamage, setFilterDamage] = useState<string>("All");

  const sites   = useMemo(() => ["All", ...Array.from(new Set(rows.map(r => r.site))).sort()], [rows]);
  const years   = useMemo(() => ["All", ...Array.from(new Set(rows.map(r => String(r.year)).filter(Boolean))).sort()], [rows]);
  const months  = useMemo(() => ["All", ...Array.from(new Set(rows.map(r => r.month).filter(Boolean))).sort((a,b)=>Number(a)-Number(b)).map(m=>String(m))], [rows]);
  const damages = useMemo(() => ["All", ...Array.from(new Set(rows.map(r => (r.damage||"").toLowerCase()))).sort()], [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (filterSite  !== "All" && r.site !== filterSite)                             return false;
    if (filterYear  !== "All" && String(r.year) !== filterYear)                     return false;
    if (filterMonth !== "All" && String(r.month) !== filterMonth)                   return false;
    if (filterDamage !== "All" && (r.damage||"").toLowerCase() !== filterDamage)    return false;
    return true;
  }), [rows, filterSite, filterYear, filterMonth, filterDamage]);

  const cardBg     = isDark ? "#070707" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #DDE8F8";
  const cardShadow = isDark ? "none" : "0 4px 20px rgba(37,99,235,0.07),0 1px 4px rgba(0,0,0,0.04)";
  const headerBg   = isDark ? "#0a0a0a" : "#F0F5FF";
  const rowEven    = isDark ? "#050505" : "#fafcff";
  const rowOdd     = isDark ? "#070707" : "#ffffff";
  const textPri    = isDark ? "#e2e8f0" : "#0D1F3C";
  const textSec    = "#64748b";
  const borderCol  = isDark ? "#1C1C1C" : "#E4EDF7";
  const selStyle: React.CSSProperties = {
    background: isDark ? "#0a0a0a" : "#F8FAFF",
    border: isDark ? "1px solid #1C1C1C" : "1px solid #DDE8F8",
    color: textPri, borderRadius: 8, padding: "6px 12px",
    fontSize: 13, outline: "none", cursor: "pointer", minWidth: 130,
  };

  return (
    <div style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow, borderRadius: 16, padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: textPri }}>📋 Full Dataset View</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: textSec }}>
          All {rows.length} observation records — use filters to narrow down. Showing <strong style={{ color: textPri }}>{filtered.length}</strong> rows.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: textSec, marginBottom: 4 }}>Reef Site</div>
          <select value={filterSite} onChange={e => setFilterSite(e.target.value)} style={selStyle}>
            {sites.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: textSec, marginBottom: 4 }}>Year</div>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={selStyle}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: textSec, marginBottom: 4 }}>Month</div>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={selStyle}>
            {months.map(m => <option key={m} value={m}>{m === "All" ? "All" : MONTH_NAMES[Number(m)]}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: textSec, marginBottom: 4 }}>Reef Condition</div>
          <select value={filterDamage} onChange={e => setFilterDamage(e.target.value)} style={selStyle}>
            {damages.map(d => <option key={d} value={d}>{d === "All" ? "All" : d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
        </div>
        {(filterSite !== "All" || filterYear !== "All" || filterMonth !== "All" || filterDamage !== "All") && (
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button onClick={() => { setFilterSite("All"); setFilterYear("All"); setFilterMonth("All"); setFilterDamage("All"); }}
              style={{ padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: isDark ? "#1a1a1a" : "#eff6ff", color: "#3b82f6", border: "1px solid #3b82f633" }}>
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Scrollable table */}
      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 480, borderRadius: 10, border: `1px solid ${borderCol}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: headerBg, position: "sticky", top: 0, zIndex: 2 }}>
              {["Year","Month","Day","Site","Lat","Lon","Temp °C","SSTA","DHW","ENSO","Chl-a","Bleaching %","Condition","Salinity","DO₂","pH","Nitrate","Depth m","Shore km","Turbidity"].map(h => (
                <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, color: isDark ? "#94a3b8" : "#4A6080", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${borderCol}` }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const dmgKey = (r.damage||"").toLowerCase();
              const dmgColor = DAMAGE_BADGE[dmgKey] ?? "#94a3b8";
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? rowEven : rowOdd }}
                  onMouseEnter={e => (e.currentTarget.style.background = isDark ? "#0f1a24" : "#EEF4FF")}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? rowEven : rowOdd)}>
                  <td style={{ padding: "7px 12px", color: textPri, whiteSpace: "nowrap" }}>{r.year}</td>
                  <td style={{ padding: "7px 12px", color: textSec, whiteSpace: "nowrap" }}>{r.month ? MONTH_NAMES[r.month] : "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.day ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textPri, fontWeight: 600, whiteSpace: "nowrap" }}>{r.site}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.lat ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.lon ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: "#f97316", fontWeight: 600 }}>{r.temp ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.ssta ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: r.dhw != null && r.dhw > 4 ? "#ef4444" : textSec, fontWeight: r.dhw != null && r.dhw > 4 ? 700 : 400 }}>{r.dhw ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec, whiteSpace: "nowrap" }}>{r.enso}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.chl ?? "-"}</td>
                  <td style={{ padding: "7px 12px" }}>
                    <span style={{ fontWeight: 700, color: r.bleaching != null && r.bleaching > 50 ? "#ef4444" : r.bleaching != null && r.bleaching > 25 ? "#eab308" : "#22c55e" }}>
                      {r.bleaching ?? "-"}{r.bleaching != null ? "%" : ""}
                    </span>
                  </td>
                  <td style={{ padding: "7px 12px", whiteSpace: "nowrap" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: dmgColor + "20", color: dmgColor, border: `1px solid ${dmgColor}44` }}>
                      {(r.damage || "—").replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.salinity ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.do2 ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.ph ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.nitrate ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.depth ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.distShore ?? "-"}</td>
                  <td style={{ padding: "7px 12px", color: textSec }}>{r.turbidity ?? "-"}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={20} style={{ textAlign: "center", padding: 32, color: textSec }}>No records match the selected filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Pie Charts Section with shared filters ────────── */
const PIE_COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899","#84cc16"];
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BLEACH_BANDS = [
  { name: "None (0%)",        min: 0,     max: 0.001 },
  { name: "Low (0–25%)",      min: 0.001, max: 25 },
  { name: "Moderate (25–50%)",min: 25,    max: 50 },
  { name: "High (50–75%)",    min: 50,    max: 75 },
  { name: "Severe (75–100%)", min: 75,    max: 101 },
];

function computePieStats(rows: RawRow[]) {
  // Damage state
  const dmgMap: Record<string, number> = {};
  for (const r of rows) {
    const d = (r.damage || "unknown").toLowerCase();
    dmgMap[d] = (dmgMap[d] ?? 0) + 1;
  }
  const damageState = Object.entries(dmgMap)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1).replace("_", " "), value }))
    .sort((a, b) => b.value - a.value);

  // ENSO phase
  const ensoMap: Record<string, number> = {};
  for (const r of rows) {
    const p = r.enso || "Unknown";
    ensoMap[p] = (ensoMap[p] ?? 0) + 1;
  }
  const ensoPhase = Object.entries(ensoMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Bleaching severity
  const bleachSeverity = BLEACH_BANDS.map(({ name, min, max }) => ({
    name,
    value: rows.filter(r => r.bleaching != null && r.bleaching >= min && r.bleaching < max).length,
  })).filter(b => b.value > 0);

  // Observations per site
  const siteMap: Record<string, number> = {};
  for (const r of rows) { siteMap[r.site] = (siteMap[r.site] ?? 0) + 1; }
  const siteObservations = Object.entries(siteMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Monthly distribution
  const monthlyObservations = Array.from({ length: 12 }, (_, i) => ({
    name: MONTH_LABELS[i],
    value: rows.filter(r => r.month === i + 1).length,
  })).filter(m => m.value > 0);

  return { damageState, ensoPhase, bleachSeverity, siteObservations, monthlyObservations };
}

/* single pie card (pure display) */
function PieCard({ title, subtitle, data, isDark, donut = false }: {
  title: string; subtitle: string; data: PieStat[]; isDark: boolean; donut?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const cardBg = isDark ? "#070707" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #DDE8F8";
  const cardShadow = isDark ? "none" : "0 4px 20px rgba(37,99,235,0.07),0 1px 4px rgba(0,0,0,0.04)";
  const textPri = isDark ? "#e2e8f0" : "#0D1F3C";

  return (
    <div style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow, borderRadius: 16, padding: 20 }}>
      <h3 style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: textPri }}>{title}</h3>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>{subtitle}</p>
      {total === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: "#64748b" }}>No data for selected filters.</div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%"
                innerRadius={donut ? 45 : 0} outerRadius={70}
                paddingAngle={2} dataKey="value"
                onMouseEnter={(_, idx) => setActive(idx)}
                onMouseLeave={() => setActive(null)}
              >
                {data.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]}
                    opacity={active === null || active === i ? 1 : 0.35}
                    stroke={active === i ? (isDark ? "#fff" : "#0D1F3C") : "transparent"}
                    strokeWidth={active === i ? 2 : 0} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: isDark ? "#020202" : "#fff", border: isDark ? "1px solid #1f2937" : "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: isDark ? "#e2e8f0" : "#334155" }}
                formatter={(v: unknown) => [`${Number(v)} (${((Number(v) / total) * 100).toFixed(1)}%)`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ flex: 1, minWidth: 120, display: "flex", flexDirection: "column", gap: 5 }}>
            {data.map((d, i) => (
              <div key={`leg-${i}`}
                onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
                style={{ display: "flex", alignItems: "center", gap: 7, cursor: "default", opacity: active === null || active === i ? 1 : 0.45, transition: "opacity 0.15s" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, color: isDark ? "#94a3b8" : "#4A6080", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: PIE_COLORS[i % PIE_COLORS.length] }}>{((d.value / total) * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* monthly bar card */
function MonthlyBarCard({ data, isDark }: { data: { name: string; value: number }[]; isDark: boolean }) {
  const cardBg = isDark ? "#070707" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #DDE8F8";
  const cardShadow = isDark ? "none" : "0 4px 20px rgba(37,99,235,0.07),0 1px 4px rgba(0,0,0,0.04)";
  const textPri = isDark ? "#e2e8f0" : "#0D1F3C";
  const GRID = isDark ? "#1A1A1A" : "#f1f5f9";
  const TICK = { fill: isDark ? "#4a6080" : "#94a3b8", fontSize: 11 as const };
  const TT: React.CSSProperties = isDark
    ? { background: "#020202", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e2e8f0", fontSize: 12 }
    : { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, color: "#334155", fontSize: 12 };

  return (
    <div style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow, borderRadius: 16, padding: 20 }}>
      <h3 style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: textPri }}>📅 Survey Records by Month</h3>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>Which months have the most reef observations in the filtered selection.</p>
      {data.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: "#64748b" }}>No data for selected filters.</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ bottom: 16, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="name" tick={{ ...TICK, fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TT} />
            <Bar dataKey="value" name="Records" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => <Cell key={`mc-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* ── Shared filter panel + all 5 charts ─────────────── */
function PieChartsSection({ rows, isDark }: { rows: RawRow[]; isDark: boolean }) {
  const allYears = useMemo(() =>
    Array.from(new Set(rows.map(r => r.year).filter((y): y is number => y !== null))).sort((a, b) => a - b),
  [rows]);
  const allSites  = useMemo(() => Array.from(new Set(rows.map(r => r.site))).sort((a, b) => a.localeCompare(b)), [rows]);
  const allEnsos  = useMemo(() => Array.from(new Set(rows.map(r => r.enso).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [rows]);
  const allDamage = useMemo(() => Array.from(new Set(rows.map(r => (r.damage||"").toLowerCase()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [rows]);

  const minYear = allYears[0] ?? 2000;
  const maxYear = allYears[allYears.length - 1] ?? 2025;

  // Derive actual min/max dates from the dataset
  const minDateStr = useMemo(() => {
    let min = `${minYear}-01-01`;
    for (const r of rows) {
      if (r.year == null || r.month == null || r.day == null) continue;
      const s = `${r.year}-${String(r.month).padStart(2,"0")}-${String(r.day).padStart(2,"0")}`;
      if (s < min) min = s;
    }
    return min;
  }, [rows, minYear]);
  const maxDateStr = useMemo(() => {
    let max = `${maxYear}-12-31`;
    for (const r of rows) {
      if (r.year == null || r.month == null || r.day == null) continue;
      const s = `${r.year}-${String(r.month).padStart(2,"0")}-${String(r.day).padStart(2,"0")}`;
      if (s > max) max = s;
    }
    return max;
  }, [rows, maxYear]);

  const [dateFrom, setDateFrom] = useState<string>(minDateStr);
  const [dateTo,   setDateTo]   = useState<string>(maxDateStr);
  const [site,     setSite]     = useState<string>("All");
  const [enso,     setEnso]     = useState<string>("All");
  const [damage,   setDamage]   = useState<string>("All");

  // Sync initial state when data loads
  const dateFromNum = useMemo(() => dateFrom ? Number(dateFrom.replace(/-/g, "")) : 0, [dateFrom]);
  const dateToNum   = useMemo(() => dateTo   ? Number(dateTo.replace(/-/g, ""))   : 99999999, [dateTo]);

  const filtered = useMemo(() => rows.filter(r => {
    if (r.year != null && r.month != null && r.day != null) {
      const rowNum = r.year * 10000 + r.month * 100 + (r.day ?? 1);
      if (rowNum < dateFromNum || rowNum > dateToNum) return false;
    }
    if (site   !== "All" && r.site !== site)                                 return false;
    if (enso   !== "All" && r.enso !== enso)                                 return false;
    if (damage !== "All" && (r.damage||"").toLowerCase() !== damage)         return false;
    return true;
  }), [rows, dateFromNum, dateToNum, site, enso, damage]);

  const stats = useMemo(() => computePieStats(filtered), [filtered]);

  const cardBg = isDark ? "#070707" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #DDE8F8";
  const cardShadow = isDark ? "none" : "0 4px 20px rgba(37,99,235,0.07),0 1px 4px rgba(0,0,0,0.04)";
  const textPri = isDark ? "#e2e8f0" : "#0D1F3C";
  const textSec = "#64748b";
  const sel: React.CSSProperties = {
    background: isDark ? "#0a0a0a" : "#F8FAFF",
    border: isDark ? "1px solid #1C1C1C" : "1px solid #DDE8F8",
    color: textPri, borderRadius: 8, padding: "6px 10px",
    fontSize: 12, outline: "none", cursor: "pointer",
  };
  const dateInput: React.CSSProperties = {
    ...sel,
    padding: "6px 10px",
    minWidth: 140,
    colorScheme: isDark ? "dark" : "light",
  };

  const isFiltered = dateFrom !== minDateStr || dateTo !== maxDateStr || site !== "All" || enso !== "All" || damage !== "All";

  // Format date for display tag: "1 Jan 2005"
  const fmtDate = (s: string) => {
    const [y, m, d] = s.split("-");
    return `${Number(d)} ${MONTH_LABELS[Number(m) - 1]} ${y}`;
  };

  return (
    <div className="space-y-6">
      {/* Section heading */}
      <div>
        <h2 className="text-base font-bold mb-1" style={{ color: isDark ? "#f1f5f9" : "#0D1F3C" }}>🥧 What the Data Tells Us at a Glance</h2>
        <p className="text-xs" style={{ color: isDark ? "#64748b" : "#4A6080" }}>
          Simple breakdowns of reef conditions, climate patterns, bleaching levels, and survey coverage. Use the filters below to slice the dataset.
        </p>
      </div>

      {/* ── Filter panel ──────────────────────────────── */}
      <div style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow, borderRadius: 16, padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: textSec }}>
            Filter Charts
          </div>
          <div style={{ fontSize: 12, color: textSec }}>
            Showing <strong style={{ color: textPri }}>{filtered.length.toLocaleString()}</strong> of {rows.length.toLocaleString()} records
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>

          {/* Start Date */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: textSec, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>Start Date</div>
            <input
              type="date"
              value={dateFrom}
              min={minDateStr}
              max={dateTo}
              onChange={e => { if (e.target.value) setDateFrom(e.target.value); }}
              style={dateInput}
            />
          </div>

          {/* End Date */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: textSec, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>End Date</div>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              max={maxDateStr}
              onChange={e => { if (e.target.value) setDateTo(e.target.value); }}
              style={dateInput}
            />
          </div>

          {/* Reef Site */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: textSec, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>Reef Site</div>
            <select value={site} onChange={e => setSite(e.target.value)} style={{ ...sel, minWidth: 150 }}>
              <option value="All">All Sites</option>
              {allSites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* ENSO Phase */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: textSec, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>Climate Phase (ENSO)</div>
            <select value={enso} onChange={e => setEnso(e.target.value)} style={{ ...sel, minWidth: 120 }}>
              <option value="All">All Phases</option>
              {allEnsos.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* Reef Condition */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: textSec, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>Reef Condition</div>
            <select value={damage} onChange={e => setDamage(e.target.value)} style={{ ...sel, minWidth: 130 }}>
              <option value="All">All Conditions</option>
              {allDamage.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1).replace("_", " ")}</option>)}
            </select>
          </div>

          {/* Reset */}
          {isFiltered && (
            <button
              onClick={() => { setDateFrom(minDateStr); setDateTo(maxDateStr); setSite("All"); setEnso("All"); setDamage("All"); }}
              style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: isDark ? "#1a1a1a" : "#eff6ff", color: "#3b82f6", border: "1px solid #3b82f633", alignSelf: "flex-end" }}>
              Reset
            </button>
          )}
        </div>

        {/* Active filter tags */}
        {isFiltered && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {(dateFrom !== minDateStr || dateTo !== maxDateStr) && (
              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#3b82f620", color: "#3b82f6", border: "1px solid #3b82f640" }}>
                {fmtDate(dateFrom)} → {fmtDate(dateTo)}
              </span>
            )}
            {site !== "All" && (
              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#10b98120", color: "#10b981", border: "1px solid #10b98140" }}>
                {site}
              </span>
            )}
            {enso !== "All" && (
              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#8b5cf620", color: "#8b5cf6", border: "1px solid #8b5cf640" }}>
                {enso}
              </span>
            )}
            {damage !== "All" && (
              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#f59e0b20", color: "#f59e0b", border: "1px solid #f59e0b40" }}>
                {damage.replace("_", " ")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Charts ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PieCard
          title="Reef Condition Breakdown"
          subtitle="How many observations fall into each reef health category."
          data={stats.damageState}
          isDark={isDark}
        />
        <PieCard
          title="Climate Phase (ENSO) Distribution"
          subtitle="Share of records during El Niño, La Niña, and Neutral ocean conditions."
          data={stats.ensoPhase}
          isDark={isDark}
          donut
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PieCard
          title="Bleaching Severity Spread"
          subtitle="What share of observations show no, low, moderate, high, or severe bleaching."
          data={stats.bleachSeverity}
          isDark={isDark}
        />
        <PieCard
          title="Observations per Reef Site"
          subtitle="How many records were collected at each monitored location."
          data={stats.siteObservations}
          isDark={isDark}
          donut
        />
      </div>

      <MonthlyBarCard data={stats.monthlyObservations} isDark={isDark} />
    </div>
  );
}

export default function GlobalOverviewPage() {
  const { data, loading, error, isDark } = useDashboardData();
  const [selectedSite, setSelectedSite] = useState<string>("");

  const GRID = isDark ? "#1A1A1A" : "#f1f5f9";
  const TICK = { fill: isDark ? "#4a6080" : "#94a3b8", fontSize: 11 as const };
  const TT = isDark
    ? { background: "#020202", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#e2e8f0", fontSize: 12 }
    : { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#334155", fontSize: 12 };
  const card = {
    background: isDark ? "#070707" : "#FFFFFF",
    border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #DDE8F8",
    boxShadow: isDark ? "none" : "0 4px 20px rgba(37,99,235,0.07), 0 1px 4px rgba(0,0,0,0.04)",
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: isDark ? "#030303" : "#F0F5FF", color: isDark ? "#94a3b8" : "#64748b" }}>
      <div className="text-center"><div className="text-4xl mb-3 animate-pulse">🌊</div><div>Loading reef summary...</div></div>
    </div>
  );
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!data) return null;

  const p1 = data.page1;
  if (!p1?.kpis || !p1?.models) {
    return <div className="p-8 text-yellow-600">⚠ Page data not yet available. Check the API route or reload.</div>;
  }
  const kpis = p1.kpis;

  // Initialise selectedSite once data is available
  const allSiteNames = ((p1.siteTimeSeries ?? []) as SiteTS[]).map((s) => s.site);
  const resolvedSite = selectedSite || allSiteNames[0] || "";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="-mx-6 -mt-6 px-6 py-4 mb-2" style={{background:"transparent",border:"none"}}>
        <h1 className="text-lg font-bold" style={{ color: isDark ? "#f1f5f9" : "#0D1F3C" }}>🌍 Islandwide Reef Overview</h1>
        <p className="text-sm mt-0.5" style={{ color: isDark ? "#64748b" : "#4A6080" }}>A clear summary of bleaching risk, heat stress, and reef conditions across monitored sites.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="col-span-2 lg:col-span-1 rounded-2xl flex items-center justify-center" style={{
          ...card,
          background: isDark
            ? "linear-gradient(135deg, #0d0d0d 0%, #111827 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)",
          border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #dbeafe",
          padding: "12px 8px",
          boxShadow: isDark ? "0 0 0 1px rgba(255,255,255,0.03)" : "0 2px 12px rgba(34,197,94,0.12), 0 1px 3px rgba(0,0,0,0.05)",
        }}>
          <RiskGauge value={kpis.globalRiskIndex} />
        </div>
        <KPICard title="High Risk Sites"      value={`${kpis.highRiskPercent}%`} sub="Sites currently under high stress"  gauge={kpis.highRiskPercent}  isDark={isDark} accentKey="risk"   />
        <KPICard title="Avg Heat Stress (DHW)" value={kpis.avgDHW}               sub="Degree Heating Weeks"              gauge={kpis.avgDHW * 5}       isDark={isDark} accentKey="heat"   />
        <KPICard title="Avg Bleaching"         value={`${kpis.avgBleaching}%`}   sub="Across all monitored sites"        gauge={kpis.avgBleaching}     isDark={isDark} accentKey="bleach" />
        <KPICard title="Total Sites"           value={kpis.totalSites}            sub="Monitored reef sites"                                            isDark={isDark} accentKey="sites"  />
      </div>

      {/* Sri Lanka Reef Site Map - full width */}
      <SriLankaMap geoData={(p1.geoClusterData ?? []) as GeoSite[]} isDark={isDark} card={card} />

      {/* Time-Series Charts: Bleaching % + Damage State per site */}
      <SiteTimeSeriesCharts siteTimeSeries={(p1.siteTimeSeries ?? []) as SiteTS[]} isDark={isDark} card={card} GRID={GRID} TICK={TICK} TT={TT} selectedSite={resolvedSite} setSelectedSite={setSelectedSite} />

      {/* Water Quality Chart - full width */}
      <WaterQualityChart waterQualityTimeSeries={(p1.waterQualityTimeSeries ?? []) as WaterQualityTS[]} isDark={isDark} GRID={GRID} TICK={TICK} />

      {/* ── Full Dataset Table ─────────────────────────────── */}
      <DatasetTable rows={(p1.rawTableRows ?? []) as RawRow[]} isDark={isDark} />

      {/* ── Dataset Insight Pie Charts ─────────────────────── */}
      <PieChartsSection rows={(p1.rawTableRows ?? []) as RawRow[]} isDark={isDark} />
    </div>
  );
}
