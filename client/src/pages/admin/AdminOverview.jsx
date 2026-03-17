import React,{useState,useEffect} from "react";
import {adminApi} from "../../services/api.js";
import "./AdminDashboard.css";
export default function AdminOverview(){
  const [stats,setStats]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{adminApi.getStats().then(r=>setStats(r.data)).catch(console.error).finally(()=>setLoading(false));},[]);
  const cards=[
    {label:"Total Reports",value:stats?.total_reports??"-",icon:"📋",color:"var(--orange)"},
    {label:"Verified on Map",value:stats?.verified_reports??"-",icon:"📍",color:"var(--teal)"},
    {label:"Active Users",value:stats?.total_users??"-",icon:"👥",color:"var(--purple)"},
  ];
  return(
    <div>
      <h1 className="adm-page-title">Overview</h1>
      {loading?<div style={{display:"flex",justifyContent:"center",padding:48}}><div className="spinner"/></div>:(
        <div className="adm-stats-grid">
          {cards.map(c=>(
            <div key={c.label} className="adm-stat-card">
              <div className="adm-stat-icon" style={{background:`${c.color}18`,border:`1px solid ${c.color}33`}}>{c.icon}</div>
              <div className="adm-stat-val" style={{color:c.color}}>{c.value}</div>
              <div className="adm-stat-lbl">{c.label}</div>
            </div>
          ))}
        </div>
      )}
      <div className="adm-card" style={{marginTop:24}}>
        <div className="adm-card-title">Quick Guide</div>
        <div className="adm-guide">
          <div className="adm-guide-item"><span>🗺️</span><div><strong>Geofencing</strong><p>Draw a zone on the map. Reports from your zone appear in your admin view.</p></div></div>
          <div className="adm-guide-item"><span>⚙️</span><div><strong>Pin Threshold</strong><p>Set how many unique upvotes are needed before a report pins to the public map.</p></div></div>
          <div className="adm-guide-item"><span>📋</span><div><strong>Reports</strong><p>View reports inside your geofenced area and update their status.</p></div></div>
        </div>
      </div>
    </div>
  );
}
