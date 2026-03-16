// components/Navbar.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import "./Navbar.css";

export default function Navbar({ onReportClick }) {
  const { connected } = useSocket();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand" onClick={() => navigate("/")}>
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="10" r="4" stroke="#ff6b35" strokeWidth="2" />
              <path d="M12 2C7.03 2 3 6.03 3 11c0 6.25 9 13 9 13s9-6.75 9-13c0-4.97-4.03-9-9-9z" stroke="#ff6b35" strokeWidth="2" fill="none" />
            </svg>
          </div>
          <span className="brand-name">CivicPulse</span>
        </div>

        <div className={`navbar-links ${menuOpen ? "open" : ""}`}>
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setMenuOpen(false)}>
            <span>🗺️</span> Map
          </NavLink>
          <NavLink to="/feed" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setMenuOpen(false)}>
            <span>📡</span> Live Feed
          </NavLink>
        </div>

        <div className="navbar-right">
          <div className={`connection-status ${connected ? "connected" : "disconnected"}`}>
            <span className="status-dot" />
            <span className="status-label">{connected ? "Live" : "Offline"}</span>
          </div>
          <button className="btn-report" onClick={onReportClick}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Report Issue
          </button>
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>
        </div>
      </div>
    </nav>
  );
}
