import React,{useState,useRef,useCallback} from "react";
import {reportsApi} from "../services/api.js";
import {CATEGORIES}  from "../utils/constants.js";
import "./CreateModal.css";

export default function CreateModal({onClose}){
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({title:"",description:"",category:"pothole"});
  const [image,setImage]=useState(null);
  const [preview,setPreview]=useState(null);
  const [loc,setLoc]=useState(null);
  const [locBusy,setLocBusy]=useState(false);
  const [locErr,setLocErr]=useState("");
  const [errors,setErrors]=useState({});
  const [subErr,setSubErr]=useState("");
  const camRef=useRef();

  const getGPS=useCallback(()=>new Promise(resolve=>{
    if(!navigator.geolocation){resolve(null);return;}
    navigator.geolocation.getCurrentPosition(
      async pos=>{
        const {latitude:lat,longitude:lng}=pos.coords;
        let address=`${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        try{const d=await(await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)).json();if(d.display_name)address=d.display_name;}catch{}
        resolve({lat,lng,address});
      },
      ()=>resolve(null),
      {enableHighAccuracy:true,timeout:12000}
    );
  }),[]);

  const handleCapture=async e=>{
    const file=e.target.files[0];
    if(!file)return;
    if(file.size>10*1024*1024){setErrors(p=>({...p,img:"Max 10MB"}));return;}
    setImage(file);
    const r=new FileReader();r.onload=e=>setPreview(e.target.result);r.readAsDataURL(file);
    setErrors(p=>({...p,img:""}));
    setLocBusy(true);setLocErr("");
    const gps=await getGPS();
    if(gps)setLoc(gps);else setLocErr("Could not get location automatically.");
    setLocBusy(false);
  };

  const validate=()=>{
    const e={};
    if(!form.title.trim()||form.title.length<5)e.title="At least 5 characters";
    if(!form.description.trim()||form.description.length<15)e.desc="At least 15 characters";
    if(!image)e.img="Photo is required";
    setErrors(e);return!Object.keys(e).length;
  };

  const submit=async()=>{
    setStep(3);setSubErr("");
    try{
      const fd=new FormData();
      fd.append("title",form.title);fd.append("description",form.description);fd.append("category",form.category);
      if(loc){fd.append("latitude",loc.lat);fd.append("longitude",loc.lng);fd.append("address",loc.address);}
      if(image)fd.append("image",image);
      await reportsApi.create(fd);
      setStep(4);setTimeout(onClose,2200);
    }catch(e){setSubErr(e.message);setStep(2);}
  };

  return(
    <div className="cm-back" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="cm-sheet">
        <div className="cm-hdr">
          <button className="cm-x" onClick={onClose}>✕</button>
          <h2 className="cm-title">{step===4?"Submitted! 🎉":"Report an Issue"}</h2>
          <div className="cm-steps">{[1,2].map(n=><span key={n} className={`cm-step ${step>=n?"on":""}`}/>)}</div>
        </div>

        {step===1&&(
          <div className="cm-body">
            {/* Camera Button */}
            <div className="form-field">
              <label className="form-label">Photo <span style={{color:"var(--orange)"}}>*</span></label>
              {preview?(
                <div className="cf-prev-wrap">
                  <img src={preview} className="cf-prev" alt="preview"/>
                  <button className="cf-retake" onClick={()=>{setImage(null);setPreview(null);setLoc(null);}}>📷 Retake</button>
                  {locBusy&&<div className="cf-loc-overlay"><div className="spinner" style={{width:18,height:18,borderWidth:2}}/><span>Getting location…</span></div>}
                  {loc&&!locBusy&&<div className="cf-loc-badge">📍 Location captured</div>}
                </div>
              ):(
                <button className="cf-cam-big" onClick={()=>camRef.current?.click()}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <span>Take Photo</span>
                  <small>Location captured automatically</small>
                </button>
              )}
              <input ref={camRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleCapture}/>
              {errors.img&&<span className="form-error">{errors.img}</span>}
              {locErr&&!loc&&<div className="loc-warn">⚠️ {locErr} — report will not appear on map</div>}
            </div>

            {/* Category */}
            <div className="form-field">
              <label className="form-label">Category</label>
              <div className="cat-grid">
                {CATEGORIES.map(c=>(
                  <button key={c.value} type="button" className={`cat-chip ${form.category===c.value?"sel":""}`} style={{"--cc":c.color}} onClick={()=>setForm(p=>({...p,category:c.value}))}>
                    <span>{c.icon}</span><span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="form-field">
              <label className="form-label">Title <span style={{color:"var(--orange)"}}>*</span></label>
              <input className={`form-input ${errors.title?"err":""}`} value={form.title}
                onChange={e=>{setForm(p=>({...p,title:e.target.value}));setErrors(p=>({...p,title:""}));}}
                placeholder="e.g. Large pothole near bus stop" maxLength={100}/>
              {errors.title&&<span className="form-error">{errors.title}</span>}
            </div>

            {/* Description */}
            <div className="form-field">
              <label className="form-label">Description <span style={{color:"var(--orange)"}}>*</span></label>
              <textarea className={`form-textarea ${errors.desc?"err":""}`} value={form.description}
                onChange={e=>{setForm(p=>({...p,description:e.target.value}));setErrors(p=>({...p,desc:""}));}}
                placeholder="Describe the issue in detail…" rows={4} maxLength={1000}/>
              <div style={{textAlign:"right",fontSize:10,color:"var(--text3)",marginTop:-4}}>{form.description.length}/1000</div>
              {errors.desc&&<span className="form-error">{errors.desc}</span>}
            </div>

            <div className="cm-footer">
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={()=>validate()&&!locBusy&&setStep(2)} disabled={locBusy}>
                {locBusy?"Getting location…":"Review →"}
              </button>
            </div>
          </div>
        )}

        {step===2&&(
          <div className="cm-body">
            <div className="review-card">
              <h3 className="review-h">Review Your Report</h3>
              {preview&&<img src={preview} className="review-img" alt="preview"/>}
              <div className="review-rows">
                <div className="review-row"><span>Category</span><strong>{CATEGORIES.find(c=>c.value===form.category)?.icon} {CATEGORIES.find(c=>c.value===form.category)?.label}</strong></div>
                <div className="review-row"><span>Title</span><strong>{form.title}</strong></div>
                <div className="review-row"><span>Description</span><strong style={{fontSize:13}}>{form.description}</strong></div>
                {loc?<div className="review-row"><span>📍 Location</span><strong style={{fontSize:12}}>{loc.address.split(",").slice(0,3).join(",")}</strong></div>
                   :<div className="review-row review-warn"><span>⚠️</span><strong>No location — won't appear on map</strong></div>}
              </div>
            </div>
            {subErr&&<div className="sub-err">❌ {subErr}</div>}
            <div className="pin-info">
              <span>💡</span>
              <p>Needs <strong>community upvotes</strong> (threshold set by admin) to get pinned on the public map.</p>
            </div>
            <div className="cm-footer">
              <button className="btn-ghost" onClick={()=>setStep(1)}>← Edit</button>
              <button className="btn-primary" onClick={submit}>🚨 Submit Report</button>
            </div>
          </div>
        )}

        {step===3&&<div className="cm-body cm-center"><div className="spinner"/><h3>Submitting…</h3><p>Uploading your report</p></div>}
        {step===4&&<div className="cm-body cm-center"><div style={{fontSize:56}}>✅</div><h3>Report Submitted!</h3><p>Community upvotes will pin it on the map.</p></div>}
      </div>
    </div>
  );
}
