"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  ScatterChart, Scatter, RadarChart, Radar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ZAxis,
} from "recharts";
import GlobalOverviewPage from "./dashboard/global/page";
import SpatialPage from "./dashboard/spatial/page";
import TemporalPage from "./dashboard/temporal/page";
import DriversPage from "./dashboard/drivers/page";
import SimulationPage from "./dashboard/simulation/page";
import { DashboardContext, useDashboardState } from "./dashboard/useDashboardData";

// ── Palettes ─────────────────────────────────────────────────────────────────
const DARK_T = {
  bg:"#010101", panel:"#070707", card:"#0D0D0D", border:"#1F1F1F",
  sidebar:"#000000", sidebarHover:"#111111", sidebarActive:"#171717",
  text:"#F2F5F8", sub:"#9AA8B6", grid:"#1B1F24",
  primary:"#00C2FF", secondary:"#0087C7", accent:"#20D7A2",
  danger:"#FF4D5E", warning:"#FFB020", coral:"#FF6A78",
  shadow:"0 6px 20px rgba(0,0,0,0.45)", shadow2:"0 10px 32px rgba(0,0,0,0.55)",
  headerBg:"linear-gradient(135deg,#050505,#000000)",
  inputBg:"#121212", inputBorder:"#2A2A2A",
  chart:["#00B4D8","#06D6A0","#FFA502","#FF6B6B","#A78BFA","#34D399","#F472B6","#60A5FA"],
  isDark:true,
};
const LIGHT_T = {
  bg:"#EDF3F9", panel:"#F8FBFF", card:"#FFFFFF", border:"#D7E4F1",
  sidebar:"#113A66", sidebarHover:"#1A4A7C", sidebarActive:"#245A93",
  text:"#0E2944", sub:"#55748F", grid:"#E6EEF7",
  primary:"#0B7CC5", secondary:"#0B5F99", accent:"#0EAE9B",
  danger:"#CC3B30", warning:"#C57912", coral:"#D15649",
  shadow:"0 4px 14px rgba(14,45,78,0.08)", shadow2:"0 10px 28px rgba(14,45,78,0.14)",
  headerBg:"linear-gradient(135deg,#123D6B,#20588F)",
  inputBg:"#FFFFFF", inputBorder:"#CADAE9",
  chart:["#0077B6","#00A896","#D97706","#D95040","#7C5CBF","#2A9D8F","#E76F51","#457B9D"],
  isDark:false,
};
type Theme = typeof DARK_T;

