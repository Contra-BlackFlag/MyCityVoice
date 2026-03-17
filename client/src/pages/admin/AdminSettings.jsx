import React,{useState,useEffect} from "react";
import {adminApi} from "../../services/api.js";
import "./AdminDashboard.css";
export default function AdminSettings(){
  const [threshold,setThreshold]=useState(5);
  const [areaName,setAreaName]=useState("");
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    adminApi.getSettings().then(r=>{setThreshold(r.data?.pin_threshold??5);setAreaName(r.data?.area_name??"");}).catch(console.error).finally(()=>setLoading(false));
  },[]);
  const save=async()=>{
    setSaving(true);setSaved(false);
    try{await adminApi.saveSettings({pin_threshold:threshold,area_name:areaName});setSaved(true);setTimeout(()=>setSaved(false),3000);}catch(e){alert(e.message);}
    finally{setSaving(false);}
  };
  return(
    <div>
      <h1 className="adm-page-title">Settings</h1>
      {loading?<div style={{display:"flex",justifyContent:"center",padding:48}}><div className="spinner"/></div>:(
        <>
          <div className="adm-card">
            <div className="adm-card-title">Area Name</div>
            <input className="adm-input" value={areaName} onChange={e=>setAreaName(e.target.value)} placeholder="e.g. Nashik Zone 1, Mumbai District 3"/>
            <p className="adm-hint">Display name for your managed area</p>
          </div>
          <div className="adm-card">
            <div className="adm-card-title">Map Pin Threshold</div>
            <div className="adm-threshold-wrap">
              <div className="adm-threshold-display" style={{color:"var(--orange)"}}>{threshold}</div>
              <input type="range" min="1" max="20" value={threshold} onChange={e=>setThreshold(parseInt(e.target.value))} className="adm-slider"/>
            </div>
            <p className="adm-hint">A report needs <strong>{threshold} unique upvote{threshold!==1?"s":""}</strong> to appear on the public map.</p>
          </div>
          <button className="adm-save-btn" onClick={save} disabled={saving}>
            {saving?<><span className="spinner" style={{width:16,height:16,borderWidth:2}}/> Saving…</>:saved?"✅ Saved!":"Save Settings"}
          </button>
        </>
      )}
    </div>
  );
}
