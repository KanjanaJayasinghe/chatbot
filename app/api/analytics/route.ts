import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

const toN = (v: unknown): number | null => { const x = Number(v); return Number.isNaN(x) || v === "" || v == null ? null : x; };
const avg = (a: number[]) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const safeAvg = (a: (number | null)[]) => { const v = a.filter((x): x is number => x !== null); return v.length ? avg(v) : 0; };
function computeStats(vals: number[]) {
  if (!vals.length) return { mean: 0, min: 0, max: 0, std: 0, count: 0 };
  const mean = avg(vals);
  const std = Math.sqrt(avg(vals.map((v) => Math.pow(v - mean, 2))));
  return { mean: +mean.toFixed(3), min: +Math.min(...vals).toFixed(3), max: +Math.max(...vals).toFixed(3), std: +std.toFixed(3), count: vals.length };
}
function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((g, item) => { const k = key(item); (g[k] ??= []).push(item); return g; }, {} as Record<string, T[]>);
}
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const NUMERIC_PARAMS = ["Temperature_Celsius","SSTA","DHW_Stress","Chlorophyll_A_mg_m3","Bleaching_Percent","Salinity","Dissolved_O2","pH","Nitrate","Depth_m","Distance_to_Shore_km","Turbidity_NTU"] as const;

