import React,{useState,useEffect} from "react";
import {reportsApi} from "../services/api.js";
import {useAuth}    from "../context/AuthContext.jsx";
import Avatar       from "../components/Avatar.jsx";
import "./LeaderboardPage.css";
export default function LeaderboardPage(){
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const {user:me}=useAuth();
  useEffect(()=>{reportsApi.getLeaderboard().then(r=>setUsers(r.data)).catch(console.error).finally(()=>setLoading(false));},[]);
  const top3=users.slice(0,3);const rest=users.slice(3);
  const MEDALS=["🥇","🥈","🥉"];const RING=["rgba(251,191,36,.4)","rgba(200,200,200,.3)","rgba(180,120,60,.3)"];
  return(
    <div className="lb">
      <div className="lb-hero"><h1 className="lb-h1">🏆 Leaderboard</h1><p className="lb-sub">Top contributors earn badges</p>
        <div className="lb-legend"><span>📋 Report = 1pt</span><span>▲ Upvote = 2pts</span><span>✅ Verified = 10pts</span></div>
      </div>
      {loading?<div style={{display:"flex",justifyContent:"center",padding:48}}><div className="spinner"/></div>:
      users.length===0?<div className="lb-empty"><div style={{fontSize:48}}>🏜️</div><p>No contributors yet!</p></div>:(
        <>
          <div className="lb-podium">
            {top3.map((u,i)=>(
              <div key={u.id} className={`pod-card ${i===0?"pod-gold":""} ${u.id===me?.id?"pod-me":""}`} style={{"--ring":RING[i]}}>
                <div className="pod-medal">{u.badge||MEDALS[i]}</div>
                <Avatar user={u} size={54}/>
                <div className="pod-rank">#{i+1}</div>
                <div className="pod-name">@{u.username}</div>
                <div className="pod-score">{u.score}<span>pts</span></div>
                <div className="pod-stats"><span>📋{u.report_count}</span><span>✅{u.verified_count}</span><span>▲{u.total_upvotes}</span></div>
                {u.id===me?.id&&<div className="pod-you">You!</div>}
              </div>
            ))}
          </div>
          {rest.length>0&&<div className="lb-list">{rest.map((u,i)=>(
            <div key={u.id} className={`lb-row ${u.id===me?.id?"lb-row-me":""}`}>
              <span className="lb-num">#{i+4}</span><Avatar user={u} size={40}/>
              <div className="lb-info"><div className="lb-name">@{u.username} {u.badge}</div><div className="lb-stats"><span>📋{u.report_count}</span><span>✅{u.verified_count}</span><span>▲{u.total_upvotes}</span></div></div>
              <div className="lb-pts">{u.score}<span>pts</span></div>
            </div>
          ))}</div>}
        </>
      )}
    </div>
  );
}
