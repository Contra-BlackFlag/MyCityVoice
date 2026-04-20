import React,{useState,useEffect} from "react";
import {MapContainer,TileLayer,Marker,Popup,useMap} from "react-leaflet";
import L from "leaflet";
import {reportsApi}  from "../services/api.js";
import {useSocket}    from "../context/SocketContext.jsx";
import {getCat,getStatus,timeAgo,MAHARASHTRA_CENTER,MAHARASHTRA_ZOOM} from "../utils/constants.js";
import DetailDrawer   from "../components/DetailDrawer.jsx";
import "./MapPage.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({iconRetinaUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",iconUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",shadowUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"});

function makeIcon(category,status){
  const c=getCat(category);
  const color=status==="resolved"?"#34d399":status==="in_progress"?"#fbbf24":c.color;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="38" height="46" viewBox="0 0 38 46"><defs><filter id="d"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${color}" flood-opacity=".5"/></filter></defs><path d="M19 2C11.27 2 5 8.27 5 16c0 10.25 14 28 14 28S33 26.25 33 16C33 8.27 26.73 2 19 2z" fill="${color}" filter="url(#d)" stroke="rgba(255,255,255,.2)" stroke-width="1"/><circle cx="19" cy="16" r="9" fill="rgba(0,0,0,.25)"/><text x="19" y="21" text-anchor="middle" font-size="13">${c.icon}</text></svg>`;
  return L.divIcon({html:svg,className:"custom-marker",iconSize:[38,46],iconAnchor:[19,46],popupAnchor:[0,-46]});
}

function FlyTo({pos}){
  const map=useMap();
  useEffect(()=>{if(pos)map.flyTo(pos,15,{duration:1.2});},[pos,map]);
  return null;
}

export default function MapPage(){
  const [pins,setPins]=useState([]);
  const [loading,setLoading]=useState(true);
  const [flyTo,setFlyTo]=useState(null);
  const [selectedId,setSelectedId]=useState(null);
  const {socket}=useSocket();

  useEffect(()=>{
    reportsApi.getMap().then(r=>setPins(r.data)).catch(console.error).finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    if(!socket)return;
    const onNew=r=>{if(r.pinned_to_map){setPins(p=>[r,...p]);if(r.latitude&&r.longitude)setFlyTo([r.latitude,r.longitude]);}};
    const onVote=({reportId,pinned_to_map,...data})=>{
      setPins(p=>{
        const exists=p.find(r=>r.id===reportId);
        if(pinned_to_map){
          if(exists) return p.map(r=>r.id===reportId?{...r,...data,pinned_to_map}:r);
          return p; // Newly pinned but we lack full data, ignore until refresh
        }
        return p.filter(r=>r.id!==reportId);
      });
    };
    const onDel=({reportId})=>setPins(p=>p.filter(r=>r.id!==reportId));
    socket.on("new_report",onNew);socket.on("vote_update",onVote);socket.on("report_deleted",onDel);
    return()=>{socket.off("new_report",onNew);socket.off("vote_update",onVote);socket.off("report_deleted",onDel);};
  },[socket]);

  return(
    <div className="mp">
      <div className="mp-bar">
        <span className="mp-count">📍 {pins.length} verified issue{pins.length!==1?"s":""}</span>
        <span className="mp-hint">Maharashtra · 5+ upvotes required</span>
      </div>
      <div className="mp-wrap">
        {loading&&<div className="mp-loading"><div className="spinner"/><span>Loading map…</span></div>}
        <MapContainer center={MAHARASHTRA_CENTER} zoom={MAHARASHTRA_ZOOM} className="mp-leaflet" zoomControl>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" subdomains="abcd" maxZoom={20}/>
          {flyTo&&<FlyTo pos={flyTo}/>}
          {pins.map(pin=>(
            pin.latitude&&pin.longitude&&(
              <Marker key={pin.id} position={[pin.latitude,pin.longitude]} icon={makeIcon(pin.category,pin.status)} eventHandlers={{click:()=>setSelectedId(pin.id)}}>
                <Popup>
                  <div className="mp-popup">
                    <div style={{fontSize:12,fontWeight:700,marginBottom:5,color:getCat(pin.category).color}}>{getCat(pin.category).icon} {getCat(pin.category).label}</div>
                    <p style={{fontSize:14,fontWeight:700,color:"var(--text1)",marginBottom:8,lineHeight:1.3}}>{pin.title}</p>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text3)",marginBottom:10}}>
                      <span>▲ {pin.net_votes||0}</span><span>{timeAgo(pin.created_at)}</span>
                    </div>
                    <button className="mp-popup-btn" onClick={()=>setSelectedId(pin.id)}>View Details →</button>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>
      </div>
      {selectedId&&<DetailDrawer reportId={selectedId} onClose={()=>setSelectedId(null)}/>}
    </div>
  );
}
