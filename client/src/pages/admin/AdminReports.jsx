import React,{useState,useEffect} from "react";
import {adminApi} from "../../services/api.js";
import {getCat,getStatus,timeAgo} from "../../utils/constants.js";
import "./AdminDashboard.css";
const STATUSES=["pending","verified","in_progress","resolved"];
export default function AdminReports(){
  const [reports,setReports]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState("all");
  useEffect(()=>{adminApi.getReports().then(r=>setReports(r.data)).catch(console.error).finally(()=>setLoading(false));},[]);
  const updateStatus=async(id,status)=>{
    try{await adminApi.updateStatus(id,status);setReports(p=>p.map(r=>r.id===id?{...r,status}:r));}catch(e){alert(e.message);}
  };
  const filtered=filter==="all"?reports:reports.filter(r=>r.status===filter);
  return(
    <div>
      <h1 className="adm-page-title">Reports <span style={{fontSize:14,color:"var(--text3)",fontWeight:400}}>({reports.length} in zone)</span></h1>
      <div className="adm-filter-row">
        {["all",...STATUSES].map(s=>(
          <button key={s} className={`adm-filter-chip ${filter===s?"active":""}`} onClick={()=>setFilter(s)}>
            {s==="all"?"All":getStatus(s).label}
          </button>
        ))}
      </div>
      {loading?<div style={{display:"flex",justifyContent:"center",padding:48}}><div className="spinner"/></div>:
      filtered.length===0?<div style={{textAlign:"center",padding:48,color:"var(--text3)"}}>No reports in this zone yet.</div>:(
        <div className="adm-reports-list">
          {filtered.map(r=>{
            const cat=getCat(r.category);const status=getStatus(r.status);
            return(
              <div key={r.id} className="adm-report-row">
                {r.image_url&&<img src={r.image_url} className="adm-report-img" alt="" onError={e=>e.target.style.display="none"}/>}
                <div className="adm-report-info">
                  <div className="adm-report-meta">
                    <span style={{color:cat.color,fontSize:12,fontWeight:700}}>{cat.icon} {cat.label}</span>
                    <span className="adm-report-time">{timeAgo(r.created_at)}</span>
                  </div>
                  <div className="adm-report-title">{r.title}</div>
                  <div className="adm-report-desc">{r.description}</div>
                  {r.address&&<div className="adm-report-addr">📍 {r.address.split(",").slice(0,2).join(",")}</div>}
                  <div className="adm-report-votes">▲ {r.upvote_count||0} · ▼ {r.downvote_count||0} · 👥 {r.unique_upvoters||0}</div>
                </div>
                <div className="adm-report-actions">
                  <select className="adm-status-select" value={r.status} onChange={e=>updateStatus(r.id,e.target.value)} style={{color:status.color}}>
                    {STATUSES.map(s=><option key={s} value={s}>{getStatus(s).label}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
