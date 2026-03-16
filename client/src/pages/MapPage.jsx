// pages/MapPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { reportsApi } from "../services/api";
import { useSocket } from "../context/SocketContext";
import { getCategoryInfo, getStatusInfo, formatRelativeTime } from "../utils/constants";
import ReportDetail from "../components/ReportDetail";
import "leaflet/dist/leaflet.css";
import "./MapPage.css";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createCategoryIcon(category, status) {
  const cat = getCategoryInfo(category);
  const color = status === "resolved" ? "#00d4aa" : status === "in_progress" ? "#ffd166" : cat.color;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${color}" flood-opacity="0.4"/>
        </filter>
      </defs>
      <path d="M18 2C10.27 2 4 8.27 4 16c0 10.25 14 26 14 26s14-15.75 14-26C32 8.27 25.73 2 18 2z"
        fill="${color}" filter="url(#shadow)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <circle cx="18" cy="16" r="8" fill="rgba(0,0,0,0.25)"/>
      <text x="18" y="21" text-anchor="middle" font-size="12">${cat.icon}</text>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "custom-marker",
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });
}

function FlyToLocation({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo(location, 15, { duration: 1.2 });
    }
  }, [location, map]);
  return null;
}

export default function MapPage({ onReportSuccess }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [filterCat, setFilterCat] = useState("all");
  const { socket } = useSocket();

  const fetchMapReports = useCallback(async () => {
    try {
      const res = await reportsApi.getMap();
      setReports(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMapReports();
  }, [fetchMapReports]);

  useEffect(() => {
    if (!socket) return;
    const handler = (newReport) => {
      setReports((prev) => [newReport, ...prev]);
      setFlyTo([newReport.latitude, newReport.longitude]);
    };
    socket.on("new_report", handler);
    return () => socket.off("new_report", handler);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handler = ({ reportId, upvotes }) => {
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, upvotes } : r))
      );
    };
    socket.on("upvote_update", handler);
    return () => socket.off("upvote_update", handler);
  }, [socket]);

  const filtered = filterCat === "all"
    ? reports
    : reports.filter((r) => r.category === filterCat);

  const CATEGORIES_FILTER = [
    { value: "all", label: "All", icon: "🗺️" },
    { value: "pothole", label: "Pothole", icon: "🕳️" },
    { value: "garbage", label: "Garbage", icon: "🗑️" },
    { value: "lighting", label: "Lighting", icon: "💡" },
    { value: "water", label: "Water", icon: "💧" },
    { value: "sewage", label: "Sewage", icon: "🚰" },
    { value: "vandalism", label: "Vandalism", icon: "🎨" },
    { value: "other", label: "Other", icon: "📌" },
  ];

  return (
    <div className="map-page">
      {/* Filter bar */}
      <div className="map-filter-bar">
        <div className="filter-scroll">
          {CATEGORIES_FILTER.map((cat) => (
            <button
              key={cat.value}
              className={`filter-chip ${filterCat === cat.value ? "active" : ""}`}
              onClick={() => setFilterCat(cat.value)}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              {cat.value !== "all" && (
                <span className="chip-count">
                  {reports.filter((r) => r.category === cat.value).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="map-stats">
          <span className="stat-item">
            <span className="stat-dot open" />
            {reports.filter((r) => r.status === "open").length} Open
          </span>
          <span className="stat-item">
            <span className="stat-dot resolved" />
            {reports.filter((r) => r.status === "resolved").length} Resolved
          </span>
          <span className="stat-total">{filtered.length} shown</span>
        </div>
      </div>

      <div className="map-layout">
        {/* Map */}
        <div className="map-wrapper">
          {loading && (
            <div className="map-loading-overlay">
              <div className="map-loading-spinner" />
              <span>Loading map data...</span>
            </div>
          )}
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            className="leaflet-map"
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              subdomains="abcd"
              maxZoom={20}
            />
            {flyTo && <FlyToLocation location={flyTo} />}
            {filtered.map((report) => (
              <Marker
                key={report.id}
                position={[report.latitude, report.longitude]}
                icon={createCategoryIcon(report.category, report.status)}
                eventHandlers={{
                  click: () => {
                    setSelectedId(report.id);
                  },
                }}
              >
                <Popup className="map-popup">
                  <div className="popup-content">
                    <div
                      className="popup-cat"
                      style={{ color: getCategoryInfo(report.category).color }}
                    >
                      {getCategoryInfo(report.category).icon}{" "}
                      {getCategoryInfo(report.category).label}
                    </div>
                    <p className="popup-title">{report.title}</p>
                    <div className="popup-meta">
                      <span style={{ color: getStatusInfo(report.status).color }}>
                        ● {getStatusInfo(report.status).label}
                      </span>
                      <span>{formatRelativeTime(report.created_at)}</span>
                    </div>
                    <button
                      className="popup-view-btn"
                      onClick={() => setSelectedId(report.id)}
                    >
                      View Details →
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Detail panel */}
        {selectedId && (
          <div className="detail-sidebar">
            <ReportDetail
              reportId={selectedId}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
