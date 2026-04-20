import React,{useState} from "react";
import {Routes,Route,NavLink} from "react-router-dom";
import {useAuth} from "../../context/AuthContext.jsx";
import AdminOverview  from "./AdminOverview.jsx";
import AdminGeofence  from "./AdminGeofence.jsx";
import AdminReports   from "./AdminReports.jsx";
import AdminSettings  from "./AdminSettings.jsx";
import "./AdminDashboard.css";

export default function AdminDashboard(){
  const {user,logout}=useAuth();
  const [open,setOpen]=useState(false);
  const links=[
    {to:"/admin",label:"Overview",icon:"📊",end:true},
    {to:"/admin/geofence",label:"Geofencing",icon:"🗺️"},
    {to:"/admin/reports",label:"Reports",icon:"📋"},
    {to:"/admin/settings",label:"Settings",icon:"⚙️"},
  ];
  return(
    <div className="adm">
      <header className="adm-topbar">
        <div className="adm-topbar-left">
          <button className="adm-burger" onClick={()=>setOpen(o=>!o)}><span/><span/><span/></button>
          <div className="adm-brand">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2C7.03 2 3 6.03 3 11c0 6.25 9 13 9 13s9-6.75 9-13c0-4.97-4.03-9-9-9z" fill="var(--orange)"/><circle cx="12" cy="11" r="3" fill="#fff" opacity=".9"/></svg>
            <span>CivicPulse <strong>Admin</strong></span>
          </div>
        </div>
        <div className="adm-topbar-right">
          <span className="adm-user">@{user?.username}</span>
          <button className="adm-logout" onClick={logout}>Sign Out</button>
        </div>
      </header>
      <div className="adm-body">
        <aside className={`adm-sidebar ${open?"open":""}`}>
          <nav className="adm-nav">
            {links.map(l=>(
              <NavLink key={l.to} to={l.to} end={l.end}
                className={({isActive})=>`adm-nav-item ${isActive?"active":""}`}
                onClick={()=>setOpen(false)}>
                <span>{l.icon}</span><span>{l.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="adm-badge"><span>🛡️</span><div><div>Admin Panel</div><div style={{fontSize:11,color:"var(--text3)"}}>CivicPulse v4</div></div></div>
        </aside>
        {open&&<div className="adm-overlay" onClick={()=>setOpen(false)}/>}
        <main className="adm-main">
          <Routes>
            <Route index           element={<AdminOverview/>}/>
            <Route path="geofence" element={<AdminGeofence/>}/>
            <Route path="reports"  element={<AdminReports/>}/>
            <Route path="settings" element={<AdminSettings/>}/>
          </Routes>
        </main>
      </div>
    </div>
  );
}
