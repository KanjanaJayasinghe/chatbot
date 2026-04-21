"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  ScatterChart, Scatter, RadarChart, Radar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ZAxis,
} from "recharts";

// ── Palettes ─────────────────────────────────────────────────────────────────
const DARK_T = {
  bg:"#060E1A", panel:"#0B1828", card:"#0E2035", border:"#1A3352",
  sidebar:"#040D17", sidebarHover:"#0E2035", sidebarActive:"#1A3A5C",
  text:"#E2E8F0", sub:"#7A9BB5", grid:"#112237",
  primary:"#00B4D8", secondary:"#0077B6", accent:"#06D6A0",
  danger:"#FF4757", warning:"#FFA502", coral:"#FF6B6B",
  shadow:"none", shadow2:"0 8px 24px rgba(0,0,0,0.4)",
  headerBg:"linear-gradient(135deg,#0B1828,#071428)",
  inputBg:"#0E2035", inputBorder:"#1A3352",
  chart:["#00B4D8","#06D6A0","#FFA502","#FF6B6B","#A78BFA","#34D399","#F472B6","#60A5FA"],
  isDark:true,
};
const LIGHT_T = {
  bg:"#EEF4FB", panel:"#F4F9FF", card:"#FFFFFF", border:"#CCE0F0",
  sidebar:"#0C1E35", sidebarHover:"#1A3050", sidebarActive:"#1E4080",
  text:"#0F2540", sub:"#4A708A", grid:"#DDE9F5",
  primary:"#0077B6", secondary:"#005F8E", accent:"#00A896",
  danger:"#D93025", warning:"#D97706", coral:"#D95040",
  shadow:"0 2px 12px rgba(0,80,140,0.08)", shadow2:"0 4px 20px rgba(0,80,140,0.14)",
  headerBg:"linear-gradient(135deg,#0C1E35,#1A3A5C)",
  inputBg:"#F0F8FF", inputBorder:"#B8D4EA",
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
        <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 16px",display:"flex",flexWrap:"wrap",alignItems:"center",gap:8,fontSize:11,boxShadow:T.shadow}}>
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
                  <tr key={param} style={{borderBottom:`1px solid ${T.grid}`,background:i%2===0?T.panel:"transparent"}}>
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
