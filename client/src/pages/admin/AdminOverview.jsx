import React,{useState,useEffect} from "react";
import {adminApi} from "../../services/api.js";
export default function AdminOverview(){
  const [stats,setStats]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{adminApi.getStats().then(r=>setStats(r.data)).catch(console.error).finally(()=>setLoading(false));},[]);
  const cards=[
    {l:"Total Reports",v:stats?.total_reports??"-",i:"📋",c:"var(--orange)"},
    {l:"Pinned on Map",v:stats?.verified_reports??"-",i:"📍",c:"var(--teal)"},
    {l:"Active Users",v:stats?.total_users??"-",i:"👥",c:"var(--purple)"},
  ];
  return(
    <div>
      <h1 className="adm-title">Overview</h1>
      {loading?<div style={{display:"flex",justifyContent:"center",padding:48}}><div className="spinner"/></div>:(
        <div className="adm-stats-grid">
          {cards.map(c=>(
            <div key={c.l} className="adm-stat">
              <div className="adm-stat-icon" style={{background:`${c.c}18`,border:`1px solid ${c.c}33`}}>{c.i}</div>
              <div className="adm-stat-val" style={{color:c.c}}>{c.v}</div>
              <div className="adm-stat-lbl">{c.l}</div>
            </div>
          ))}
        </div>
      )}
      <div className="adm-card">
        <div className="adm-card-title">How It Works</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[["🗺️","Geofencing","Draw a zone — only reports inside appear in your admin view. Public feed shows all."],["⚙️","Threshold","Set upvote threshold. When a report hits it, it pins to the public map."],["📋","Reports","View in-zone reports and update their status as you action them."]].map(([i,t,d])=>(
            <div key={t} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontSize:20,flexShrink:0}}>{i}</span>
              <div><div style={{fontSize:14,fontWeight:700,marginBottom:3}}>{t}</div><div style={{fontSize:13,color:"var(--text2)",lineHeight:1.5}}>{d}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
