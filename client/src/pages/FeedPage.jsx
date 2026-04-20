import React,{useState,useEffect,useCallback,useRef} from "react";
import {reportsApi} from "../services/api.js";
import {useSocket}   from "../context/SocketContext.jsx";
import {CATEGORIES}  from "../utils/constants.js";
import PostCard      from "../components/PostCard.jsx";
import DetailDrawer  from "../components/DetailDrawer.jsx";
import "./FeedPage.css";

const LIMIT=15;

export default function FeedPage(){
  const [posts,setPosts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [moreLoading,setMoreLoading]=useState(false);
  const [total,setTotal]=useState(0);
  const [offset,setOffset]=useState(0);
  const [newIds,setNewIds]=useState(new Set());
  const [newCount,setNewCount]=useState(0);
  const [sort,setSort]=useState("newest");
  const [category,setCategory]=useState("all");
  const [selectedId,setSelectedId]=useState(null);
  const [threshold,setThreshold]=useState(5);
  const {socket}=useSocket();
  const offsetRef=useRef(0);
  const filterRef=useRef({sort:"newest",category:"all"});

  useEffect(()=>{
    reportsApi.getSettings().then(r=>setThreshold(r.pin_threshold||5)).catch(()=>{});
  },[]);

  const load=useCallback(async(reset=false,overrideFilter=null)=>{
    const f=overrideFilter||filterRef.current;
    if(reset){setLoading(true);offsetRef.current=0;}else{setMoreLoading(true);}
    try{
      const res=await reportsApi.getFeed({category:f.category,sort:f.sort,limit:LIMIT,offset:reset?0:offsetRef.current});
      setPosts(p=>reset?res.data:[...p,...res.data]);
      setTotal(res.total);
      offsetRef.current=reset?LIMIT:offsetRef.current+LIMIT;
      if(reset)setOffset(LIMIT);
    }catch(e){console.error(e);}
    finally{setLoading(false);setMoreLoading(false);}
  },[]);

  // Reload when sort or category changes
  useEffect(()=>{
    filterRef.current={sort,category};
    load(true,{sort,category});
  },[sort,category]);

  // Socket events
  useEffect(()=>{
    if(!socket)return;
    const onNew=r=>{
      setPosts(p=>[r,...p]);
      setNewIds(s=>new Set([...s,r.id]));
      setNewCount(c=>c+1);
      setTimeout(()=>setNewIds(s=>{const n=new Set(s);n.delete(r.id);return n;}),6000);
    };
    const onVote=({reportId,...data})=>setPosts(p=>p.map(r=>r.id===reportId?{...r,...data}:r));
    const onDel=({reportId})=>setPosts(p=>p.filter(r=>r.id!==reportId));
    const onSettings=({pin_threshold})=>{if(pin_threshold)setThreshold(pin_threshold);};
    socket.on("new_report",onNew);
    socket.on("vote_update",onVote);
    socket.on("report_deleted",onDel);
    socket.on("settings_update",onSettings);
    return()=>{socket.off("new_report",onNew);socket.off("vote_update",onVote);socket.off("report_deleted",onDel);socket.off("settings_update",onSettings);};
  },[socket]);

  const handleDelete=(id)=>setPosts(p=>p.filter(r=>r.id!==id));

  return(
    <div className="fp">
      {/* Sticky filter bar */}
      <div className="fp-filters">
        <div className="fp-filters-inner">
          {/* Sort */}
          <div className="fp-sort-group">
            {[{v:"newest",l:"🕐 New"},{v:"popular",l:"🔥 Hot"},{v:"oldest",l:"📅 Old"}].map(s=>(
              <button key={s.v} className={`fp-sort-btn ${sort===s.v?"active":""}`} onClick={()=>setSort(s.v)}>{s.l}</button>
            ))}
          </div>
          {/* Category scroll */}
          <div className="fp-cat-scroll">
            <button className={`fp-cat-btn ${category==="all"?"active":""}`} onClick={()=>setCategory("all")}>All</button>
            {CATEGORIES.map(c=>(
              <button key={c.value} className={`fp-cat-btn ${category===c.value?"active":""}`} style={{"--cc":c.color}} onClick={()=>setCategory(c.value)}>{c.icon} {c.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* New posts banner */}
      {newCount>0&&(
        <button className="fp-new-banner" onClick={()=>{setNewCount(0);window.scrollTo({top:0,behavior:"smooth"});}}>
          <span className="fp-pulse-dot"/>
          {newCount} new report{newCount>1?"s":""} — tap to see
        </button>
      )}

      {/* Posts */}
      <div className="feed-container">
        {loading?(
          [...Array(4)].map((_,i)=>(
            <div key={i} className="fp-skel">
              <div style={{display:"flex",gap:10,padding:"12px 14px"}}>
                <div className="skeleton" style={{width:38,height:38,borderRadius:"50%",flexShrink:0}}/>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
                  <div className="skeleton" style={{height:13,width:"45%"}}/><div className="skeleton" style={{height:11,width:"30%"}}/>
                </div>
              </div>
              <div className="skeleton" style={{height:200}}/>
              <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
                <div className="skeleton" style={{height:15,width:"68%"}}/><div className="skeleton" style={{height:12,width:"88%"}}/>
              </div>
            </div>
          ))
        ):posts.length===0?(
          <div className="fp-empty"><div style={{fontSize:52}}>📭</div><h3>No reports yet</h3><p>Be the first to report a civic issue!</p></div>
        ):(
          <>
            {posts.map(p=><PostCard key={p.id} report={p} isNew={newIds.has(p.id)} onClick={setSelectedId} threshold={threshold} onDelete={handleDelete}/>)}
            {posts.length<total&&(
              <button className="fp-more" onClick={()=>load(false)} disabled={moreLoading}>
                {moreLoading?<span className="spinner" style={{width:20,height:20,borderWidth:2}}/>:`Load more (${total-posts.length} remaining)`}
              </button>
            )}
          </>
        )}
      </div>

      {selectedId&&<DetailDrawer reportId={selectedId} onClose={()=>setSelectedId(null)}/>}
    </div>
  );
}
