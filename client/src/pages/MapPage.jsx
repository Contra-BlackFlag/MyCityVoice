import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { reportsApi } from "../services/api.js";
import { useSocket }   from "../context/SocketContext.jsx";
import { getCat, timeAgo } from "../utils/constants.js";
import DetailDrawer    from "../components/DetailDrawer.jsx";
import "./MapPage.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function makeIcon(category) {
  const c = getCat(category);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="46" viewBox="0 0 38 46">
    <defs><filter id="ds"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${c.color}" flood-opacity=".45"/></filter></defs>
    <path d="M19 2C11.27 2 5 8.27 5 16c0 10.25 14 28 14 28S33 26.25 33 16C33 8.27 26.73 2 19 2z"
      fill="${c.color}" filter="url(#ds)" stroke="rgba(255,255,255,.2)" stroke-width="1"/>
    <circle cx="19" cy="16" r="9" fill="rgba(0,0,0,.22)"/>
    <text x="19" y="21" text-anchor="middle" font-size="13">${c.icon}</text>
  </svg>`;
  return L.divIcon({ html:svg, className:"custom-marker", iconSize:[38,46], iconAnchor:[19,46], popupAnchor:[0,-46] });
}

function FlyTo({ pos }) {
  const map = useMap();
  useEffect(() => { if (pos) map.flyTo(pos, 15, { duration:1.2 }); }, [pos, map]);
  return null;
}

export default function MapPage() {
  const [pins,       setPins]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [flyTo,      setFlyTo]      = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const { socket } = useSocket();

  useEffect(() => {
    reportsApi.getMap()
      .then(r => setPins(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onNew = r => {
      if (r.pinned_to_map === 1) {
        setPins(p => [r, ...p]);
        setFlyTo([r.latitude, r.longitude]);
      }
    };
    const onVote = ({ reportId, pinned_to_map, status, net_votes, upvote_count, downvote_count, unique_upvoters }) => {
      if (pinned_to_map === 1) {
        setPins(p => {
          const exists = p.find(r => r.id === reportId);
          if (exists) return p.map(r => r.id===reportId ? {...r,net_votes,upvote_count,downvote_count,unique_upvoters,status} : r);
          return p;
        });
      } else {
        setPins(p => p.filter(r => r.id !== reportId));
      }
    };
    socket.on("new_report", onNew);
    socket.on("vote_update", onVote);
    return () => { socket.off("new_report",onNew); socket.off("vote_update",onVote); };
  }, [socket]);

  return (
    <div className="mp">
      <div className="mp-bar">
        <span className="mp-count">📍 {pins.length} verified issue{pins.length!==1?"s":""} on map</span>
        <span className="mp-hint">Needs 5 unique upvotes to appear</span>
      </div>

      <div className="mp-wrap">
        {loading && (
          <div className="mp-loading">
            <div className="spinner"/>
            <span>Loading map…</span>
          </div>
        )}
        <MapContainer center={[20.5937,78.9629]} zoom={5} className="mp-leaflet" zoomControl>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; CARTO" subdomains="abcd" maxZoom={20}
          />
          {flyTo && <FlyTo pos={flyTo}/>}
          {pins.map(pin => (
            <Marker key={pin.id}
              position={[pin.latitude, pin.longitude]}
              icon={makeIcon(pin.category)}
              eventHandlers={{ click: ()=>setSelectedId(pin.id) }}>
              <Popup>
                <div className="mp-popup">
                  <div className="mp-popup-cat" style={{color:getCat(pin.category).color}}>
                    {getCat(pin.category).icon} {getCat(pin.category).label}
                  </div>
                  <p className="mp-popup-title">{pin.title}</p>
                  <div className="mp-popup-meta">
                    <span>▲ {pin.net_votes||0} votes</span>
                    <span>{timeAgo(pin.created_at)}</span>
                  </div>
                  <button className="mp-popup-btn" onClick={()=>setSelectedId(pin.id)}>
                    View Details →
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {selectedId && <DetailDrawer reportId={selectedId} onClose={()=>setSelectedId(null)}/>}
    </div>
  );
}
