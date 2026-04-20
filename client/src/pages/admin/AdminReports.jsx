import React,{useState,useEffect} from "react";
import {adminApi} from "../../services/api.js";
import {getCat,getStatus,timeAgo} from "../../utils/constants.js";
const STATUSES=["pending","verified","in_progress","resolved"];
export default function AdminReports(){
  const [reports,setReports]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState("all");
  useEffect(()=>{adminApi.getReports().then(r=>setReports(r.data)).catch(console.error).finally(()=>setLoading(false));},[]);
  const update=async(id,status)=>{
    try{await adminApi.updateStatus(id,status);setReports(p=>p.map(r=>r.id===id?{...r,status}:r));}catch(e){alert(e.message);}
  };
  const filtered=filter==="all"?reports:reports.filter(r=>r.status===filter);
  if(loading)return <div style={{display:"flex",justifyContent:"center",padding:48}}><div className="spinner"/></div>;
  return(
    <div>
      <h1 className="adm-title">Reports <span style={{fontSize:14,color:"var(--text3)",fontWeight:400}}>({reports.length} in zone)</span></h1>
      {reports.length===0&&<div style={{textAlign:"center",padding:48,color:"var(--text3)",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:16}}>
        <div style={{fontSize:48,marginBottom:12}}>🗺️</div>
        <p>No reports in your geofenced zone.</p>
        <p style={{fontSize:12,marginTop:8}}>Draw a zone in Geofencing tab to filter reports by area.</p>
      </div>}
      {reports.length>0&&<>
        <div className="adm-filter-row">
          {["all",...STATUSES].map(s=>(
            <button key={s} className={`adm-chip ${filter===s?"active":""}`} onClick={()=>setFilter(s)}>
              {s==="all"?"All":getStatus(s).label}
            </button>
          ))}
        </div>
        {filtered.length===0?<div style={{textAlign:"center",padding:32,color:"var(--text3)"}}>No reports with this status.</div>:(
          <div className="adm-reports-list">
            {filtered.map(r=>{
              const cat=getCat(r.category);const status=getStatus(r.status);
              return(
                <div key={r.id} className="adm-report">
                  {r.image_url&&<img src={r.image_url} className="adm-report-thumb" alt="" onError={e=>e.target.style.display="none"}/>}
                  <div className="adm-report-info">
                    <div className="adm-report-cat" style={{color:cat.color}}>{cat.icon} {cat.label}</div>
                    <div className="adm-report-title">{r.title}</div>
                    <div className="adm-report-desc">{r.description}</div>
                    {r.address&&<div className="adm-report-meta">📍 {r.address.split(",").slice(0,2).join(",")}</div>}
                    <div className="adm-report-meta">▲{r.upvote_count||0} ▼{r.downvote_count||0} · 👥{r.unique_upvoters||0} unique · {timeAgo(r.created_at)}</div>
                  </div>
                  <div className="adm-report-actions">
                    <select className="adm-status-sel" value={r.status} onChange={e=>update(r.id,e.target.value)} style={{color:status.color}}>
                      {STATUSES.map(s=><option key={s} value={s}>{getStatus(s).label}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>}
    </div>
  );
}
