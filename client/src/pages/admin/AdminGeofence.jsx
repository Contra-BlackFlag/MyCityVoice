import React,{useState,useEffect,useRef} from "react";
import {MapContainer,TileLayer,useMap} from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import {adminApi} from "../../services/api.js";
import "./AdminDashboard.css";
import "./AdminGeofence.css";

function DrawControl({onSave,existingGeofence}){
  const map=useMap();
  const drawnRef=useRef(null);

  useEffect(()=>{
    const drawnItems=new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnRef.current=drawnItems;

    // Draw existing geofence if set
    if(existingGeofence?.coordinates?.[0]){
      const coords=existingGeofence.coordinates[0].map(([lng,lat])=>L.latLng(lat,lng));
      const poly=L.polygon(coords,{color:"#ff5a1f",fillColor:"#ff5a1f",fillOpacity:.15,weight:2});
      drawnItems.addLayer(poly);
      try{map.fitBounds(poly.getBounds(),{padding:[40,40]});}catch{}
    }

    const drawControl=new L.Control.Draw({
      draw:{
        polygon:{shapeOptions:{color:"#ff5a1f",fillColor:"#ff5a1f",fillOpacity:.15,weight:2}},
        rectangle:{shapeOptions:{color:"#ff5a1f",fillColor:"#ff5a1f",fillOpacity:.15,weight:2}},
        polyline:false,circle:false,circlemarker:false,marker:false,
      },
      edit:{featureGroup:drawnItems,remove:true},
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED,e=>{
      drawnItems.clearLayers();
      drawnItems.addLayer(e.layer);
      const geojson=e.layer.toGeoJSON();
      onSave(geojson.geometry);
    });

    map.on(L.Draw.Event.DELETED,()=>{
      onSave(null);
    });

    return()=>{
      map.removeLayer(drawnItems);
      map.removeControl(drawControl);
      map.off(L.Draw.Event.CREATED);
      map.off(L.Draw.Event.DELETED);
    };
  },[map]);

  return null;
}

export default function AdminGeofence(){
  const [settings,setSettings]=useState(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [pendingGeo,setPendingGeo]=useState(undefined);
  const [areaName,setAreaName]=useState("");

  useEffect(()=>{
    adminApi.getSettings()
      .then(r=>{setSettings(r.data);setAreaName(r.data?.area_name||"");})
      .catch(console.error)
      .finally(()=>setLoading(false));
  },[]);

  const handleGeoChange=geo=>{
    setPendingGeo(geo); // null means cleared
  };

  const saveGeofence=async()=>{
    setSaving(true);setSaved(false);
    try{
      const geoToSave=pendingGeo===undefined?settings?.geofence:pendingGeo;
      await adminApi.saveSettings({
        geofence:geoToSave,
        area_name:areaName,
        pin_threshold:settings?.pin_threshold??5,
      });
      setSettings(p=>({...p,geofence:geoToSave,area_name:areaName}));
      setSaved(true);
      setTimeout(()=>setSaved(false),3000);
    }catch(e){alert(e.message);}
    finally{setSaving(false);}
  };

  const clearGeofence=async()=>{
    if(!confirm("Clear the geofence? Reports will no longer be filtered by zone."))return;
    setPendingGeo(null);
    setSaving(true);
    try{
      await adminApi.saveSettings({geofence:null,area_name:areaName,pin_threshold:settings?.pin_threshold??5});
      setSettings(p=>({...p,geofence:null}));
      setSaved(true);
      setTimeout(()=>setSaved(false),3000);
    }catch(e){alert(e.message);}
    finally{setSaving(false);}
  };

  return(
    <div>
      <h1 className="adm-page-title">Geofencing</h1>

      <div className="adm-card">
        <div className="adm-card-title">Zone Name</div>
        <input className="adm-input" value={areaName} onChange={e=>setAreaName(e.target.value)} placeholder="e.g. Nashik Municipal Zone A"/>
      </div>

      <div className="adm-card adm-map-card">
        <div className="adm-card-title">Draw Your Zone</div>
        <p className="adm-hint" style={{marginBottom:12}}>Use the tools on the map to draw a polygon or rectangle around your area. Reports inside this zone appear in your admin view.</p>

        {loading?(
          <div style={{height:400,display:"flex",alignItems:"center",justifyContent:"center"}}><div className="spinner"/></div>
        ):(
          <div className="adm-map-wrap">
            <MapContainer center={[20.5937,78.9629]} zoom={5} className="adm-leaflet" zoomControl>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" subdomains="abcd" maxZoom={20}/>
              <DrawControl onSave={handleGeoChange} existingGeofence={settings?.geofence}/>
            </MapContainer>
          </div>
        )}

        <div className="adm-geo-status">
          {(pendingGeo!==undefined?pendingGeo:settings?.geofence)?(
            <div className="adm-geo-active">
              <span>✅</span>
              <div>
                <strong>Zone active</strong>
                <p>Reports outside this zone will not appear in your admin reports tab, but are still visible to all users in the public feed.</p>
              </div>
            </div>
          ):(
            <div className="adm-geo-empty">
              <span>⚪</span>
              <div><strong>No zone set</strong><p>All reports are visible in your admin reports tab.</p></div>
            </div>
          )}
        </div>
      </div>

      <div className="adm-geo-btns">
        <button className="adm-save-btn" onClick={saveGeofence} disabled={saving}>
          {saving?<><span className="spinner" style={{width:16,height:16,borderWidth:2}}/> Saving…</>:saved?"✅ Saved!":"Save Zone"}
        </button>
        {(settings?.geofence||pendingGeo)&&(
          <button className="adm-clear-btn" onClick={clearGeofence} disabled={saving}>Clear Zone</button>
        )}
      </div>
    </div>
  );
}
