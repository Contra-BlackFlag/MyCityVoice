import React,{useState} from "react";
import {useNavigate} from "react-router-dom";
import {reportsApi} from "../services/api.js";
import {useAuth}    from "../context/AuthContext.jsx";
import {getCat,getStatus,timeAgo} from "../utils/constants.js";
import Avatar from "./Avatar.jsx";
import "./PostCard.css";

export default function PostCard({report:init,isNew=false,onClick,threshold=5,onDelete}){
  const [r,setR]=useState(init);
  const [busy,setBusy]=useState(false);
  const [deleting,setDeleting]=useState(false);
  const {user}=useAuth();
  const navigate=useNavigate();
  const cat=getCat(r.category);
  const status=getStatus(r.status);
  const isOwn=user?.id===r.user_id;
  const isPinned=r.pinned_to_map===true||r.pinned_to_map===1;
  const progress=Math.min(((r.unique_upvoters||0)/threshold)*100,100);

  const vote=async(e,type)=>{
    e.stopPropagation();
    if(busy||isOwn)return;
    setBusy(true);
    try{ const res=await reportsApi.vote(r.id,type); setR(p=>({...p,...res})); }
    catch(err){console.error(err);}
    finally{setBusy(false);}
  };

  const handleDelete=async(e)=>{
    e.stopPropagation();
    if(!confirm("Delete this report?"))return;
    setDeleting(true);
    try{ await reportsApi.delete(r.id); onDelete?.(r.id); }
    catch(err){ alert(err.message); setDeleting(false); }
  };

  return(
    <article className={`pc ${isNew?"pc-new":""}`}>
      {/* Header */}
      <div className="pc-head">
        <div className="pc-head-user" onClick={()=>navigate(`/profile/${r.user_id}`)}>
          <Avatar user={r.author} size={38}/>
          <div className="pc-head-info">
            <div className="pc-username">@{r.author?.username||"unknown"}{r.author?.badge&&<span className="pc-badge">{r.author.badge}</span>}</div>
            <div className="pc-meta">
              <span className="pc-cat" style={{color:cat.color}}>{cat.icon} {cat.label}</span>
              <span className="pc-dot">·</span>
              <span className="pc-time">{timeAgo(r.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="pc-head-actions">
          {isPinned&&<div className="pc-pinned">📍 Pinned</div>}
          {isOwn&&(
            <button className="pc-delete-btn" onClick={handleDelete} disabled={deleting} title="Delete report">
              {deleting?<span style={{fontSize:12}}>…</span>:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>}
            </button>
          )}
        </div>
      </div>

      {/* Image */}
      {r.image_url&&(
        <div className="pc-img-wrap" onClick={()=>onClick?.(r.id)}>
          <img src={r.image_url} alt={r.title} className="pc-img" loading="lazy" onError={e=>e.target.parentElement.style.display="none"}/>
          <div className="pc-img-overlay">
            <span className="pc-status-chip" style={{color:status.color,background:`${status.color}22`,border:`1px solid ${status.color}44`}}>{status.label}</span>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="pc-body" onClick={()=>onClick?.(r.id)}>
        {!r.image_url&&<span className="pc-status-chip pc-status-inline" style={{color:status.color,background:`${status.color}22`,border:`1px solid ${status.color}44`}}>{status.label}</span>}
        <h3 className="pc-title">{r.title}</h3>
        <p className="pc-desc">{r.description}</p>
        {r.address&&<div className="pc-loc"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3"/><path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8z"/></svg>{r.address.split(",").slice(0,2).join(",")}</div>}
      </div>

      {/* Progress bar */}
      {!isPinned&&(
        <div className="pc-progress-wrap">
          <div className="pc-progress-track"><div className="pc-progress-fill" style={{width:`${progress}%`}}/></div>
          <span className="pc-progress-label">{r.unique_upvoters||0}/{threshold} unique upvotes to pin on map</span>
        </div>
      )}

      {/* Actions */}
      <div className="pc-actions">
        <div className="pc-votes">
          <button className={`vote-btn up ${r.userVote==="up"?"voted":""} ${isOwn?"own":""}`} onClick={e=>vote(e,"up")} disabled={busy||isOwn} title={isOwn?"Can't vote own post":"Upvote"}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={r.userVote==="up"?"currentColor":"none"} stroke="currentColor" strokeWidth="2.2"><polyline points="18 15 12 9 6 15"/></svg>
            <span>{r.upvote_count||0}</span>
          </button>
          <div className={`net-score ${(r.net_votes||0)>0?"pos":(r.net_votes||0)<0?"neg":""}`}>{r.net_votes||0}</div>
          <button className={`vote-btn dn ${r.userVote==="down"?"voted":""} ${isOwn?"own":""}`} onClick={e=>vote(e,"down")} disabled={busy||isOwn} title={isOwn?"Can't vote own post":"Downvote"}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={r.userVote==="down"?"currentColor":"none"} stroke="currentColor" strokeWidth="2.2"><polyline points="6 9 12 15 18 9"/></svg>
            <span>{r.downvote_count||0}</span>
          </button>
        </div>
        <button className="comment-btn" onClick={()=>onClick?.(r.id)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span>{r.comment_count||0}</span>
        </button>
      </div>
    </article>
  );
}
