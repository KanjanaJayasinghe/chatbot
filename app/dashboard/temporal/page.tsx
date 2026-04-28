// PAGE 3 – Site-Level Forecasting (rebuilt)
// ─────────────────────────────────────────────────────────────────────────────
//  ML Models (all run client-side):
//  1. SARIMA-lite  (lib/models/forecasting.ts)
//     - Seasonal differencing period=12, AR(3) Levinson-Durbin, MA(2) dampened
//     - 95% CI: ±1.96·σ·√h
//  2. AR(3) ENSO encoder  (lib/models/forecasting.ts)
//     - Encodes phase as numeric, AR(3) forecast, maps back to phase + confidence
// ─────────────────────────────────────────────────────────────────────────────
"use client";
import { useDashboardData } from "../useDashboardData";
import { useState, useMemo, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
  AreaChart, Area, BarChart, Bar, Cell,
} from "recharts";
import {
  runSiteForecasts,
  type SiteForecastResult,
  type RawRow,
} from "../../../lib/models/forecasting";

const SITE_COLORS = [
  "#06b6d4","#a78bfa","#34d399","#f87171",
  "#fbbf24","#60a5fa","#f472b6","#2dd4bf",
];
const ENSO_COLOR: Record<string,string> = {
  "El Niño":"#f97316","La Niña":"#3b82f6","Neutral":"#22c55e",
};
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function GlowBadge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:4,
      padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700,
      background:`${color}22`,color,border:`1px solid ${color}44`,
    }}>{children}</span>
  );
}

function StatChip({ label, value, color, isDark }: { label:string;value:string|number;color:string;isDark:boolean }) {
  return (
    <div style={{
      background:isDark?"#0a0a0a":"#f8faff",border:`1px solid ${color}33`,
      borderRadius:10,padding:"8px 14px",display:"flex",flexDirection:"column",gap:2,
    }}>
      <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em"}}>{label}</div>
      <div style={{fontSize:18,fontWeight:800,color}}>{value}</div>
    </div>
  );
}

function SiteChip({ site,selected,color,onClick }: { site:string;selected:boolean;color:string;onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{
      padding:"5px 13px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.15s",
      background:selected?color:"transparent",
      color:selected?"#ffffff":color,
      border:`1.5px solid ${color}`,
      boxShadow:selected?`0 0 12px ${color}55`:"none",
    }}>{site}</button>
  );
}

function ENSOPhaseBadge({ phase,confidence }: { phase:string;confidence:number }) {
  const color = ENSO_COLOR[phase]??"#94a3b8";
  return (
    <div style={{
      display:"flex",flexDirection:"column",alignItems:"center",gap:3,
      background:`${color}15`,border:`1px solid ${color}30`,
      borderRadius:10,padding:"8px 12px",minWidth:90,
    }}>
      <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em"}}>Phase</div>
      <div style={{fontSize:14,fontWeight:800,color}}>{phase}</div>
      <div style={{fontSize:10,color,fontWeight:600}}>{confidence.toFixed(0)}% conf.</div>
    </div>
  );
}

function addMonthsHelper(year:number,month:number,n:number){
  const total=(year*12+(month-1))+n;
  return{year:Math.floor(total/12),month:(total%12)+1};
}

