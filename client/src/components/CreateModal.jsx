import React, { useState, useRef, useCallback } from "react";
import { reportsApi } from "../services/api.js";
import { CATEGORIES }  from "../utils/constants.js";
import "./CreateModal.css";

export default function CreateModal({ onClose }) {
  const [step,    setStep]    = useState(1);
  const [form,    setForm]    = useState({ title:"", description:"", category:"pothole" });
  const [image,   setImage]   = useState(null);
  const [preview, setPreview] = useState(null);
  const [loc,     setLoc]     = useState(null);
  const [locBusy, setLocBusy] = useState(false);
  const [locErr,  setLocErr]  = useState("");
  const [errors,  setErrors]  = useState({});
  const [subErr,  setSubErr]  = useState("");
  const fileRef = useRef(); const camRef = useRef();

  const setImg = file => {
    if (!file) return;
    if (file.size > 10*1024*1024) { setErrors(p=>({...p,img:"Max 10MB"})); return; }
    setImage(file);
    const r = new FileReader(); r.onload = e => setPreview(e.target.result); r.readAsDataURL(file);
    setErrors(p=>({...p,img:""}));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()       || form.title.length < 5)       e.title = "At least 5 characters";
    if (!form.description.trim() || form.description.length < 15) e.desc  = "At least 15 characters";
    setErrors(e); return !Object.keys(e).length;
  };

  const getLoc = useCallback(() => {
    setLocBusy(true); setLocErr("");
    if (!navigator.geolocation) { setLocErr("Geolocation not supported"); setLocBusy(false); return; }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        try {
          const d = await (await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)).json();
          if (d.display_name) address = d.display_name;
        } catch {}
        setLoc({ lat, lng, address }); setLocBusy(false);
      },
      err => { setLocErr(err.code===1 ? "Location access denied." : "Could not get location."); setLocBusy(false); },
      { enableHighAccuracy:true, timeout:12000 }
    );
  }, []);

  const submit = async () => {
    if (!loc) { setLocErr("Location required"); return; }
    setStep(3); setSubErr("");
    try {
      const fd = new FormData();
      fd.append("title",       form.title);
      fd.append("description", form.description);
      fd.append("category",    form.category);
      fd.append("latitude",    loc.lat);
      fd.append("longitude",   loc.lng);
      fd.append("address",     loc.address);
      if (image) fd.append("image", image);
      await reportsApi.create(fd);
      setStep(4); setTimeout(onClose, 2200);
    } catch (e) { setSubErr(e.message); setStep(2); }
  };

  return (
    <div className="cm-back" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="cm-sheet fade-up">
        <div className="cm-hdr">
          <h2>{step===4 ? "Posted! 🎉" : "Report an Issue"}</h2>
          <div className="cm-steps">{[1,2].map(n=><span key={n} className={`cm-step ${step>=n?"on":""}`}/>)}</div>
          <button className="cm-x" onClick={onClose}>✕</button>
        </div>

        {step===1 && (
          <div className="cm-body">
            <div className="cf-grp">
              <label className="cf-lbl">Category</label>
              <div className="cat-grid">
                {CATEGORIES.map(c=>(
                  <button key={c.value} type="button"
                    className={`cat-chip ${form.category===c.value?"sel":""}`}
                    style={{"--cc":c.color}}
                    onClick={()=>setForm(p=>({...p,category:c.value}))}>
                    <span className="cc-ico">{c.icon}</span>
                    <span className="cc-lbl">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="cf-grp">
              <label className="cf-lbl">Title <span className="req">*</span></label>
              <input className={`cf-in ${errors.title?"err":""}`} value={form.title}
                onChange={e=>{setForm(p=>({...p,title:e.target.value}));setErrors(p=>({...p,title:""}));}}
                placeholder="e.g. Large pothole near bus stop" maxLength={100} />
              {errors.title && <span className="cf-err">{errors.title}</span>}
            </div>

            <div className="cf-grp">
              <label className="cf-lbl">Description <span className="req">*</span></label>
              <textarea className={`cf-ta ${errors.desc?"err":""}`} value={form.description}
                onChange={e=>{setForm(p=>({...p,description:e.target.value}));setErrors(p=>({...p,desc:""}));}}
                placeholder="Describe the issue in detail…" rows={4} maxLength={1000} />
              <div className="cf-cnt">{form.description.length}/1000</div>
              {errors.desc && <span className="cf-err">{errors.desc}</span>}
            </div>

            <div className="cf-grp">
              <label className="cf-lbl">Photo <span className="cf-opt">(optional)</span></label>
              {preview ? (
                <div className="cf-prev-wrap">
                  <img src={preview} className="cf-prev" alt="preview" />
                  <button className="cf-remove" onClick={()=>{setImage(null);setPreview(null);}}>✕ Remove</button>
                </div>
              ) : (
                <div className="cf-upload" onClick={()=>fileRef.current?.click()}>
                  <span>📷</span><p>Tap to upload</p>
                  <button type="button" className="cf-cam"
                    onClick={e=>{e.stopPropagation();camRef.current?.click();}}>
                    📸 Camera
                  </button>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>setImg(e.target.files[0])} />
              <input ref={camRef}  type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>setImg(e.target.files[0])} />
              {errors.img && <span className="cf-err">{errors.img}</span>}
            </div>

            <div className="cm-footer">
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={()=>validate()&&setStep(2)}>Next: Location →</button>
            </div>
          </div>
        )}

        {step===2 && (
          <div className="cm-body">
            <div className="loc-wrap">
              {locBusy ? (
                <div className="loc-state"><div className="spinner"/><p>Getting location…</p><span>Allow access if prompted</span></div>
              ) : loc ? (
                <div className="loc-state">
                  <div style={{fontSize:48}}>📍</div>
                  <h3>Location Captured</h3>
                  <p className="loc-addr">{loc.address}</p>
                  <div className="loc-coords"><span>{loc.lat.toFixed(5)}°N</span><span>{loc.lng.toFixed(5)}°E</span></div>
                  <button className="btn-ghost-sm" onClick={getLoc}>🔄 Refresh</button>
                </div>
              ) : (
                <div className="loc-state">
                  <div style={{fontSize:48}}>🗺️</div>
                  <h3>Add Location</h3>
                  <p>We need your location to place this on the map.</p>
                  <button className="btn-primary" onClick={getLoc}>📍 Get My Location</button>
                </div>
              )}
              {locErr  && <div className="loc-err"><span>⚠️ {locErr}</span><button onClick={getLoc}>Retry</button></div>}
              {subErr  && <div className="loc-err"><span>❌ {subErr}</span></div>}
            </div>

            <div className="pin-box">
              <span>💡</span>
              <p>Your report needs <strong>5 unique upvotes</strong> from the community to appear on the public map.</p>
            </div>

            <div className="cm-footer">
              <button className="btn-ghost" onClick={()=>setStep(1)}>← Back</button>
              <button className="btn-primary" onClick={submit} disabled={!loc||locBusy}>🚨 Submit Report</button>
            </div>
          </div>
        )}

        {step===3 && (
          <div className="cm-body cm-center">
            <div className="spinner"/><h3>Submitting…</h3><p>Uploading your report</p>
          </div>
        )}

        {step===4 && (
          <div className="cm-body cm-center">
            <div style={{fontSize:56}}>✅</div>
            <h3>Report Submitted!</h3>
            <p>Get 5 community upvotes to pin it on the map.</p>
          </div>
        )}
      </div>
    </div>
  );
}