export async function GET() {
  try {
    const db = getAdminDb();
    const [countSnap, snap] = await Promise.all([
      db.collection("dataset").count().get(),
      db.collection("dataset").limit(2000).get(),
    ]);
    const totalCount = countSnap.data().count;

    interface Row {
      Year: number | null; Month: number | null; Day: number | null;
      Site_Name: string; Latitude: number | null; Longitude: number | null;
      Temperature_Celsius: number | null; SSTA: number | null; DHW_Stress: number | null;
      ENSO_Phase: string; Chlorophyll_A_mg_m3: number | null; Bleaching_Percent: number | null;
      Damage_State: string; Salinity: number | null; Dissolved_O2: number | null;
      pH: number | null; Nitrate: number | null; Depth_m: number | null;
      Distance_to_Shore_km: number | null; Turbidity_NTU: number | null;
    }
    const rows: Row[] = snap.docs.map((d) => {
      const r = d.data();
      return {
        Year: toN(r.Year), Month: toN(r.Month), Day: toN(r.Day),
        Site_Name: String(r.Site_Name ?? "Unknown"),
        Latitude: toN(r.Latitude), Longitude: toN(r.Longitude),
        Temperature_Celsius: toN(r.Temperature_Celsius), SSTA: toN(r.SSTA), DHW_Stress: toN(r.DHW_Stress),
        ENSO_Phase: String(r.ENSO_Phase ?? "Unknown"),
        Chlorophyll_A_mg_m3: toN(r.Chlorophyll_A_mg_m3), Bleaching_Percent: toN(r.Bleaching_Percent),
        Damage_State: String(r.Damage_State ?? "Unknown"),
        Salinity: toN(r.Salinity), Dissolved_O2: toN(r.Dissolved_O2), pH: toN(r.pH),
        Nitrate: toN(r.Nitrate), Depth_m: toN(r.Depth_m),
        Distance_to_Shore_km: toN(r.Distance_to_Shore_km), Turbidity_NTU: toN(r.Turbidity_NTU),
      };
    });

    const years = rows.map((r) => r.Year).filter((y): y is number => y !== null);
    const dateRange = { min: Math.min(...years), max: Math.max(...years) };
    const uniqueSites = [...new Set(rows.map((r) => r.Site_Name))].sort();
    const bleachVals = rows.map((r) => r.Bleaching_Percent).filter((v): v is number => v !== null);
    const tempVals = rows.map((r) => r.Temperature_Celsius).filter((v): v is number => v !== null);
    const dhwVals = rows.map((r) => r.DHW_Stress).filter((v): v is number => v !== null);
    const healthyCount = rows.filter((r) => r.Damage_State?.toLowerCase() === "healthy").length;

    const bySite = groupBy(rows, (r) => r.Site_Name);
    const mostAffectedSite = Object.entries(bySite)
      .map(([site, recs]) => ({ site, avg: safeAvg(recs.map((r) => r.Bleaching_Percent)) }))
      .sort((a, b) => b.avg - a.avg)[0]?.site ?? "N/A";

    const byYear = groupBy(rows.filter((r) => r.Year !== null), (r) => String(r.Year));
    const bleachingByYear = Object.entries(byYear)
      .map(([year, recs]) => ({
        year: Number(year),
        avgBleaching: +safeAvg(recs.map((r) => r.Bleaching_Percent)).toFixed(2),
        avgTemp: +safeAvg(recs.map((r) => r.Temperature_Celsius)).toFixed(2),
        avgDHW: +safeAvg(recs.map((r) => r.DHW_Stress)).toFixed(2),
        count: recs.length,
      }))
      .sort((a, b) => a.year - b.year);

    const siteStats = Object.entries(bySite).map(([site, recs]) => {
      const dmgCounts = recs.reduce((c, r) => { c[r.Damage_State] = (c[r.Damage_State] ?? 0) + 1; return c; }, {} as Record<string, number>);
      const dominantDamage = Object.entries(dmgCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";
      return {
        site, count: recs.length, dominantDamage,
        lat: recs[0]?.Latitude ?? null, lon: recs[0]?.Longitude ?? null,
        avgBleaching: +safeAvg(recs.map((r) => r.Bleaching_Percent)).toFixed(2),
        avgTemp: +safeAvg(recs.map((r) => r.Temperature_Celsius)).toFixed(2),
        avgDHW: +safeAvg(recs.map((r) => r.DHW_Stress)).toFixed(2),
        avgChlorophyll: +safeAvg(recs.map((r) => r.Chlorophyll_A_mg_m3)).toFixed(3),
      };
    }).sort((a, b) => b.avgBleaching - a.avgBleaching);

    const dmgGroups = groupBy(rows, (r) => r.Damage_State);
    const damageDistribution = Object.entries(dmgGroups)
      .map(([state, recs]) => ({ state: state.charAt(0).toUpperCase() + state.slice(1), count: recs.length, percent: +((recs.length / rows.length) * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count);

    const ensoGroups = groupBy(rows, (r) => r.ENSO_Phase);
    const ensoStats = Object.entries(ensoGroups).map(([phase, recs]) => ({
      phase, count: recs.length,
      avgBleaching: +safeAvg(recs.map((r) => r.Bleaching_Percent)).toFixed(2),
      avgTemp: +safeAvg(recs.map((r) => r.Temperature_Celsius)).toFixed(2),
      avgDHW: +safeAvg(recs.map((r) => r.DHW_Stress)).toFixed(2),
    }));

    const byMonth = groupBy(rows.filter((r) => r.Month !== null), (r) => String(r.Month));
    const monthlyStats = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1; const recs = byMonth[String(m)] ?? [];
      return { month: MONTH_NAMES[i], monthNum: m, count: recs.length,
        avgTemp: +safeAvg(recs.map((r) => r.Temperature_Celsius)).toFixed(2),
        avgBleaching: +safeAvg(recs.map((r) => r.Bleaching_Percent)).toFixed(2),
        avgDHW: +safeAvg(recs.map((r) => r.DHW_Stress)).toFixed(2) };
    });

    const scatterData = rows
      .filter((r) => r.Temperature_Celsius !== null && r.Bleaching_Percent !== null)
      .slice(0, 250)
      .map((r) => ({ x: r.Temperature_Celsius as number, y: r.Bleaching_Percent as number, site: r.Site_Name, enso: r.ENSO_Phase, dhw: r.DHW_Stress ?? 0 }));

    const dhwScatter = rows
      .filter((r) => r.DHW_Stress !== null && r.Bleaching_Percent !== null)
      .slice(0, 200)
      .map((r) => ({ x: r.DHW_Stress as number, y: r.Bleaching_Percent as number, site: r.Site_Name }));

    const topSites = [...uniqueSites].sort((a, b) => (bySite[b]?.length ?? 0) - (bySite[a]?.length ?? 0)).slice(0, 8);
    const radarData = topSites.map((site) => {
      const recs = bySite[site] ?? [];
      return {
        site: site.split(" ").slice(0, 2).join(" "),
        health: +Math.max(0, 100 - safeAvg(recs.map((r) => r.Bleaching_Percent))).toFixed(1),
        dhwStress: +Math.min(100, safeAvg(recs.map((r) => r.DHW_Stress)) * 10).toFixed(1),
        turbidity: +Math.min(100, safeAvg(recs.map((r) => r.Turbidity_NTU)) * 20).toFixed(1),
        chlorophyll: +Math.min(100, safeAvg(recs.map((r) => r.Chlorophyll_A_mg_m3)) * 50).toFixed(1),
      };
    });

    const paramStats: Record<string, ReturnType<typeof computeStats>> = {};
    for (const p of NUMERIC_PARAMS) {
      const vals = rows.map((r) => r[p as keyof Row] as number | null).filter((v): v is number => v !== null);
      paramStats[p] = computeStats(vals);
    }

    const depthBands = [
      { range: "0-10m", min: 0, max: 10 }, { range: "10-20m", min: 10, max: 20 },
      { range: "20-30m", min: 20, max: 30 }, { range: "30-50m", min: 30, max: 50 },
      { range: "50m+", min: 50, max: Infinity },
    ].map((band) => {
      const recs = rows.filter((r) => r.Depth_m !== null && r.Depth_m >= band.min && r.Depth_m < band.max && r.Bleaching_Percent !== null);
      return { range: band.range, count: recs.length, avgBleaching: +safeAvg(recs.map((r) => r.Bleaching_Percent)).toFixed(2) };
    });

    const result = {
      computedAt: new Date().toISOString(),
      totalCount, sampleSize: rows.length, dateRange, uniqueSites,
      kpis: {
        avgBleaching: +avg(bleachVals).toFixed(2),
        avgTemperature: +avg(tempVals).toFixed(2),
        avgDHW: +avg(dhwVals).toFixed(2),
        healthyPercent: +((healthyCount / rows.length) * 100).toFixed(1),
        mostAffectedSite, totalSites: uniqueSites.length,
      },
      bleachingByYear, siteStats, damageDistribution, ensoStats, monthlyStats,
      scatterData, dhwScatter, radarData, depthBands, paramStats,
    };

    // Save to analytics_cache/latest
    try {
      await db.collection("analytics_cache").doc("latest").set({
        ...result,
        scatterData: result.scatterData.slice(0, 40),
        dhwScatter: result.dhwScatter.slice(0, 40),
        firestoreUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (cacheErr) { console.warn("Cache save failed (non-fatal):", cacheErr); }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
