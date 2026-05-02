"use client";
import { useState } from "react";
import { useDashboardData } from "../useDashboardData";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  Legend,
} from "recharts";

function formatFeatureLabel(raw: string): string {
  const key = raw.toLowerCase();
  if (key.includes("dhw")) return "Heat Stress (DHW)";
  if (key.includes("ssta")) return "Unusually Warm Water";
  if (key.includes("temp")) return "Sea Temperature";
  if (key.includes("turb")) return "Water Turbidity";
  if (key === "ph" || key.includes("ph")) return "Water pH";
  if (key.includes("chlorophyll")) return "Chlorophyll";
  if (key.includes("depth")) return "Depth";
  return raw.replaceAll("_", " ");
}

const ALL_SITES = "__all_sites__";

const DRIVER_VARIABLES = [
  { key: "temp", label: "Sea Temperature", unit: "C", decimals: 1 },
  { key: "dhw", label: "Heat Stress (DHW)", unit: "DHW", decimals: 1 },
  { key: "ssta", label: "Unusually Warm Water", unit: "C", decimals: 2 },
  { key: "turbidity", label: "Water Turbidity", unit: "NTU", decimals: 2 },
  { key: "ph", label: "Water pH", unit: "pH", decimals: 2 },
  { key: "salinity", label: "Salinity", unit: "ppt", decimals: 1 },
  { key: "do2", label: "Dissolved O2", unit: "mg/L", decimals: 1 },
  { key: "nitrate", label: "Nitrate", unit: "uM", decimals: 2 },
  { key: "depth", label: "Depth", unit: "m", decimals: 1 },
  { key: "chl", label: "Chlorophyll", unit: "mg/m3", decimals: 2 },
] as const;

type DriverVariableKey = (typeof DRIVER_VARIABLES)[number]["key"];
type DriverVariableMeta = (typeof DRIVER_VARIABLES)[number];

type DriverRow = {
  site: string;
  temp: number | null;
  dhw: number | null;
  ssta: number | null;
  turbidity: number | null;
  ph: number | null;
  salinity: number | null;
  do2: number | null;
  nitrate: number | null;
  depth: number | null;
  chl: number | null;
  bleaching: number | null;
  damage: string | null;
};

type DriverTrendPoint = {
  x: number;
  bleaching: number;
  damageScore: number;
  damageLabel: string;
  count: number;
};

type ChartTick = {
  fill: string;
  fontSize: number;
};

const DAMAGE_TICKS = ["Healthy", "Watch", "Bleached", "Severe"];
const DAMAGE_BANDS = ["Healthy", "Moderate", "Severe"] as const;
const DAMAGE_BAND_COLORS: Record<(typeof DAMAGE_BANDS)[number], string> = {
  Healthy: "#22c55e",
  Moderate: "#f59e0b",
  Severe: "#ef4444",
};

const DAMAGE_VARIABLES = [
  { key: "salinity", label: "Salinity", unit: "ppt", color: "#06b6d4", decimals: 1 },
  { key: "do2", label: "Dissolved O2", unit: "mg/L", color: "#3b82f6", decimals: 1 },
  { key: "ph", label: "pH", unit: "pH", color: "#8b5cf6", decimals: 2 },
  { key: "nitrate", label: "Nitrate", unit: "uM", color: "#f97316", decimals: 2 },
] as const;

type DamageBand = (typeof DAMAGE_BANDS)[number];
type DamageVariableKey = (typeof DAMAGE_VARIABLES)[number]["key"];

type ChlorophyllPoint = {
  chlorophyll: number;
  bleaching: number;
  site: string;
  damageBand: DamageBand;
  damageLabel: string;
};

type TemperatureSstaPoint = {
  temperature: number;
  ssta: number;
  site: string;
  count: number;
  avgBleaching: number | null;
};