export default function TemporalPage() {
  const { data, loading, error, isDark } = useDashboardData();

  const card: React.CSSProperties = {
    background:isDark?"#070707":"#FFFFFF",
    border:isDark?"1px solid rgba(255,255,255,0.07)":"1px solid #DDE8F8",
    boxShadow:isDark?"none":"0 4px 24px rgba(37,99,235,0.07), 0 1px 4px rgba(0,0,0,0.04)",
    borderRadius:18,
  };
  const GRID = isDark?"#1a1a1a":"#f1f5f9";
  const TICK = {fill:isDark?"#475569":"#94a3b8",fontSize:10 as const};
  const TT_STYLE = isDark
    ?{background:"#0f172a",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",color:"#e2e8f0",fontSize:12}
    :{background:"#fff",border:"1px solid #e2e8f0",borderRadius:"12px",color:"#334155",fontSize:12};

  const [selectedSites,setSelectedSites] = useState<string[]>([]);
  const [targetDate,setTargetDate]       = useState<string>("");
  const [running,setRunning]             = useState(false);
  const [results,setResults]             = useState<SiteForecastResult[]|null>(null);
  const [activeTab,setActiveTab]         = useState<"bleaching"|"enso">("bleaching");
  const [activeSiteIdx,setActiveSiteIdx] = useState(0);

  const rawRows = useMemo<RawRow[]>(()=>{
    if(!data?.page1?.rawTableRows) return [];
    return data.page1.rawTableRows as RawRow[];
  },[data]);

  const allSites = useMemo(()=>
    Array.from(new Set(rawRows.map(r=>r.site).filter(Boolean))).sort()
  ,[rawRows]);

  const maxTargetDate = useMemo(()=>{
    if(rawRows.length===0) return "";
    const maxYear=Math.max(...rawRows.map(r=>r.year??0));
    const maxMonth=Math.max(...rawRows.filter(r=>r.year===maxYear).map(r=>r.month??0));
    const{year,month}=addMonthsHelper(maxYear,maxMonth,12);
    return`${year}-${String(month).padStart(2,"0")}-28`;
  },[rawRows]);

  const minTargetDate = useMemo(()=>{
    if(rawRows.length===0) return "";
    const maxYear=Math.max(...rawRows.map(r=>r.year??0));
    const maxMonth=Math.max(...rawRows.filter(r=>r.year===maxYear).map(r=>r.month??0));
    const{year,month}=addMonthsHelper(maxYear,maxMonth,1);
    return`${year}-${String(month).padStart(2,"0")}-01`;
  },[rawRows]);

  const toggleSite=useCallback((site:string)=>{
    setSelectedSites(prev=>prev.includes(site)?prev.filter(s=>s!==site):[...prev,site]);
    setResults(null);
  },[]);

  const handleForecast=useCallback(async()=>{
    if(!targetDate||selectedSites.length===0) return;
    setRunning(true);
    setResults(null);
    await new Promise(r=>setTimeout(r,60));
    try{
      const[ty,tm]=targetDate.split("-").map(Number);
      const res=runSiteForecasts(rawRows,selectedSites,ty,tm);
      setResults(res);
      setActiveSiteIdx(0);
    }finally{
      setRunning(false);
    }
  },[targetDate,selectedSites,rawRows]);

  const multiSiteComparison=useMemo(()=>{
    if(!results||results.length<2) return[];
    const allLabels=Array.from(new Set(results.flatMap(r=>r.bleaching.map(p=>p.label))));
    return allLabels.slice(-24).map(label=>{
      const row:Record<string,string|number>={label};
      results.forEach(r=>{
        const pt=r.bleaching.find(p=>p.label===label);
        if(pt) row[r.site]=pt.actual??pt.forecast??0;
      });
      return row;
    });
  },[results]);

  if(loading) return(
    <div className="flex items-center justify-center h-screen" style={{background:isDark?"#030303":"#F0F5FF"}}>
      <div className="text-center">
        <div style={{fontSize:48,marginBottom:12}} className="animate-pulse">🔮</div>
        <div style={{color:isDark?"#94a3b8":"#64748b",fontWeight:600}}>Loading forecast engine...</div>
      </div>
    </div>
  );
  if(error) return<div className="p-8 text-red-500">Error: {error}</div>;
  if(!data)  return null;

  const activeResult=results?.[activeSiteIdx]??null;
  const bleachChartData=activeResult?.bleaching??[];
  const ensoData=activeResult?.enso??[];
  const ensoFuturePoints=ensoData.filter(p=>p.actualPhase===null);
  const nextENSO=ensoFuturePoints[0];
  const canForecast=selectedSites.length>0&&targetDate!=="";

  return(
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div style={{
        background:isDark
          ?"linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)"
          :"linear-gradient(135deg,#e0f2fe 0%,#ede9fe 100%)",
        borderBottom:isDark?"1px solid rgba(255,255,255,0.06)":"1px solid #dbeafe",
        padding:"16px 24px 14px",flexShrink:0,
      }}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div>
            <h1 style={{fontSize:18,fontWeight:800,color:isDark?"#f1f5f9":"#0f172a",margin:0}}>
              🔮 Site-Level Reef Forecasting
            </h1>
            <p style={{fontSize:12,color:isDark?"#64748b":"#4A6080",marginTop:3,margin:0}}>
              Select sites, choose a target month, and run ML-based bleaching &amp; ENSO phase forecasts (max 12 months ahead).
            </p>
          </div>
          <div style={{display:"flex",gap:6}}>
            <GlowBadge color="#06b6d4">SARIMA-lite</GlowBadge>
            <GlowBadge color="#a78bfa">AR(3) ENSO</GlowBadge>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:20}}>

        {/* Control panel */}
        <div style={{
          ...card,padding:"20px 24px",
          background:isDark
            ?"linear-gradient(135deg,#070707 0%,#0f0f1a 100%)"
            :"linear-gradient(135deg,#ffffff 0%,#f0f7ff 100%)",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
            <div style={{width:3,height:18,borderRadius:2,background:"linear-gradient(180deg,#06b6d4,#a78bfa)"}}/>
            <h2 style={{fontSize:13,fontWeight:700,color:isDark?"#f1f5f9":"#0f172a",margin:0}}>Configure Forecast</h2>
          </div>

          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#64748b",marginBottom:8}}>
              Select Reef Sites <span style={{color:"#a78bfa"}}>({selectedSites.length} selected)</span>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {allSites.map((site,i)=>(
                <SiteChip key={site} site={site} selected={selectedSites.includes(site)}
                  color={SITE_COLORS[i%SITE_COLORS.length]} onClick={()=>toggleSite(site)}/>
              ))}
              <button onClick={()=>{setSelectedSites(allSites);setResults(null);}} style={{
                padding:"5px 13px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",
                background:selectedSites.length===allSites.length?"#f1f5f9":"transparent",
                color:"#64748b",border:"1.5px solid #64748b",
              }}>All Sites</button>
              {selectedSites.length>0&&(
                <button onClick={()=>{setSelectedSites([]);setResults(null);}} style={{
                  padding:"5px 13px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",
                  background:"transparent",color:"#ef4444",border:"1.5px solid #ef4444",
                }}>Clear</button>
              )}
            </div>
          </div>

          <div style={{display:"flex",alignItems:"flex-end",gap:16,flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#64748b",marginBottom:6}}>
                Forecast Until
              </div>
              <input type="date" value={targetDate} min={minTargetDate} max={maxTargetDate}
                onChange={e=>{setTargetDate(e.target.value);setResults(null);}}
                style={{
                  background:isDark?"#0a0a0a":"#f8faff",
                  border:isDark?"1px solid #1e293b":"1px solid #dbeafe",
                  color:isDark?"#e2e8f0":"#0f172a",
                  borderRadius:10,padding:"8px 14px",fontSize:13,outline:"none",cursor:"pointer",
                  colorScheme:isDark?"dark":"light",
                }}/>
              {maxTargetDate&&(
                <div style={{fontSize:10,color:"#64748b",marginTop:4}}>
                  Max: {MONTH_NAMES[Number(maxTargetDate.split("-")[1])-1]} {maxTargetDate.split("-")[0]} (12 months ahead)
                </div>
              )}
            </div>

            <button disabled={!canForecast||running} onClick={handleForecast} style={{
              padding:"10px 28px",borderRadius:12,fontSize:13,fontWeight:700,
              cursor:canForecast&&!running?"pointer":"not-allowed",
              background:canForecast&&!running?"linear-gradient(135deg,#06b6d4,#a78bfa)":(isDark?"#1e293b":"#e2e8f0"),
              color:canForecast&&!running?"#ffffff":"#64748b",
              border:"none",transition:"all 0.2s",
              boxShadow:canForecast&&!running?"0 4px 20px rgba(6,182,212,0.4)":"none",
              display:"flex",alignItems:"center",gap:8,
            }}>
              {running?"⚙️ Training models...":"▶ Run Forecast"}
            </button>

            {!canForecast&&(
              <div style={{fontSize:12,color:"#f59e0b"}}>
                {selectedSites.length===0?"⚠ Select at least one site.":"⚠ Choose a target date."}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {results&&results.length>0&&(
          <>
            {results.length>1&&(
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {results.map((r,i)=>(
                  <button key={r.site} onClick={()=>setActiveSiteIdx(i)} style={{
                    padding:"6px 16px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",
                    background:activeSiteIdx===i?SITE_COLORS[i%SITE_COLORS.length]:"transparent",
                    color:activeSiteIdx===i?"#fff":SITE_COLORS[i%SITE_COLORS.length],
                    border:`1.5px solid ${SITE_COLORS[i%SITE_COLORS.length]}`,
                    boxShadow:activeSiteIdx===i?`0 0 14px ${SITE_COLORS[i%SITE_COLORS.length]}55`:"none",
                  }}>{r.site}</button>
                ))}
              </div>
            )}

            {activeResult&&(
              <div style={{...card,padding:"16px 20px"}}>
                <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#64748b",marginBottom:12}}>
                  📊 Model Training Summary — {activeResult.site}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                  <StatChip label="Model" value="SARIMA(3,0,2)" color="#06b6d4" isDark={isDark}/>
                  <StatChip label="Training Obs." value={activeResult.nObs} color="#a78bfa" isDark={isDark}/>
                  <StatChip label="RMSE" value={`${activeResult.diagnostics.rmse}%`} color="#34d399" isDark={isDark}/>
                  <StatChip label="MAE" value={`${activeResult.diagnostics.mae}%`} color="#fbbf24" isDark={isDark}/>
                  <StatChip label="Data Range" value={`${activeResult.diagnostics.dataYearRange[0]}–${activeResult.diagnostics.dataYearRange[1]}`} color="#f87171" isDark={isDark}/>
                  <StatChip label="Horizon" value={`${bleachChartData.filter(p=>p.forecast!=null).length} months`} color="#60a5fa" isDark={isDark}/>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{display:"flex",gap:4,background:isDark?"#0a0a0a":"#f1f5f9",borderRadius:12,padding:4,width:"fit-content"}}>
              {(["bleaching","enso"] as const).map(tab=>(
                <button key={tab} onClick={()=>setActiveTab(tab)} style={{
                  padding:"7px 20px",borderRadius:9,fontSize:12,fontWeight:700,cursor:"pointer",border:"none",
                  background:activeTab===tab?(isDark?"#1e293b":"#ffffff"):"transparent",
                  color:activeTab===tab?(tab==="bleaching"?"#06b6d4":"#a78bfa"):"#64748b",
                  boxShadow:activeTab===tab?"0 2px 8px rgba(0,0,0,0.1)":"none",
                  transition:"all 0.15s",
                }}>
                  {tab==="bleaching"?"🪸 Bleaching %":"🌀 ENSO Phase"}
                </button>
              ))}
            </div>

            {/* Bleaching tab */}
            {activeTab==="bleaching"&&activeResult&&(
              <div style={{display:"flex",flexDirection:"column",gap:20}}>
                <div style={{...card,padding:"20px 24px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                    <div>
                      <h2 style={{fontSize:14,fontWeight:700,color:isDark?"#f1f5f9":"#0f172a",margin:0}}>
                        🪸 Bleaching % Forecast — {activeResult.site}
                      </h2>
                      <p style={{fontSize:11,color:"#64748b",marginTop:3}}>
                        Solid = historical · Dashed = SARIMA forecast · Shaded = 95% confidence band
                      </p>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <GlowBadge color="#06b6d4">Historical</GlowBadge>
                      <GlowBadge color="#a78bfa">Forecast</GlowBadge>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={bleachChartData} margin={{top:10,right:20,left:0,bottom:60}}>
                      <defs>
                        <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3}/>
                          <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.15}/>
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                      <XAxis dataKey="label" tick={{...TICK,fontSize:9}} angle={-40} textAnchor="end"
                        interval={Math.floor(bleachChartData.length/10)} tickLine={false} axisLine={false}/>
                      <YAxis tick={TICK} tickLine={false} axisLine={false} domain={[0,"auto"]}
                        label={{value:"Avg Bleaching %",angle:-90,position:"insideLeft",fill:TICK.fill,fontSize:10,dy:50}}/>
                      <Tooltip contentStyle={TT_STYLE}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11,color:"#64748b",paddingTop:16}}/>
                      <Area type="monotone" dataKey="upper" stroke="none" fill="url(#bandGrad)"
                        name="Upper 95% CI" dot={false} legendType="none" connectNulls/>
                      <Area type="monotone" dataKey="lower" stroke="none"
                        fill={isDark?"#0f172a":"#ffffff"}
                        name="Lower 95% CI" dot={false} legendType="none" connectNulls/>
                      <Area type="monotone" dataKey="actual" stroke="#06b6d4" strokeWidth={2}
                        fill="url(#histGrad)" dot={{r:2,fill:"#06b6d4"}}
                        name="Observed Bleaching %" connectNulls={false} activeDot={{r:5}}/>
                      <Area type="monotone" dataKey="forecast" stroke="#a78bfa" strokeWidth={2.5}
                        strokeDasharray="6 3" fill="none"
                        dot={{r:4,fill:"#a78bfa",stroke:"#fff",strokeWidth:1.5}}
                        name="Forecast Bleaching %" connectNulls={false} activeDot={{r:6}}/>
                      {bleachChartData.find(p=>p.forecast!=null)&&(
                        <ReferenceLine x={bleachChartData.find(p=>p.forecast!=null)?.label}
                          stroke={isDark?"#334155":"#94a3b8"} strokeDasharray="4 3"
                          label={{value:"Forecast →",fill:"#64748b",fontSize:10,position:"top"}}/>
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Forecast month cards */}
                <div style={{...card,padding:"16px 20px"}}>
                  <h3 style={{fontSize:13,fontWeight:700,color:isDark?"#f1f5f9":"#0f172a",margin:"0 0 12px 0"}}>
                    📈 Monthly Forecast Summary
                  </h3>
                  <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                    {bleachChartData.filter(p=>p.forecast!=null).map((p,i)=>{
                      const v=p.forecast??0;
                      const risk=v>50?"#ef4444":v>30?"#f97316":v>15?"#eab308":"#22c55e";
                      return(
                        <div key={i} style={{
                          background:`${risk}15`,border:`1px solid ${risk}33`,
                          borderRadius:10,padding:"8px 12px",
                          display:"flex",flexDirection:"column",gap:2,minWidth:80,
                        }}>
                          <div style={{fontSize:10,color:"#64748b"}}>{p.label}</div>
                          <div style={{fontSize:16,fontWeight:800,color:risk}}>{v.toFixed(1)}%</div>
                          <div style={{fontSize:9,color:risk,fontWeight:600}}>
                            {v>50?"Critical":v>30?"High":v>15?"Moderate":"Low"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {results.length>1&&multiSiteComparison.length>0&&(
                  <div style={{...card,padding:"20px 24px"}}>
                    <h2 style={{fontSize:14,fontWeight:700,color:isDark?"#f1f5f9":"#0f172a",margin:"0 0 4px 0"}}>
                      🔍 Multi-Site Bleaching Comparison
                    </h2>
                    <p style={{fontSize:11,color:"#64748b",marginBottom:14}}>
                      Bleaching trends across selected sites (last 24 months + forecast).
                    </p>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={multiSiteComparison} margin={{top:5,right:20,left:0,bottom:60}}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                        <XAxis dataKey="label" tick={{...TICK,fontSize:9}} angle={-40} textAnchor="end"
                          interval={Math.floor(multiSiteComparison.length/8)} tickLine={false} axisLine={false}/>
                        <YAxis tick={TICK} tickLine={false} axisLine={false}/>
                        <Tooltip contentStyle={TT_STYLE}/>
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11,color:"#64748b",paddingTop:16}}/>
                        {results.map((r,i)=>(
                          <Line key={r.site} type="monotone" dataKey={r.site}
                            stroke={SITE_COLORS[i%SITE_COLORS.length]} strokeWidth={2}
                            dot={false} connectNulls/>
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* ENSO tab */}
            {activeTab==="enso"&&activeResult&&(
              <div style={{display:"flex",flexDirection:"column",gap:20}}>
                <div style={{...card,padding:"20px 24px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                    <div>
                      <h2 style={{fontSize:14,fontWeight:700,color:isDark?"#f1f5f9":"#0f172a",margin:0}}>
                        🌀 ENSO Phase Forecast — {activeResult.site}
                      </h2>
                      <p style={{fontSize:11,color:"#64748b",marginTop:3}}>
                        El Niño=+1 · Neutral=0 · La Niña=−1. Dashed = AR(3) forecast.
                      </p>
                    </div>
                    {nextENSO&&<ENSOPhaseBadge phase={nextENSO.forecastPhase} confidence={nextENSO.confidence}/>}
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={ensoData} margin={{top:10,right:20,left:0,bottom:60}}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
                      <XAxis dataKey="label" tick={{...TICK,fontSize:9}} angle={-40} textAnchor="end"
                        interval={Math.floor(ensoData.length/10)} tickLine={false} axisLine={false}/>
                      <YAxis tick={TICK} tickLine={false} axisLine={false} domain={[-1.5,1.5]}
                        ticks={[-1,0,1]} tickFormatter={(v:number)=>v===1?"El Niño":v===-1?"La Niña":"Neutral"}/>
                      <Tooltip contentStyle={TT_STYLE}
                        formatter={(value:unknown,name:unknown)=>{
                          const v=Number(value);
                          const n=String(name);
                          if(n==="Observed ENSO")
                            return[v===1?"El Niño":v===-1?"La Niña":"Neutral",n] as [string,string];
                          return[v.toFixed(2),n] as [string,string];
                        }}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11,color:"#64748b",paddingTop:16}}/>
                      <ReferenceLine y={0.4} stroke="#f97316" strokeDasharray="3 3"
                        label={{value:"El Niño zone",fill:"#f97316",fontSize:9,position:"right"}}/>
                      <ReferenceLine y={-0.4} stroke="#3b82f6" strokeDasharray="3 3"
                        label={{value:"La Niña zone",fill:"#3b82f6",fontSize:9,position:"right"}}/>
                      <Line type="monotone" dataKey="actualValue" stroke="#22c55e" strokeWidth={2}
                        dot={{r:2}} name="Observed ENSO" connectNulls={false}/>
                      <Line type="monotone" dataKey="forecastValue" stroke="#a78bfa" strokeWidth={2.5}
                        strokeDasharray="6 3"
                        dot={{r:4,fill:"#a78bfa",stroke:"#fff",strokeWidth:1.5}}
                        name="Forecast ENSO" connectNulls={false}/>
                      {ensoData.find(p=>p.actualPhase===null)&&(
                        <ReferenceLine x={ensoData.find(p=>p.actualPhase===null)?.label}
                          stroke={isDark?"#334155":"#94a3b8"} strokeDasharray="4 3"
                          label={{value:"Forecast →",fill:"#64748b",fontSize:10,position:"top"}}/>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={{...card,padding:"16px 20px"}}>
                  <h3 style={{fontSize:13,fontWeight:700,color:isDark?"#f1f5f9":"#0f172a",margin:"0 0 12px 0"}}>
                    🗓️ Monthly ENSO Phase Forecast
                  </h3>
                  <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                    {ensoFuturePoints.map((p,i)=>{
                      const color=ENSO_COLOR[p.forecastPhase]??"#94a3b8";
                      return(
                        <div key={i} style={{
                          background:`${color}15`,border:`1px solid ${color}33`,
                          borderRadius:12,padding:"10px 14px",
                          display:"flex",flexDirection:"column",gap:4,minWidth:100,
                        }}>
                          <div style={{fontSize:10,color:"#64748b",fontWeight:600}}>{p.label}</div>
                          <div style={{fontSize:14,fontWeight:800,color}}>{p.forecastPhase}</div>
                          <div style={{height:4,borderRadius:4,background:isDark?"#1e293b":"#e2e8f0"}}>
                            <div style={{height:"100%",borderRadius:4,width:`${p.confidence}%`,background:color}}/>
                          </div>
                          <div style={{fontSize:10,color,fontWeight:600}}>{p.confidence.toFixed(0)}% confidence</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {ensoFuturePoints.length>0&&(()=>{
                  const counts={"El Niño":0,"Neutral":0,"La Niña":0};
                  ensoFuturePoints.forEach(p=>{if(p.forecastPhase in counts) counts[p.forecastPhase as keyof typeof counts]++;});
                  const distData=Object.entries(counts).map(([phase,count])=>({phase,count}));
                  return(
                    <div style={{...card,padding:"20px 24px"}}>
                      <h3 style={{fontSize:13,fontWeight:700,color:isDark?"#f1f5f9":"#0f172a",margin:"0 0 4px 0"}}>
                        📊 Forecast ENSO Distribution
                      </h3>
                      <p style={{fontSize:11,color:"#64748b",marginBottom:14}}>
                        How many forecast months fall into each climate phase.
                      </p>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={distData} margin={{top:5,right:10,left:-10,bottom:5}}>
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false}/>
                          <XAxis dataKey="phase" tick={TICK} tickLine={false} axisLine={false}/>
                          <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false}/>
                          <Tooltip contentStyle={TT_STYLE}/>
                          <Bar dataKey="count" radius={[6,6,0,0]} name="Months">
                            {distData.map((d,i)=><Cell key={i} fill={ENSO_COLOR[d.phase]??"#94a3b8"}/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </div>
            )}

            {activeResult&&(
              <div style={{
                borderRadius:16,padding:"16px 20px",
                background:isDark?"rgba(249,115,22,0.07)":"#fff7ed",
                border:isDark?"1px solid rgba(249,115,22,0.2)":"1px solid #fed7aa",
              }}>
                <h3 style={{fontSize:13,fontWeight:700,color:isDark?"#fb923c":"#c2410c",margin:"0 0 10px 0"}}>
                  ⚠️ Early Action Recommendations
                </h3>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[
                    {icon:"🌡️",text:"If any forecast month exceeds 30% bleaching, schedule pre-season field surveys."},
                    {icon:"📡",text:"A SARIMA RMSE above 5% indicates high variability — increase sensor density."},
                    {icon:"🌊",text:"El Niño forecast months correlate with higher bleaching — prepare cooling interventions."},
                    {icon:"📋",text:"Review forecast monthly as new field data comes in to retrain and update the model."},
                  ].map((item,i)=>(
                    <div key={i} style={{display:"flex",gap:8,fontSize:12,color:isDark?"#fdba74":"#9a3412"}}>
                      <span>{item.icon}</span><span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!results&&!running&&(
          <div style={{
            ...card,padding:"48px 24px",
            display:"flex",flexDirection:"column",alignItems:"center",gap:12,textAlign:"center",
          }}>
            <div style={{fontSize:56}}>🔬</div>
            <h3 style={{fontSize:15,fontWeight:700,color:isDark?"#f1f5f9":"#0f172a",margin:0}}>
              Ready to forecast
            </h3>
            <p style={{fontSize:12,color:"#64748b",maxWidth:380,margin:0}}>
              Select one or more reef sites, choose a target month (up to 12 months ahead), then click <strong>Run Forecast</strong> to train the models and generate predictions.
            </p>
          </div>
        )}

        {running&&(
          <div style={{
            ...card,padding:"48px 24px",
            display:"flex",flexDirection:"column",alignItems:"center",gap:16,textAlign:"center",
          }}>
            <div style={{fontSize:52}}>⚙️</div>
            <h3 style={{fontSize:15,fontWeight:700,color:isDark?"#f1f5f9":"#0f172a",margin:0}}>
              Training models on site data...
            </h3>
            <p style={{fontSize:12,color:"#64748b",margin:0}}>
              Running SARIMA-lite bleaching forecast &amp; AR(3) ENSO phase model
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
