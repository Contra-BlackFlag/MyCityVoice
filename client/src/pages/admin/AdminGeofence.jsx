import React,{useState,useEffect,useRef} from "react";
import {MapContainer,TileLayer,useMap} from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import {adminApi} from "../../services/api.js";
import {MAHARASHTRA_CENTER,MAHARASHTRA_ZOOM} from "../../utils/constants.js";

function DrawControl({onSave,existing}){
  const map=useMap();
  useEffect(()=>{
    const items=new L.FeatureGroup();
    map.addLayer(items);
    if(existing?.coordinates?.[0]){
      const coords=existing.coordinates[0].map(([lng,lat])=>L.latLng(lat,lng));
      const poly=L.polygon(coords,{color:"#ff5a1f",fillColor:"#ff5a1f",fillOpacity:.15,weight:2.5});
      items.addLayer(poly);
      try{map.fitBounds(poly.getBounds(),{padding:[40,40]});}catch{}
    }
    const ctrl=new L.Control.Draw({
      draw:{
        polygon:{shapeOptions:{color:"#ff5a1f",fillColor:"#ff5a1f",fillOpacity:.15,weight:2.5}},
        rectangle:{shapeOptions:{color:"#ff5a1f",fillColor:"#ff5a1f",fillOpacity:.15,weight:2.5}},
        polyline:false,circle:false,circlemarker:false,marker:false,
      },
      edit:{featureGroup:items,remove:true},
    });
    map.addControl(ctrl);
    map.on(L.Draw.Event.CREATED,e=>{items.clearLayers();items.addLayer(e.layer);onSave(e.layer.toGeoJSON().geometry);});
    map.on(L.Draw.Event.DELETED,()=>onSave(null));
    return()=>{map.removeLayer(items);map.removeControl(ctrl);map.off(L.Draw.Event.CREATED);map.off(L.Draw.Event.DELETED);};
  },[map]);
  return null;
}

export default function AdminGeofence(){
  const [settings,setSettings]=useState(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [pending,setPending]=useState(undefined);
  const [areaName,setAreaName]=useState("");

  useEffect(()=>{
    adminApi.getSettings().then(r=>{setSettings(r.data);setAreaName(r.data?.area_name||"");}).catch(console.error).finally(()=>setLoading(false));
  },[]);

  const save=async()=>{
    setSaving(true);setSaved(false);
    try{
      const geo=pending===undefined?settings?.geofence:pending;
      await adminApi.saveSettings({geofence:geo,area_name:areaName,pin_threshold:settings?.pin_threshold??5});
      setSettings(p=>({...p,geofence:geo,area_name:areaName}));
      setPending(undefined);
      setSaved(true);setTimeout(()=>setSaved(false),3000);
    }catch(e){alert(e.message);}finally{setSaving(false);}
  };

  const clear=async()=>{
    if(!confirm("Clear zone? All reports will be visible in admin view again."))return;
    setPending(null);
    await adminApi.saveSettings({geofence:null,area_name:areaName,pin_threshold:settings?.pin_threshold??5});
    setSettings(p=>({...p,geofence:null}));
    setSaved(true);setTimeout(()=>setSaved(false),3000);
  };

  const activeGeo=pending===undefined?settings?.geofence:pending;

  return(
    <div>
      <h1 className="adm-title">Geofencing</h1>
      <div className="adm-card">
        <div className="adm-card-title">Zone Name</div>
        <input className="adm-input" value={areaName} onChange={e=>setAreaName(e.target.value)} placeholder="e.g. Nashik Municipal Zone A"/>
      </div>
      <div className="adm-card" style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"14px 18px 12px",borderBottom:"1px solid var(--border)"}}>
          <div className="adm-card-title" style={{marginBottom:4}}>Draw Your Zone</div>
          <p className="adm-hint">Use the toolbar on the left of the map to draw a polygon or rectangle. Reports outside this zone are hidden from your admin view but still visible to all users publicly.</p>
        </div>
        {loading?(
          <div style={{height:400,display:"flex",alignItems:"center",justifyContent:"center"}}><div className="spinner"/></div>
        ):(
          <div style={{height:420,position:"relative"}}>
            <MapContainer center={MAHARASHTRA_CENTER} zoom={MAHARASHTRA_ZOOM} style={{height:"100%",width:"100%"}} zoomControl>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" subdomains="abcd" maxZoom={20}/>
              <DrawControl onSave={setPending} existing={settings?.geofence}/>
            </MapContainer>
          </div>
        )}
        <div style={{padding:"14px 18px"}}>
          {activeGeo?(
            <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",background:"rgba(0,201,167,.08)",border:"1px solid rgba(0,201,167,.25)",borderRadius:12}}>
              <span>✅</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"var(--teal)"}}>Zone Active</div>
                <div style={{fontSize:12,color:"var(--text3)",marginTop:3,lineHeight:1.5}}>Reports outside this zone are hidden from your admin reports. They are still visible in the public feed to all users.</div>
              </div>
            </div>
          ):(
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12}}>
              <span>⚪</span>
              <div style={{fontSize:13,color:"var(--text2)"}}>No zone set — all reports visible in admin view.</div>
            </div>
          )}
        </div>
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <button className="adm-save-btn" onClick={save} disabled={saving}>
          {saving?<><span className="spinner" style={{width:16,height:16,borderWidth:2}}/> Saving…</>:saved?"✅ Saved!":"Save Zone"}
        </button>
        {activeGeo&&<button style={{padding:"12px 20px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:12,color:"var(--text2)",fontSize:14,fontWeight:600,transition:"all .2s",cursor:"pointer"}} onClick={clear} disabled={saving} onMouseOver={e=>{e.target.style.borderColor="var(--red)";e.target.style.color="var(--red)";}} onMouseOut={e=>{e.target.style.borderColor="var(--border)";e.target.style.color="var(--text2)";}}>Clear Zone</button>}
      </div>
    </div>
  );
}