// ── Types ─────────────────────────────────────────────────────────────────────
interface Kpis { avgBleaching:number; avgTemperature:number; avgDHW:number; healthyPercent:number; mostAffectedSite:string; totalSites:number; }
interface Analytics {
  totalCount:number; sampleSize:number; dateRange:{min:number;max:number}; uniqueSites:string[];
  kpis:Kpis;
  bleachingByYear:Array<{year:number;avgBleaching:number;avgTemp:number;avgDHW:number;count:number}>;
  siteStats:Array<{site:string;avgBleaching:number;avgTemp:number;avgDHW:number;count:number;dominantDamage:string}>;
  damageDistribution:Array<{state:string;count:number;percent:number}>;
  ensoStats:Array<{phase:string;avgBleaching:number;avgTemp:number;avgDHW:number;count:number}>;
  monthlyStats:Array<{month:string;monthNum:number;avgTemp:number;avgBleaching:number;avgDHW:number;count:number}>;
  scatterData:Array<{x:number;y:number;site:string;enso:string}>;
  dhwScatter:Array<{x:number;y:number;site:string}>;
  radarData:Array<{site:string;health:number;dhwStress:number;turbidity:number;chlorophyll:number}>;
  depthBands:Array<{range:string;count:number;avgBleaching:number}>;
  paramStats:Record<string,{mean:number;min:number;max:number;std:number;count:number}>;
}
interface Message { id:string; role:"user"|"assistant"; content:string; }
type MainView = "overview" | "global" | "spatial" | "temporal" | "drivers" | "simulation";

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({active,payload,label,T}:{active?:boolean;payload?:Array<{name:string;value:number;color:string}>;label?:string;T:Theme}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",fontSize:12,boxShadow:T.shadow2}}>
      {label && <p style={{color:T.sub,marginBottom:4,fontWeight:600}}>{label}</p>}
      {payload.map((p,i)=>(
        <p key={`tp${i}`} style={{color:p.color,margin:"2px 0"}}>
          {p.name}: <strong>{typeof p.value==="number"?p.value.toFixed(2):p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({label,value,sub,icon,accent,T}:{label:string;value:string;sub?:string;icon:string;accent:string;T:Theme}) {
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,boxShadow:T.shadow}}>
      <div style={{width:44,height:44,borderRadius:12,background:accent+"25",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{icon}</div>
      <div style={{minWidth:0}}>
        <p style={{color:T.sub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",margin:0}}>{label}</p>
        <p style={{color:accent,fontSize:22,fontWeight:800,margin:"2px 0 0",lineHeight:1.1}}>{value}</p>
        {sub && <p style={{color:T.sub,fontSize:11,margin:"2px 0 0"}}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Chart Card ────────────────────────────────────────────────────────────────
function ChartCard({title,sub,children,full,T}:{title:string;sub?:string;children:React.ReactNode;full?:boolean;T:Theme}) {
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:16,padding:"18px 20px",gridColumn:full?"span 2":undefined,minWidth:0,overflow:"hidden",boxShadow:T.shadow}}>
      <p style={{color:T.text,fontWeight:700,fontSize:13,margin:"0 0 2px"}}>{title}</p>
      {sub && <p style={{color:T.sub,fontSize:11,margin:"0 0 12px"}}>{sub}</p>}
      <div style={{minWidth:0,width:"100%"}}>{children}</div>
    </div>
  );
}

const Sk = ({h,T}:{h:number;T:Theme}) => (
  <div style={{height:h,borderRadius:10,background:T.border,opacity:0.4,animation:"shimmer 1.5s infinite"}}/>
);

// ── Dashboard Panel ───────────────────────────────────────────────────────────
function DashboardPanel({analytics,loading,error,T}:{analytics:Analytics|null;loading:boolean;error:string|null;T:Theme}) {
  const GRID: React.CSSProperties = {display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,minWidth:0};
  const ax = {tick:{fill:T.sub,fontSize:10},axisLine:{stroke:T.grid},tickLine:false as const};
  const cg = {stroke:T.grid,strokeDasharray:"3 3"};

  return (
    <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:14}}>

      {/* Preprocessing Banner */}
      {!loading && analytics && (
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 16px",display:"flex",flexWrap:"wrap",alignItems:"center",gap:8,fontSize:11,boxShadow:T.shadow}}>
          <span style={{color:T.primary,fontWeight:700}}>🔬 DATA PREPROCESSING</span>
          <span style={{color:T.sub}}>Loaded <strong style={{color:T.text}}>{analytics.sampleSize.toLocaleString()}</strong> of <strong style={{color:T.text}}>{analytics.totalCount.toLocaleString()}</strong> records</span>
          {([ ["✓ Missing values handled",T.accent],["✓ Numeric parsed",T.primary],["✓ Categorical encoded","#a78bfa"] ] as [string,string][]).map(([lbl,col])=>(
            <span key={lbl} style={{background:col+"22",color:col,borderRadius:6,padding:"2px 8px",border:`1px solid ${col}44`,fontWeight:600}}>{lbl}</span>
          ))}
        </div>
      )}

      {error && <div style={{background:T.danger+"22",border:`1px solid ${T.danger}`,borderRadius:12,padding:"12px 16px",color:T.danger,fontSize:13}}>⚠️ {error}</div>}

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
        {loading ? [0,1,2,3,4,5].map(i=><Sk key={`sk${i}`} h={80} T={T}/>) : analytics ? (
          <>
            <KpiCard T={T} label="Total Records" value={analytics.totalCount.toLocaleString()} sub={`${analytics.dateRange.min}–${analytics.dateRange.max}`} icon="📊" accent={T.primary}/>
            <KpiCard T={T} label="Monitoring Sites" value={String(analytics.kpis.totalSites)} sub={`${analytics.uniqueSites.length} unique locations`} icon="📍" accent={T.accent}/>
            <KpiCard T={T} label="Avg Bleaching" value={`${analytics.kpis.avgBleaching}%`} sub="Reef bleaching severity" icon="🪸" accent={analytics.kpis.avgBleaching > 30 ? T.danger : T.warning}/>
            <KpiCard T={T} label="Avg Temperature" value={`${analytics.kpis.avgTemperature}°C`} sub="Sea surface temp" icon="🌡️" accent={analytics.kpis.avgTemperature > 29 ? T.danger : T.primary}/>
            <KpiCard T={T} label="DHW Stress" value={analytics.kpis.avgDHW.toFixed(1)} sub="Degree Heating Weeks" icon="☀️" accent={analytics.kpis.avgDHW > 4 ? T.danger : T.warning}/>
            <KpiCard T={T} label="Healthy Reefs" value={`${analytics.kpis.healthyPercent}%`} sub={`Most hit: ${analytics.kpis.mostAffectedSite.split(" ").slice(0,2).join(" ")}`} icon="✅" accent={analytics.kpis.healthyPercent > 60 ? T.accent : T.danger}/>
          </>
        ) : null}
      </div>

      {/* Row 1: Trend + Donut */}
      <div style={GRID}>
        <ChartCard T={T} title="📈 Coral Bleaching Trend" sub="Average bleaching % per year across all monitored sites">
          {loading ? <Sk h={220} T={T}/> : analytics ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics.bleachingByYear} margin={{top:5,right:10,left:-20,bottom:0}}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.coral} stopOpacity={0.4}/><stop offset="95%" stopColor={T.coral} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.primary} stopOpacity={0.3}/><stop offset="95%" stopColor={T.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid {...cg}/><XAxis dataKey="year" {...ax}/><YAxis {...ax}/>
                <Tooltip content={<ChartTooltip T={T}/>}/>
                <Legend iconType="circle" wrapperStyle={{fontSize:11,color:T.sub}}/>
                <Area type="monotone" dataKey="avgBleaching" name="Bleaching %" stroke={T.coral} strokeWidth={2.5} fill="url(#g1)" dot={{fill:T.coral,r:3}}/>
                <Area type="monotone" dataKey="avgTemp" name="Avg Temp °C" stroke={T.primary} strokeWidth={2} fill="url(#g2)" dot={{fill:T.primary,r:3}}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </ChartCard>

        <ChartCard T={T} title="🪸 Reef Damage Distribution" sub="Proportion of damage states across all records">
          {loading ? <Sk h={220} T={T}/> : analytics ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={analytics.damageDistribution} cx="50%" cy="50%" innerRadius="45%" outerRadius="70%" paddingAngle={3} dataKey="count" nameKey="state" label={({percent})=>`${((percent??0)*100).toFixed(0)}%`} labelLine={false}>
                  {analytics.damageDistribution.map((_,i)=><Cell key={`dc${i}`} fill={T.chart[i%T.chart.length]}/>)}
                </Pie>
                <Tooltip formatter={(v)=>[Number(v).toLocaleString(),"Records"]}/>
                <Legend iconType="circle" wrapperStyle={{fontSize:10,color:T.sub}}/>
              </PieChart>
            </ResponsiveContainer>
          ) : null}
        </ChartCard>
      </div>

      {/* Row 2: ENSO + Monthly */}
      <div style={GRID}>
        <ChartCard T={T} title="🌀 ENSO Phase Impact on Bleaching" sub="El Niño / La Niña effect on reef stress">
          {loading ? <Sk h={200} T={T}/> : analytics ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.ensoStats} margin={{top:5,right:10,left:-20,bottom:5}}>
                <CartesianGrid {...cg}/><XAxis dataKey="phase" {...ax}/><YAxis {...ax}/>
                <Tooltip content={<ChartTooltip T={T}/>}/>
                <Legend iconType="circle" wrapperStyle={{fontSize:11,color:T.sub}}/>
                <Bar dataKey="avgBleaching" name="Avg Bleaching %" radius={[6,6,0,0]}>
                  {analytics.ensoStats.map((_,i)=><Cell key={`ec${i}`} fill={T.chart[i%T.chart.length]}/>)}
                </Bar>
                <Bar dataKey="avgDHW" name="Avg DHW Stress" fill={T.warning} radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </ChartCard>

        <ChartCard T={T} title="🌡️ Monthly Ocean Temperature" sub="Seasonal temperature patterns throughout the year">
          {loading ? <Sk h={200} T={T}/> : analytics ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={analytics.monthlyStats} margin={{top:5,right:10,left:-20,bottom:0}}>
                <defs>
                  <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.warning} stopOpacity={0.4}/><stop offset="95%" stopColor={T.warning} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid {...cg}/><XAxis dataKey="month" {...ax}/><YAxis {...ax}/>
                <Tooltip content={<ChartTooltip T={T}/>}/>
                <Legend iconType="circle" wrapperStyle={{fontSize:11,color:T.sub}}/>
                <Area type="monotone" dataKey="avgTemp" name="Temperature °C" stroke={T.warning} strokeWidth={2.5} fill="url(#g3)" dot={{fill:T.warning,r:3}}/>
                <Area type="monotone" dataKey="avgBleaching" name="Bleaching %" stroke={T.coral} strokeWidth={2} fill="none" dot={{fill:T.coral,r:2}} strokeDasharray="4 2"/>
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </ChartCard>
      </div>

      {/* Site bar – full */}
      <ChartCard T={T} title="🗺️ Site-by-Site Bleaching Severity" sub="Average bleaching percentage ranked from most to least affected site" full>
        {loading ? <Sk h={220} T={T}/> : analytics ? (
          <ResponsiveContainer width="100%" height={Math.max(200,analytics.siteStats.length*28)}>
            <BarChart data={analytics.siteStats.slice(0,12)} layout="vertical" margin={{top:0,right:30,left:120,bottom:0}}>
              <CartesianGrid {...cg} horizontal={false}/>
              <XAxis type="number" {...ax} tickFormatter={(v)=>`${v}%`}/>
              <YAxis type="category" dataKey="site" tick={{fill:T.sub,fontSize:10}} width={115}/>
              <Tooltip content={<ChartTooltip T={T}/>}/>
              <Bar dataKey="avgBleaching" name="Avg Bleaching %" radius={[0,6,6,0]}>
                {analytics.siteStats.slice(0,12).map((s,i)=><Cell key={`bc${i}`} fill={s.avgBleaching>50?T.danger:s.avgBleaching>25?T.warning:T.accent}/>)}
              </Bar>
              <Bar dataKey="avgDHW" name="Avg DHW" fill={T.primary+"88"} radius={[0,6,6,0]}/>
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      {/* Row 3: Scatter + Radar */}
      <div style={GRID}>
        <ChartCard T={T} title="🔴 Temperature vs Bleaching" sub="Thermal stress correlation across all monitoring records">
          {loading ? <Sk h={220} T={T}/> : analytics ? (
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{top:5,right:10,left:-20,bottom:5}}>
                <CartesianGrid {...cg}/>
                <XAxis type="number" dataKey="x" name="Temperature °C" {...ax}/>
                <YAxis type="number" dataKey="y" name="Bleaching %" {...ax}/>
                <ZAxis range={[20,20]}/>
                <Tooltip cursor={{strokeDasharray:"3 3"}} formatter={(v,n)=>[Number(v).toFixed(2),String(n)]}/>
                <Scatter name="Site records" data={analytics.scatterData} fill={T.coral} fillOpacity={0.65}/>
              </ScatterChart>
            </ResponsiveContainer>
          ) : null}
        </ChartCard>

        <ChartCard T={T} title="🎯 Multi-Site Health Radar" sub="Composite health indicators across top monitoring sites">
          {loading ? <Sk h={220} T={T}/> : analytics ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={analytics.radarData}>
                <PolarGrid stroke={T.grid}/>
                <PolarAngleAxis dataKey="site" tick={{fill:T.sub,fontSize:9}}/>
                <PolarRadiusAxis angle={30} domain={[0,100]} tick={{fill:T.sub,fontSize:8}}/>
                <Radar name="Health Score" dataKey="health" stroke={T.accent} fill={T.accent} fillOpacity={0.2} strokeWidth={2}/>
                <Radar name="DHW Stress" dataKey="dhwStress" stroke={T.danger} fill={T.danger} fillOpacity={0.1} strokeWidth={2}/>
                <Legend iconType="circle" wrapperStyle={{fontSize:10,color:T.sub}}/>
                <Tooltip formatter={(v)=>[`${Number(v)}%`,""]}/>
              </RadarChart>
            </ResponsiveContainer>
          ) : null}
        </ChartCard>
      </div>

      {/* Row 4: DHW + Depth */}
      <div style={GRID}>
        <ChartCard T={T} title="⚡ DHW Stress vs Bleaching" sub="Degree Heating Weeks — primary bleaching predictor">
          {loading ? <Sk h={200} T={T}/> : analytics ? (
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart margin={{top:5,right:10,left:-20,bottom:5}}>
                <CartesianGrid {...cg}/>
                <XAxis type="number" dataKey="x" name="DHW Stress" {...ax}/>
                <YAxis type="number" dataKey="y" name="Bleaching %" {...ax}/>
                <ZAxis range={[20,20]}/>
                <Tooltip cursor={{strokeDasharray:"3 3"}} formatter={(v,n)=>[Number(v).toFixed(2),String(n)]}/>
                <Scatter name="Records" data={analytics.dhwScatter} fill={T.warning} fillOpacity={0.7}/>
              </ScatterChart>
            </ResponsiveContainer>
          ) : null}
        </ChartCard>

        <ChartCard T={T} title="🤿 Bleaching by Depth Band" sub="How reef depth affects bleaching vulnerability">
          {loading ? <Sk h={200} T={T}/> : analytics ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.depthBands} margin={{top:5,right:10,left:-20,bottom:5}}>
                <CartesianGrid {...cg}/><XAxis dataKey="range" {...ax}/><YAxis {...ax} tickFormatter={(v)=>`${v}%`}/>
                <Tooltip content={<ChartTooltip T={T}/>}/>
                <Bar dataKey="avgBleaching" name="Avg Bleaching %" radius={[6,6,0,0]}>
                  {analytics.depthBands.map((_,i)=><Cell key={`dbc${i}`} fill={T.chart[i%T.chart.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </ChartCard>
      </div>

      {/* Param Stats Table */}
      {!loading && analytics && (
        <ChartCard T={T} title="📋 Parameter Statistics Summary" sub="Descriptive statistics for all measured oceanographic parameters" full>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{borderBottom:`2px solid ${T.border}`}}>
                  {["Parameter","Mean","Min","Max","Std Dev","Records"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"8px 12px",color:T.sub,fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(analytics.paramStats).map(([param,s],i)=>(
                  <tr key={param} style={{borderBottom:`1px solid ${T.grid}`,background:i%2===0?(T.isDark?T.panel:"#F5FAFF"):"transparent"}}>
                    <td style={{padding:"8px 12px",color:T.text,fontWeight:600}}>{param.replaceAll("_"," ")}</td>
                    <td style={{padding:"8px 12px",color:T.primary,fontFamily:"monospace",fontWeight:700}}>{s.mean.toFixed(3)}</td>
                    <td style={{padding:"8px 12px",color:T.sub,fontFamily:"monospace"}}>{s.min.toFixed(3)}</td>
                    <td style={{padding:"8px 12px",color:T.sub,fontFamily:"monospace"}}>{s.max.toFixed(3)}</td>
                    <td style={{padding:"8px 12px",color:T.sub,fontFamily:"monospace"}}>{s.std.toFixed(3)}</td>
                    <td style={{padding:"8px 12px",color:T.sub}}>{s.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* Decision cards */}
      {!loading && analytics && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {([
            {icon:"🚨",title:"Bleaching Alert",col:T.danger,msg:analytics.kpis.avgBleaching>30?`⚠️ Critical: ${analytics.kpis.avgBleaching}% avg bleaching. Immediate intervention at ${analytics.kpis.mostAffectedSite}.`:`✅ Bleaching at ${analytics.kpis.avgBleaching}%. Continue routine monitoring.`},
            {icon:"🌡️",title:"Thermal Stress",col:T.warning,msg:analytics.kpis.avgTemperature>29?`⚠️ SST ${analytics.kpis.avgTemperature}°C exceeds thermal tolerance threshold.`:`✅ Temperature ${analytics.kpis.avgTemperature}°C within safe range.`},
            {icon:"💚",title:"Recovery Status",col:T.accent,msg:`${analytics.kpis.healthyPercent}% of reefs healthy. DHW avg: ${analytics.kpis.avgDHW.toFixed(1)} weeks. ${analytics.kpis.avgDHW>4?"High risk — deploy cooling interventions.":"Recovery conditions favorable."}`},
          ] as {icon:string;title:string;col:string;msg:string}[]).map(c=>(
            <div key={c.title} style={{background:c.col+"18",border:`1px solid ${c.col}44`,borderRadius:12,padding:"14px 16px",boxShadow:T.shadow}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:18}}>{c.icon}</span>
                <span style={{color:T.text,fontWeight:700,fontSize:13}}>{c.title}</span>
              </div>
              <p style={{color:T.sub,fontSize:12,lineHeight:1.5,margin:0}}>{c.msg}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────
function ChatPanel({onClose,analytics,T}:{onClose:()=>void;analytics:Analytics|null;T:Theme}) {
  const [messages,setMessages] = useState<Message[]>([
    {id:"welcome",role:"assistant",content:"Hello! I'm CORAL, your coastal intelligence assistant 🌊\n\nI have access to the full dataset and analytics. Ask me about bleaching trends, site conditions, ENSO impacts, or any data insight!"}
  ]);
  const [input,setInput] = useState("");
  const [loading,setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  const send = useCallback(async(text:string)=>{
    if(!text.trim()||loading) return;
    setInput("");
    const userMsg:Message = {id:Date.now().toString(),role:"user",content:text.trim()};
    setMessages(prev=>[...prev,userMsg]);
    setLoading(true);
    const assistantId=(Date.now()+1).toString();
    setMessages(prev=>[...prev,{id:assistantId,role:"assistant",content:""}]);
    try {
      const history=messages.filter(m=>m.id!=="welcome").map(m=>({role:m.role,content:m.content}));
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text.trim(),history})});
      if(!res.ok||!res.body) throw new Error("API error");
      const reader=res.body.getReader();
      const dec=new TextDecoder();
      let full="";
      while(true){
        const {done,value}=await reader.read();
        if(done) break;
        full+=dec.decode(value,{stream:true});
        setMessages(prev=>prev.map(m=>m.id===assistantId?{...m,content:full}:m));
      }
    } catch {
      setMessages(prev=>prev.map(m=>m.id===assistantId?{...m,content:"⚠️ Error reaching CORAL. Please try again."}:m));
    } finally {setLoading(false);}
  },[messages,loading]);

  const handleKey=(e:React.KeyboardEvent<HTMLTextAreaElement>)=>{
    if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}
  };

  const quickPrompts=analytics?["Most bleached site?","El Niño impact?","Avg temp by year","Sites at high risk?",]:[];

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:T.panel}}>
      {/* Chat header */}
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:12,flexShrink:0,background:T.isDark?"linear-gradient(135deg,#071428,#0B1828)":"linear-gradient(135deg,#0C1E35,#1A3050)"}}>
        <div style={{width:42,height:42,borderRadius:14,background:`linear-gradient(135deg,${T.coral},${T.secondary})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,boxShadow:`0 0 14px ${T.coral}55`}}>🪸</div>
        <div style={{flex:1,minWidth:0}}>
          <p style={{color:"#FFFFFF",fontWeight:800,fontSize:13,margin:0,lineHeight:1.2}}>COASTAL INTELLIGENCE ASSISTANT</p>
          <p style={{color:"#94C8E0",fontSize:11,margin:"2px 0 0",display:"flex",alignItems:"center",gap:4}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:T.accent,display:"inline-block"}}/>
            Online · CORAL (Gemini AI)
          </p>
        </div>
        <button onClick={onClose} style={{width:30,height:30,borderRadius:8,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#94C8E0",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 14px",display:"flex",flexDirection:"column",gap:12}}>
        {messages.map(msg=>(
          <div key={msg.id} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start",alignItems:"flex-end",gap:8}}>
            {msg.role==="assistant"&&(
              <div style={{width:30,height:30,borderRadius:10,background:`linear-gradient(135deg,${T.coral},${T.secondary})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🪸</div>
            )}
            <div style={{
              maxWidth:"80%",padding:"10px 14px",
              borderRadius:msg.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
              background:msg.role==="user"?`linear-gradient(135deg,${T.secondary},${T.primary})`:T.card,
              border:msg.role==="user"?"none":`1px solid ${T.border}`,
              color:msg.role==="user"?"#FFFFFF":T.text,
              fontSize:13,lineHeight:1.6,wordBreak:"break-word",
              boxShadow:msg.role==="user"?`0 4px 12px ${T.primary}33`:T.shadow,
            }}>
              {msg.content===""&&msg.role==="assistant"?(
                <div style={{display:"flex",gap:4,alignItems:"center",height:18}}>
                  {[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:"50%",background:T.primary,display:"inline-block",animation:`bounce 1.2s infinite ${i*0.2}s`}}/>)}
                </div>
              ):(
                <span style={{whiteSpace:"pre-wrap"}}>{msg.content.replaceAll("**","")}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Quick prompts */}
      {quickPrompts.length>0&&messages.length<=2&&(
        <div style={{padding:"0 14px 10px",display:"flex",flexWrap:"wrap",gap:6}}>
          {quickPrompts.map(p=>(
            <button key={p} onClick={()=>send(p)} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:20,padding:"5px 12px",color:T.sub,fontSize:11,cursor:"pointer",whiteSpace:"nowrap",boxShadow:T.shadow}}>{p}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{padding:"12px 14px",borderTop:`1px solid ${T.border}`,flexShrink:0}}>
        <div style={{display:"flex",gap:8,alignItems:"flex-end",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:14,padding:"8px 8px 8px 14px",boxShadow:T.shadow}}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Ask me about coastal data..." rows={1}
            style={{flex:1,background:"transparent",border:"none",outline:"none",color:T.text,fontSize:13,resize:"none",lineHeight:1.5,fontFamily:"inherit",padding:0,maxHeight:100,overflowY:"auto"}}/>
          <button onClick={()=>send(input)} disabled={!input.trim()||loading}
            style={{width:36,height:36,borderRadius:10,background:input.trim()&&!loading?`linear-gradient(135deg,${T.secondary},${T.primary})`:T.border,border:"none",color:input.trim()&&!loading?"#FFFFFF":T.sub,cursor:input.trim()&&!loading?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s",fontSize:16}}>
            {loading?"⏳":"➤"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon:"🏠", label:"Main Overview", id:"overview" as MainView },
  { icon:"🌍", label:"Global Intelligence", id:"global" as MainView },
  { icon:"🗺️", label:"Spatial Risk", id:"spatial" as MainView },
  { icon:"📈", label:"Temporal Forecast", id:"temporal" as MainView },
  { icon:"🌡️", label:"Environmental Drivers", id:"drivers" as MainView },
  { icon:"🧠", label:"Decision Simulation", id:"simulation" as MainView },
];

function Sidebar({T,active,onSelect}:{T:Theme;active:MainView;onSelect:(view:MainView)=>void}) {
  return (
    <div style={{width:64,flexShrink:0,background:T.sidebar,borderRight:`1px solid ${T.isDark?"#0a1f38":"#1A3050"}`,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:12,gap:4}}>
      {/* Logo */}
      <div style={{width:40,height:40,borderRadius:12,background:`linear-gradient(135deg,${T.primary},${T.secondary})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,marginBottom:16,boxShadow:`0 0 14px ${T.primary}55`}}>🌊</div>
      {NAV_ITEMS.map(item=>(
        <button
          key={item.id}
          title={item.label}
          onClick={()=>onSelect(item.id)}
          aria-label={item.label}
          style={{
            width:44,height:44,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,cursor:"pointer",
            background:active===item.id?T.sidebarActive:T.sidebarHover,
            border:`1px solid ${active===item.id?T.primary+"44":"transparent"}`,
            boxShadow:active===item.id?`0 0 12px ${T.primary}35`:"none",
            transition:"all 0.2s", color:T.text,
          }}
        >
          {item.icon}
        </button>
      ))}
      <div style={{flex:1}}/>
      <div style={{width:44,height:44,borderRadius:12,background:T.sidebarHover,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,cursor:"pointer",marginBottom:12}} title="Settings">⚙️</div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Page() {
  const [isDark,setIsDark] = useState(true);
  const T = isDark ? DARK_T : LIGHT_T;
  const [activeView,setActiveView] = useState<MainView>("overview");
  const [chatOpen,setChatOpen] = useState(false);
  const [analytics,setAnalytics] = useState<Analytics|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string|null>(null);
  const [aiBootstrapped,setAiBootstrapped] = useState(false);
  const aiState = useDashboardState();
  const aiReload = aiState.reload;

  const VIEW_TITLES: Record<MainView, string> = {
    overview: "Main Coastal Overview",
    global: "Global Overview – Executive Intelligence",
    spatial: "Spatial Risk Intelligence",
    temporal: "Temporal Forecasting",
    drivers: "Environmental Drivers – Explainable AI",
    simulation: "Decision Support & Simulation",
  };
  const isAiView = activeView !== "overview";

  useEffect(()=>{
    fetch("/api/analytics").then(r=>r.json()).then(d=>{
      if(d.error) throw new Error(d.error);
      setAnalytics(d);
    }).catch((e:Error)=>setError(e.message)).finally(()=>setLoading(false));
  },[]);

  // Lazy-load the AI pipeline only when user opens one of the AI pages.
  useEffect(()=>{
    if (isAiView && !aiBootstrapped) {
      setAiBootstrapped(true);
      aiReload();
    }
  }, [isAiView, aiBootstrapped, aiReload]);

  return (
    <>
      <style>{`
        *{box-sizing:border-box;}
        html,body{margin:0;background:${T.bg};}
        body{font-family:'Manrope','Segoe UI',system-ui,-apple-system,sans-serif;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${T.isDark?"#060606":"#EDF3F9"};}
        ::-webkit-scrollbar-thumb{background:${T.isDark?"#262626":"#B5C9DC"};border-radius:4px;}
        @keyframes shimmer{0%{opacity:0.4}50%{opacity:0.7}100%{opacity:0.4}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}

        /* Embedded AI pages: light-theme remap for professional daytime readability */
        .ai-surface{min-height:100%;}
        .ai-dark{background:#020202;}
        .ai-dark .bg-gray-950{background:#050505 !important;}
        .ai-dark .bg-gray-900{background:#0A0A0A !important;}
        .ai-dark .bg-gray-800{background:#111111 !important;}
        .ai-dark .border-gray-900,
        .ai-dark .border-gray-800,
        .ai-dark .border-gray-700,
        .ai-dark .border-gray-600{border-color:#242424 !important;}
        .ai-dark .text-gray-500{color:#8FA0B1 !important;}
        .ai-dark .text-gray-400{color:#A6B4C2 !important;}
        .ai-light{background:#EEF4FA;}
        .ai-light .bg-gray-950,
        .ai-light .bg-gray-900{background:#FFFFFF !important;}
        .ai-light .bg-gray-800{background:#F4F8FD !important;}
        .ai-light .border-gray-900,
        .ai-light .border-gray-800,
        .ai-light .border-gray-700,
        .ai-light .border-gray-600{border-color:#D3E1EE !important;}
        .ai-light .text-white{color:#132C47 !important;}
        .ai-light .text-gray-500{color:#607E99 !important;}
        .ai-light .text-gray-400{color:#4F6E89 !important;}
        .ai-light .text-gray-300{color:#3E6385 !important;}
        .ai-light .text-cyan-300{color:#0B73AA !important;}
        .ai-light .text-purple-300{color:#5B57A6 !important;}
        .ai-light .text-amber-300{color:#A76A12 !important;}
        .ai-light .text-green-300{color:#1A7B64 !important;}
        .ai-light .shadow,
        .ai-light .shadow-lg{box-shadow:0 6px 18px rgba(9,43,75,0.08) !important;}
      `}</style>

      <div style={{height:"100vh",display:"flex",flexDirection:"column",background:T.bg,color:T.text,overflow:"hidden",transition:"background 0.3s,color 0.3s"}}>

        {/* ── HEADER ── */}
        <header style={{background:T.headerBg,borderBottom:`1px solid ${T.isDark?"#1A3352":"#1A3050"}`,padding:"0 20px 0 0",height:58,display:"flex",alignItems:"center",gap:0,flexShrink:0,zIndex:10}}>
          {/* Sidebar logo space */}
          <div style={{width:64,height:"100%",display:"flex",alignItems:"center",justifyContent:"center",borderRight:`1px solid ${T.isDark?"#0a1f38":"#1A3050"}`}}>
            <span style={{fontSize:24}}>🌊</span>
          </div>
          <div style={{padding:"0 18px",flex:1,display:"flex",alignItems:"center",gap:12}}>
            <div>
              <p style={{color:"#4fc3e8",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.18em",margin:0}}>Sri Lanka · Coastal Management Department</p>
              <p style={{color:"#FFFFFF",fontWeight:800,fontSize:15,margin:0,lineHeight:1.2}}>COASTAL DATA DASHBOARD</p>
            </div>
            <span style={{
              background:"rgba(255,255,255,0.12)",
              border:"1px solid rgba(255,255,255,0.22)",
              borderRadius:16,padding:"3px 10px",
              color:"#D8ECFF",fontSize:11,fontWeight:600,
            }}>
              {VIEW_TITLES[activeView]}
            </span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {analytics&&<span style={{color:"#94C8E0",fontSize:11}}>{analytics.dateRange.min}–{analytics.dateRange.max} · {analytics.totalCount.toLocaleString()} records</span>}
            <div style={{width:1,height:20,background:"rgba(255,255,255,0.15)"}}/>
            <span style={{background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:T.accent,display:"inline-block",marginRight:5,animation:"pulse 2s infinite"}}/>LIVE
            </span>
            {/* Theme toggle */}
            <button onClick={()=>setIsDark(p=>!p)} style={{
              display:"flex",alignItems:"center",gap:6,
              background:T.isDark?"#151515":"rgba(255,255,255,0.2)",
              border:`1px solid ${T.isDark?"#2A2A2A":"rgba(255,255,255,0.35)"}`,
              borderRadius:20,padding:"4px 12px",cursor:"pointer",
              color:T.isDark?T.text:"#FFFFFF",fontSize:12,fontWeight:600,transition:"all 0.25s",
            }}>
              <span style={{fontSize:14}}>{isDark?"☀️":"🌙"}</span>
              {isDark?"Day Mode":"Night Mode"}
            </button>
          </div>
        </header>

        {/* ── BODY ── */}
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {/* Sidebar */}
          <Sidebar T={T} active={activeView} onSelect={setActiveView}/>

          {/* Unified dashboard area: main overview + embedded AI pages */}
          <div style={{flex:1,minWidth:0,overflowY:"auto",background:T.isDark?T.bg:"#F7FBFF",transition:"background 0.3s"}}>
            {!isAiView ? (
              <DashboardPanel analytics={analytics} loading={loading} error={error} T={T}/>
            ) : (
              <DashboardContext.Provider value={aiState}>
                <div className={`ai-surface ${isDark ? "ai-dark" : "ai-light"}`}>
                  {activeView === "global" && <GlobalOverviewPage />}
                  {activeView === "spatial" && <SpatialPage />}
                  {activeView === "temporal" && <TemporalPage />}
                  {activeView === "drivers" && <DriversPage />}
                  {activeView === "simulation" && <SimulationPage />}
                </div>
              </DashboardContext.Provider>
            )}
          </div>

          {/* Chat panel */}
          <div style={{
            width:chatOpen?"min(460px,40%)":0,
            flexShrink:0,overflow:"hidden",
            transition:"width 0.4s cubic-bezier(0.4,0,0.2,1)",
            borderLeft:chatOpen?`1px solid ${T.border}`:"none",
          }}>
            <div style={{width:"min(460px,40vw)",height:"100%"}}>
              <ChatPanel onClose={()=>setChatOpen(false)} analytics={analytics} T={T}/>
            </div>
          </div>
        </div>

        {/* ── FAB ── */}
        {!chatOpen&&(
          <button onClick={()=>setChatOpen(true)} title="Open CORAL Assistant"
            style={{
              position:"fixed",bottom:28,right:28,width:58,height:58,borderRadius:18,
              background:`linear-gradient(135deg,${T.coral},${T.secondary})`,
              border:"none",cursor:"pointer",zIndex:100,
              boxShadow:`0 8px 24px ${T.coral}55,0 0 0 3px ${T.coral}22`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,
              transition:"transform 0.2s",
            }}>🪸</button>
        )}
      </div>
    </>
  );
}