type DamageStateValuePoint = {
  state: DamageBand;
  value: number;
  count: number;
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normaliseDamageState(value: string | null | undefined): string {
  return (value ?? "healthy").toLowerCase().trim();
}

function damageStateScore(value: string | null | undefined): number {
  const normalized = normaliseDamageState(value);
  if (normalized === "watch") return 1;
  if (normalized === "bleached") return 2;
  if (normalized === "severe_bleach") return 3;
  return 0;
}

function damageStateLabel(value: string | null | undefined): string {
  const normalized = normaliseDamageState(value);
  if (normalized === "watch") return "Watch";
  if (normalized === "bleached") return "Bleached";
  if (normalized === "severe_bleach") return "Severe";
  return "Healthy";
}

function damageBand(value: string | null | undefined): DamageBand {
  const normalized = normaliseDamageState(value);
  if (normalized === "healthy") return "Healthy";
  if (normalized === "severe_bleach" || normalized === "severe" || normalized === "severe bleach") return "Severe";
  return "Moderate";
}

function getVariableMeta(key: DriverVariableKey): DriverVariableMeta {
  return DRIVER_VARIABLES.find((item) => item.key === key) ?? DRIVER_VARIABLES[0];
}

function formatVariableValue(value: number, meta: DriverVariableMeta): string {
  const rounded = value.toFixed(meta.decimals);
  return meta.unit ? `${rounded} ${meta.unit}` : rounded;
}

function buildTemperatureSstaData(rows: DriverRow[], selectedSite: string): TemperatureSstaPoint[] {
  const filteredRows = rows
    .filter((row) => selectedSite === ALL_SITES || row.site === selectedSite)
    .filter((row) => row.temp !== null && row.ssta !== null)
    .map((row) => ({
      temperature: row.temp as number,
      ssta: row.ssta as number,
      site: row.site,
      bleaching: row.bleaching,
    }))
    .sort((a, b) => a.temperature - b.temperature);

  if (filteredRows.length === 0) return [];

  if (filteredRows.length <= 20) {
    return filteredRows.map((row) => ({
      temperature: +row.temperature.toFixed(2),
      ssta: +row.ssta.toFixed(3),
      site: row.site,
      count: 1,
      avgBleaching: row.bleaching,
    }));
  }

  const targetBins = Math.min(18, Math.max(8, Math.round(Math.sqrt(filteredRows.length))));
  const chunkSize = Math.max(1, Math.ceil(filteredRows.length / targetBins));
  const grouped: TemperatureSstaPoint[] = [];

  for (let index = 0; index < filteredRows.length; index += chunkSize) {
    const slice = filteredRows.slice(index, index + chunkSize);
    const bleachingValues = slice.map((row) => row.bleaching).filter((value): value is number => value !== null);
    grouped.push({
      temperature: +average(slice.map((row) => row.temperature)).toFixed(2),
      ssta: +average(slice.map((row) => row.ssta)).toFixed(3),
      site: selectedSite === ALL_SITES ? "All reef sites" : selectedSite,
      count: slice.length,
      avgBleaching: bleachingValues.length ? +average(bleachingValues).toFixed(1) : null,
    });
  }

  return grouped;
}

function buildDamageStateValues(rows: DriverRow[], key: DamageVariableKey, decimals: number): DamageStateValuePoint[] {
  return DAMAGE_BANDS.map((state) => {
    const values = rows
      .filter((row) => row[key] !== null && damageBand(row.damage) === state)
      .map((row) => Number(row[key]));

    return {
      state,
      value: values.length ? +average(values).toFixed(decimals) : 0,
      count: values.length,
    };
  });
}

function buildDriverTrendData(rows: DriverRow[], selectedSite: string, selectedVariableKey: DriverVariableKey): DriverTrendPoint[] {
  const filteredRows = rows
    .filter((row) => selectedSite === ALL_SITES || row.site === selectedSite)
    .filter((row) => row.bleaching !== null && row[selectedVariableKey] !== null)
    .map((row) => ({
      x: Number(row[selectedVariableKey]),
      bleaching: row.bleaching as number,
      damage: normaliseDamageState(row.damage),
    }))
    .filter((row) => Number.isFinite(row.x))
    .sort((a, b) => a.x - b.x);

  if (filteredRows.length === 0) return [];

  if (filteredRows.length <= 18) {
    return filteredRows.map((row) => ({
      x: +row.x.toFixed(2),
      bleaching: +row.bleaching.toFixed(1),
      damageScore: damageStateScore(row.damage),
      damageLabel: damageStateLabel(row.damage),
      count: 1,
    }));
  }

  const targetBins = Math.min(14, Math.max(6, Math.round(Math.sqrt(filteredRows.length))));
  const chunkSize = Math.max(1, Math.ceil(filteredRows.length / targetBins));
  const grouped: DriverTrendPoint[] = [];

  for (let index = 0; index < filteredRows.length; index += chunkSize) {
    const slice = filteredRows.slice(index, index + chunkSize);
    const counts: Record<string, number> = {};
    for (const row of slice) counts[row.damage] = (counts[row.damage] ?? 0) + 1;
    const dominantDamage = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "healthy";

    grouped.push({
      x: +average(slice.map((row) => row.x)).toFixed(2),
      bleaching: +average(slice.map((row) => row.bleaching)).toFixed(1),
      damageScore: damageStateScore(dominantDamage),
      damageLabel: damageStateLabel(dominantDamage),
      count: slice.length,
    });
  }

  return grouped;
}

function DriverTrendTooltip({
  active,
  payload,
  label,
  variableMeta,
  isDark,
}: Readonly<{
  active?: boolean;
  payload?: Array<{ payload: DriverTrendPoint }>;
  label?: number;
  variableMeta: DriverVariableMeta;
  isDark: boolean;
}>) {
  if (!active || !payload?.[0] || typeof label !== "number") return null;

  const point = payload[0].payload;

  return (
    <div
      className="rounded-lg p-3 text-xs shadow-md"
      style={{
        background: isDark ? "#020202" : "#ffffff",
        border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
        color: isDark ? "#e2e8f0" : "#334155",
      }}
    >
      <div className="font-semibold">{variableMeta.label}</div>
      <div>{formatVariableValue(label, variableMeta)}</div>
      <div className="mt-1">Bleaching: {point.bleaching.toFixed(1)}%</div>
      <div>Damage state: {point.damageLabel}</div>
      <div style={{ color: isDark ? "#94a3b8" : "#64748b" }}>Observations grouped: {point.count}</div>
    </div>
  );
}

function DriverTrendPlot({
  trendData,
  selectedVariable,
  isDark,
  GRID,
  TICK,
}: Readonly<{
  trendData: DriverTrendPoint[];
  selectedVariable: DriverVariableMeta;
  isDark: boolean;
  GRID: string;
  TICK: ChartTick;
}>) {
  const axisLabel = `${selectedVariable.label} (${selectedVariable.unit})`;

  if (trendData.length === 0) {
    return (
      <div className="flex h-[380px] items-center justify-center text-sm" style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>
        Not enough records for this site and variable yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={380}>
      <LineChart data={trendData} margin={{ left: 4, right: 6, top: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis
          type="number"
          dataKey="x"
          tick={TICK}
          domain={["dataMin", "dataMax"]}
          tickFormatter={(value) => Number(value).toFixed(selectedVariable.decimals)}
          label={{
            value: axisLabel,
            position: "insideBottom",
            offset: -2,
            fill: TICK.fill,
            fontSize: 11,
          }}
        />
        <YAxis
          yAxisId="bleaching"
          tick={TICK}
          domain={[0, 100]}
          label={{ value: "Bleaching %", angle: -90, position: "insideLeft", fill: TICK.fill, fontSize: 11 }}
        />
        <YAxis
          yAxisId="damage"
          orientation="right"
          domain={[0, 3]}
          ticks={[0, 1, 2, 3]}
          width={72}
          tick={{ fill: TICK.fill, fontSize: 10 }}
          tickFormatter={(value) => DAMAGE_TICKS[Number(value)] ?? ""}
          label={{ value: "Damage State", angle: 90, position: "insideRight", fill: TICK.fill, fontSize: 11 }}
        />
        <Tooltip content={<DriverTrendTooltip variableMeta={selectedVariable} isDark={isDark} />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          yAxisId="bleaching"
          type="monotone"
          dataKey="bleaching"
          stroke="#06b6d4"
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 4 }}
          name="Bleaching %"
        />
        <Line
          yAxisId="damage"
          type="stepAfter"
          dataKey="damageScore"
          stroke="#f97316"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
          name="Damage state"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ModelTrainingFeatureCard({
  featureImportances,
  card,
  isDark,
  GRID,
  TICK,
}: Readonly<{
  featureImportances: Array<{ feature: string; importance: number; label: string }>;
  card: React.CSSProperties;
  isDark: boolean;
  GRID: string;
  TICK: ChartTick;
}>) {
  const rankedData = featureImportances.map((item, index) => ({
    ...item,
    rank: index + 1,
    rankedLabel: `#${index + 1} ${item.label}`,
  }));

  return (
    <div className="rounded-xl p-4" style={card}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🤖 Model Training: Feature Importance Ranking</h2>
          <p className="text-xs" style={{ color: "#64748b" }}>
            This ranking comes from the trained random forest model. Higher scores mean the model relied more on that factor when learning bleaching patterns.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs md:min-w-[260px]">
          <div className="rounded-lg p-2" style={{ background: isDark ? "#020202" : "#ffffff", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #DDE8F8" }}>
            <div style={{ color: isDark ? "#94a3b8" : "#64748b" }}>Trained model</div>
            <div className="font-semibold" style={{ color: isDark ? "#67e8f9" : "#0f766e" }}>Random Forest</div>
          </div>
          <div className="rounded-lg p-2" style={{ background: isDark ? "#020202" : "#ffffff", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #DDE8F8" }}>
            <div style={{ color: isDark ? "#94a3b8" : "#64748b" }}>Top ranked factor</div>
            <div className="font-semibold" style={{ color: isDark ? "#67e8f9" : "#0f766e" }}>{rankedData[0]?.label ?? "No data"}</div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={rankedData} layout="vertical" margin={{ left: 8, right: 18, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis
              type="number"
              tick={TICK}
              label={{ value: "Feature importance from trained model (%)", position: "insideBottom", offset: -2, fill: TICK.fill, fontSize: 11 }}
            />
            <YAxis type="category" dataKey="rankedLabel" tick={{ fill: TICK.fill, fontSize: 10 }} width={170} />
            <Tooltip
              contentStyle={{
                background: isDark ? "#020202" : "#ffffff",
                border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
                borderRadius: "10px",
                color: isDark ? "#e2e8f0" : "#334155",
                fontSize: 12,
              }}
              formatter={(value) => [`${Number(value ?? 0).toFixed(2)}%`, "Importance"]}
            />
            <Bar dataKey="importance" radius={[0, 8, 8, 0]} fill="#14b8a6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DriverTrendCard({
  rawRows,
  card,
  isDark,
  GRID,
  TICK,
}: Readonly<{
  rawRows: DriverRow[];
  card: React.CSSProperties;
  isDark: boolean;
  GRID: string;
  TICK: ChartTick;
}>) {
  const [selectedSite, setSelectedSite] = useState<string>(ALL_SITES);
  const [selectedVariableKey, setSelectedVariableKey] = useState<DriverVariableKey>("temp");

  const siteOptions = [...new Set(rawRows.map((row) => row.site))].sort((a, b) => a.localeCompare(b));
  const selectedVariable = getVariableMeta(selectedVariableKey);
  const trendData = buildDriverTrendData(rawRows, selectedSite, selectedVariableKey);
  const trendSiteLabel = selectedSite === ALL_SITES ? "All reef sites" : selectedSite;

  return (
    <div className="rounded-xl p-4" style={card}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>📈 Bleaching Trend by Site and Condition</h2>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Pick a reef site and one condition to see how bleaching and damage change across that variable.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:min-w-[360px]">
          <label className="text-xs font-medium" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>
            <span className="mb-1 block">Reef site</span>
            <select
              value={selectedSite}
              onChange={(event) => setSelectedSite(event.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                background: isDark ? "#020202" : "#ffffff",
                border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #DDE8F8",
                color: isDark ? "#f1f5f9" : "#1e293b",
              }}
            >
              <option value={ALL_SITES}>All reef sites</option>
              {siteOptions.map((site) => (
                <option key={site} value={site}>{site}</option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>
            <span className="mb-1 block">Variable on x-axis</span>
            <select
              value={selectedVariableKey}
              onChange={(event) => setSelectedVariableKey(event.target.value as DriverVariableKey)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                background: isDark ? "#020202" : "#ffffff",
                border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #DDE8F8",
                color: isDark ? "#f1f5f9" : "#1e293b",
              }}
            >
              {DRIVER_VARIABLES.map((variable) => (
                <option key={variable.key} value={variable.key}>{variable.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-3 mb-2 flex flex-wrap items-center gap-3 text-xs" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>
        <span className="rounded-full px-3 py-1" style={{ background: isDark ? "rgba(6,182,212,0.1)" : "#ecfeff", color: isDark ? "#67e8f9" : "#0f766e" }}>
          {trendSiteLabel}
        </span>
        <span>
          X-axis: {selectedVariable.label} ({selectedVariable.unit})
        </span>
        <span>
          {trendData.length > 0 ? `${trendData.length} grouped points shown` : "No matching records"}
        </span>
      </div>

      <DriverTrendPlot trendData={trendData} selectedVariable={selectedVariable} isDark={isDark} GRID={GRID} TICK={TICK} />
    </div>
  );
}

function ChlorophyllBleachingTooltip({
  active,
  payload,
  isDark,
}: Readonly<{
  active?: boolean;
  payload?: Array<{ payload: ChlorophyllPoint }>;
  isDark: boolean;
}>) {
  if (!active || !payload?.[0]) return null;

  const point = payload[0].payload;

  return (
    <div
      className="rounded-lg p-3 text-xs shadow-md"
      style={{
        background: isDark ? "#020202" : "#ffffff",
        border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
        color: isDark ? "#e2e8f0" : "#334155",
      }}
    >
      <div className="font-semibold">{point.site}</div>
      <div>Chlorophyll: {point.chlorophyll.toFixed(2)} mg/m3</div>
      <div>Bleaching: {point.bleaching.toFixed(1)}%</div>
      <div>Damage band: {point.damageBand}</div>
    </div>
  );
}

function ChlorophyllBleachingCard({
  rawRows,
  card,
  isDark,
  GRID,
  TICK,
}: Readonly<{
  rawRows: DriverRow[];
  card: React.CSSProperties;
  isDark: boolean;
  GRID: string;
  TICK: ChartTick;
}>) {
  const points = rawRows
    .filter((row) => row.chl !== null && row.bleaching !== null)
    .map((row) => ({
      chlorophyll: row.chl as number,
      bleaching: row.bleaching as number,
      site: row.site,
      damageBand: damageBand(row.damage),
      damageLabel: damageStateLabel(row.damage),
    }));

  return (
    <div className="rounded-xl p-4" style={card}>
      <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🟢 Chlorophyll vs Bleaching</h2>
      <p className="text-xs mb-1" style={{ color: "#64748b" }}>
        This scatter plot helps show how nutrient pollution signals can be linked with bleaching at monitored reef sites.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ left: 4, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis
            type="number"
            dataKey="chlorophyll"
            tick={TICK}
            label={{ value: "Chlorophyll (mg/m3)", position: "insideBottom", offset: -2, fill: TICK.fill, fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="bleaching"
            tick={TICK}
            domain={[0, 100]}
            label={{ value: "Bleaching %", angle: -90, position: "insideLeft", fill: TICK.fill, fontSize: 11 }}
          />
          <Tooltip content={<ChlorophyllBleachingTooltip isDark={isDark} />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {DAMAGE_BANDS.map((bandName) => (
            <Scatter
              key={bandName}
              name={bandName}
              data={points.filter((point) => point.damageBand === bandName)}
              fill={DAMAGE_BAND_COLORS[bandName]}
              opacity={0.78}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function TemperatureSstaTooltip({
  active,
  payload,
  label,
  isDark,
}: Readonly<{
  active?: boolean;
  payload?: Array<{ payload: TemperatureSstaPoint }>;
  label?: number;
  isDark: boolean;
}>) {
  if (!active || !payload?.[0] || typeof label !== "number") return null;

  const point = payload[0].payload;

  return (
    <div
      className="rounded-lg p-3 text-xs shadow-md"
      style={{
        background: isDark ? "#020202" : "#ffffff",
        border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
        color: isDark ? "#e2e8f0" : "#334155",
      }}
    >
      <div className="font-semibold">{point.site}</div>
      <div>Temperature: {label.toFixed(2)} C</div>
      <div>SSTA: {point.ssta.toFixed(3)} C</div>
      {point.avgBleaching !== null ? <div>Avg bleaching: {point.avgBleaching.toFixed(1)}%</div> : null}
      <div style={{ color: isDark ? "#94a3b8" : "#64748b" }}>Observations grouped: {point.count}</div>
    </div>
  );
}

function TemperatureSstaTrendCard({
  rawRows,
  card,
  isDark,
  GRID,
  TICK,
}: Readonly<{
  rawRows: DriverRow[];
  card: React.CSSProperties;
  isDark: boolean;
  GRID: string;
  TICK: ChartTick;
}>) {
  const [selectedSite, setSelectedSite] = useState<string>(ALL_SITES);
  const siteOptions = [...new Set(rawRows.map((row) => row.site))].sort((a, b) => a.localeCompare(b));
  const trendData = buildTemperatureSstaData(rawRows, selectedSite);
  const selectedSiteLabel = selectedSite === ALL_SITES ? "All reef sites" : selectedSite;

  return (
    <div className="rounded-xl p-4" style={card}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>🌡️ Temperature vs SSTA Trend</h2>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Change the site to compare how sea surface temperature anomaly shifts as temperature changes.
          </p>
        </div>
        <label className="text-xs font-medium md:min-w-[220px]" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>
          <span className="mb-1 block">Reef site</span>
          <select
            value={selectedSite}
            onChange={(event) => setSelectedSite(event.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: isDark ? "#020202" : "#ffffff",
              border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #DDE8F8",
              color: isDark ? "#f1f5f9" : "#1e293b",
            }}
          >
            <option value={ALL_SITES}>All reef sites</option>
            {siteOptions.map((site) => (
              <option key={site} value={site}>{site}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 mb-2 flex flex-wrap items-center gap-3 text-xs" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>
        <span className="rounded-full px-3 py-1" style={{ background: isDark ? "rgba(6,182,212,0.1)" : "#ecfeff", color: isDark ? "#67e8f9" : "#0f766e" }}>
          {selectedSiteLabel}
        </span>
        <span>{trendData.length > 0 ? `${trendData.length} trend points shown` : "No matching records"}</span>
      </div>

      {trendData.length > 0 ? (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={trendData} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis
              type="number"
              dataKey="temperature"
              tick={TICK}
              domain={["dataMin", "dataMax"]}
              tickFormatter={(value) => Number(value).toFixed(1)}
              label={{ value: "Temperature (C)", position: "insideBottom", offset: -2, fill: TICK.fill, fontSize: 11 }}
            />
            <YAxis
              tick={TICK}
              label={{ value: "SSTA (C)", angle: -90, position: "insideLeft", fill: TICK.fill, fontSize: 11 }}
            />
            <Tooltip content={<TemperatureSstaTooltip isDark={isDark} />} />
            <Line
              type="monotone"
              dataKey="ssta"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ r: 3, fill: "#8b5cf6" }}
              activeDot={{ r: 5 }}
              name="SSTA"
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[320px] items-center justify-center text-sm" style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>
          Not enough temperature and SSTA records for this site yet.
        </div>
      )}
    </div>
  );
}

function DamageStateValueTooltip({
  active,
  payload,
  isDark,
  unit,
}: Readonly<{
  active?: boolean;
  payload?: Array<{ payload: DamageStateValuePoint }>;
  isDark: boolean;
  unit: string;
}>) {
  if (!active || !payload?.[0]) return null;

  const point = payload[0].payload;

  return (
    <div
      className="rounded-lg p-3 text-xs shadow-md"
      style={{
        background: isDark ? "#020202" : "#ffffff",
        border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
        color: isDark ? "#e2e8f0" : "#334155",
      }}
    >
      <div className="font-semibold">{point.state}</div>
      <div>Average value: {point.value.toFixed(unit === "pH" ? 2 : 1)} {unit}</div>
      <div style={{ color: isDark ? "#94a3b8" : "#64748b" }}>Records used: {point.count}</div>
    </div>
  );
}

function DamageStateVariableChart({
  rawRows,
  variable,
  isDark,
  GRID,
  TICK,
}: Readonly<{
  rawRows: DriverRow[];
  variable: (typeof DAMAGE_VARIABLES)[number];
  isDark: boolean;
  GRID: string;
  TICK: ChartTick;
}>) {
  const data = buildDamageStateValues(rawRows, variable.key, variable.decimals);

  return (
    <div className="rounded-lg p-3" style={{ background: isDark ? "#020202" : "#ffffff", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #DDE8F8" }}>
      <div className="mb-2">
        <div className="font-semibold" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>{variable.label}</div>
        <div className="text-xs" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>Average {variable.label.toLowerCase()} by damage group</div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ left: 0, right: 4, top: 8, bottom: 6 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="state" tick={{ fill: TICK.fill, fontSize: 10 }} />
          <YAxis tick={{ fill: TICK.fill, fontSize: 10 }} label={{ value: variable.unit, angle: -90, position: "insideLeft", fill: TICK.fill, fontSize: 10 }} />
          <Tooltip content={<DamageStateValueTooltip isDark={isDark} unit={variable.unit} />} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.state} fill={DAMAGE_BAND_COLORS[entry.state]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DamageStateVariablesCard({
  rawRows,
  card,
  isDark,
  GRID,
  TICK,
}: Readonly<{
  rawRows: DriverRow[];
  card: React.CSSProperties;
  isDark: boolean;
  GRID: string;
  TICK: ChartTick;
}>) {
  return (
    <div className="rounded-xl p-4" style={card}>
      <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>📊 Water Quality by Damage State</h2>
      <p className="text-xs mb-3" style={{ color: "#64748b" }}>
        These small charts compare average salinity, dissolved oxygen, pH, and nitrate across Healthy, Moderate, and Severe damage groups.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DAMAGE_VARIABLES.map((variable) => (
          <DamageStateVariableChart key={variable.key} rawRows={rawRows} variable={variable} isDark={isDark} GRID={GRID} TICK={TICK} />
        ))}
      </div>
    </div>
  );
}

export default function DriversPage() {
  const { data, loading, error, isDark } = useDashboardData();
  const GRID = isDark ? "#1A1A1A" : "#f1f5f9";
  const TICK = { fill: isDark ? "#4a6080" : "#94a3b8", fontSize: 11 as const };
  const card = {
    background: isDark ? "#070707" : "#FFFFFF",
    border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #DDE8F8",
    boxShadow: isDark ? "none" : "0 4px 20px rgba(37,99,235,0.07), 0 1px 4px rgba(0,0,0,0.04)",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: isDark ? "#030303" : "transparent", color: isDark ? "#94a3b8" : "#64748b" }}>
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🌡️</div>
          <div>Loading bleaching driver insights...</div>
        </div>
      </div>
    );
  }

  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!data) return null;

  const p4 = data.page4;
  if (!p4?.models?.randomForest) {
    return <div className="p-8 text-yellow-600">⚠ Driver analysis data not available. Check the API route or reload.</div>;
  }

  const rawRows = ((data.page1?.rawTableRows ?? []) as DriverRow[]).filter((row) => row.site);

  const featureImportances = ((p4.featureImportances ?? []) as { feature: string; importance: number }[]).map((item) => ({
    ...item,
    label: formatFeatureLabel(item.feature),
  }));
  const ensoBoxPlot = (p4.ensoBoxPlot ?? []) as {
    phase: string;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    mean: number;
  }[];

  const topDriver = featureImportances[0]?.label ?? "Not enough data";

  return (
    <div className="p-6 space-y-6">
      <div className="-mx-6 -mt-6 px-6 py-4 mb-2" style={{background:"transparent",border:"none"}}>
        <h1 className="text-lg font-bold" style={{ color: isDark ? "#f1f5f9" : "#0D1F3C" }}>🌡️ What Is Driving Bleaching?</h1>
        <p className="text-sm mt-0.5" style={{ color: isDark ? "#64748b" : "#4A6080" }}>Clear explanations of which ocean conditions are most linked to reef bleaching.</p>
      </div>

      <div className="rounded-xl p-4" style={{ background: isDark ? "rgba(34,197,94,0.06)" : "#f0fdf4", border: isDark ? "1px solid rgba(34,197,94,0.15)" : "1px solid #bbf7d0" }}>
        <h2 className="text-sm font-semibold" style={{ color: isDark ? "#86efac" : "#15803d" }}>How to Read This Page</h2>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: isDark ? "#86efac" : "#15803d" }}>
          Use these charts to identify the strongest bleaching drivers, spot risky condition combinations, and guide where teams should act first.
        </p>
        <div className="mt-2 grid grid-cols-4 gap-3 text-xs">
          {[
            { label: "Top Driver", val: topDriver },
            { label: "Nutrient Signal", val: "Check whether higher chlorophyll levels align with more bleaching" },
            { label: "Site Trend", val: "Compare temperature and SSTA patterns for any reef site" },
            { label: "Field Use", val: "Prioritize patrols and mitigation at highest-risk sites" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg p-2" style={{ background: isDark ? "#020202" : "#ffffff", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #DDE8F8" }}>
              <div className="font-bold" style={{ color: isDark ? "#86efac" : "#15803d" }}>{s.label}</div>
              <div style={{ color: isDark ? "#94a3b8" : "#64748b" }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      <DriverTrendCard rawRows={rawRows} card={card} isDark={isDark} GRID={GRID} TICK={TICK} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModelTrainingFeatureCard featureImportances={featureImportances} card={card} isDark={isDark} GRID={GRID} TICK={TICK} />
        <ChlorophyllBleachingCard rawRows={rawRows} card={card} isDark={isDark} GRID={GRID} TICK={TICK} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TemperatureSstaTrendCard rawRows={rawRows} card={card} isDark={isDark} GRID={GRID} TICK={TICK} />
        <DamageStateVariablesCard rawRows={rawRows} card={card} isDark={isDark} GRID={GRID} TICK={TICK} />
      </div>

      <div className="rounded-xl p-4" style={card}>
        <h2 className="font-semibold mb-1" style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>📦 Bleaching Levels by ENSO Climate Phase</h2>
        <p className="text-xs mb-3" style={{ color: "#64748b" }}>
          Compare bleaching spread during El Nino, La Nina, and Neutral conditions.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ensoBoxPlot.map((phase) => (
            <div key={phase.phase} className="rounded-lg p-3" style={{ background: isDark ? "#020202" : "#ffffff", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #DDE8F8" }}>
              <div className="font-semibold mb-2" style={{ color: isDark ? "#5eead4" : "#0f766e" }}>{phase.phase}</div>
              {[
                { label: "Highest", val: phase.max, color: "text-red-500" },
                { label: "Upper 25%", val: phase.q3, color: "text-orange-500" },
                { label: "Middle", val: phase.median, color: "text-yellow-600" },
                { label: "Average", val: phase.mean, color: isDark ? "text-slate-300" : "text-slate-700" },
                { label: "Lower 25%", val: phase.q1, color: "text-blue-500" },
                { label: "Lowest", val: phase.min, color: "text-green-500" },
              ].map((s) => (
                <div key={s.label} className="flex justify-between text-xs py-0.5" style={{ borderBottom: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9" }}>
                  <span style={{ color: isDark ? "#4a6080" : "#94a3b8" }}>{s.label}</span>
                  <span className={s.color}>{s.val?.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: isDark ? "rgba(16,185,129,0.06)" : "#ecfdf5", border: isDark ? "1px solid rgba(16,185,129,0.15)" : "1px solid #a7f3d0" }}>
        <h3 className="font-semibold mb-2" style={{ color: isDark ? "#6ee7b7" : "#065f46" }}>🧭 What This Means for Coastal Teams</h3>
        <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: isDark ? "#34d399" : "#047857" }}>
          <li>Start weekly checks on sites affected by the strongest driver shown in the ranking chart.</li>
          <li>Watch sites where chlorophyll rises alongside bleaching, as this can point to nutrient pollution or runoff stress.</li>
          <li>Use the site temperature and SSTA trend to spot locations where unusual warming builds up fastest.</li>
          <li>Compare salinity, dissolved oxygen, pH, and nitrate across damage groups to identify which water-quality conditions align with severe damage.</li>
        </ul>
      </div>
    </div>
  );
}