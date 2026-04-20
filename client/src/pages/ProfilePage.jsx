import React,{useState,useEffect,useRef} from "react";
import {useParams}    from "react-router-dom";
import {reportsApi}   from "../services/api.js";
import {authApi}      from "../services/api.js";
import {useAuth}      from "../context/AuthContext.jsx";
import Avatar         from "../components/Avatar.jsx";
import PostCard        from "../components/PostCard.jsx";
import DetailDrawer   from "../components/DetailDrawer.jsx";
import "./ProfilePage.css";

export default function ProfilePage(){
  const {uid}=useParams();
  const {user:me,logout,login,setUser}=useAuth();
  const targetId=uid||me?.id;
  const isOwn=!uid||uid===me?.id;

  const [profile,setProfile]=useState(null);
  const [posts,setPosts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [selectedId,setSelectedId]=useState(null);
  const [editing,setEditing]=useState(false);
  const [editForm,setEditForm]=useState({username:"",bio:""});
  const [avatarFile,setAvatarFile]=useState(null);
  const [avatarPreview,setAvatarPreview]=useState(null);
  const [saving,setSaving]=useState(false);
  const [editErr,setEditErr]=useState("");
  const avatarRef=useRef();

  useEffect(()=>{
    if(!targetId)return;
    setLoading(true);
    reportsApi.getUserReports(targetId)
      .then(r=>{setProfile(r.user);setPosts(r.data);})
      .catch(console.error)
      .finally(()=>setLoading(false));
  },[targetId]);

  const startEdit=()=>{
    setEditForm({username:profile?.username||"",bio:profile?.bio||""});
    setAvatarFile(null);setAvatarPreview(null);setEditErr("");
    setEditing(true);
  };

  const handleAvatarChange=e=>{
    const file=e.target.files[0];
    if(!file)return;
    setAvatarFile(file);
    const r=new FileReader();r.onload=e=>setAvatarPreview(e.target.result);r.readAsDataURL(file);
  };

  const saveProfile=async()=>{
    setSaving(true);setEditErr("");
    try{
      const fd=new FormData();
      if(editForm.username!==profile?.username)fd.append("username",editForm.username);
      fd.append("bio",editForm.bio);
      if(avatarFile)fd.append("avatar",avatarFile);
      const res=await authApi.updateProfile(fd);
      setProfile(p=>({...p,...res.user}));
      // Update auth context + token
      setUser(res.user);
      if(res.token){localStorage.setItem("cp_token",res.token);}
      setEditing(false);
    }catch(e){setEditErr(e.message);}
    finally{setSaving(false);}
  };

  const score=profile?profile.verified_count*10+profile.total_upvotes*2+profile.report_count:0;
  const handleDelete=(id)=>setPosts(p=>p.filter(r=>r.id!==id));

  return(
    <div className="pp">
      {loading?(
        <div style={{display:"flex",justifyContent:"center",padding:52}}><div className="spinner"/></div>
      ):profile?(
        <>
          {/* Profile header */}
          <div className="pp-header">
            <div className="pp-avatar-wrap">
              <Avatar user={profile} size={80}/>
              {isOwn&&<button className="pp-avatar-edit" onClick={startEdit} title="Edit profile">✏️</button>}
            </div>
            <div className="pp-info">
              <div className="pp-name-row">
                <h2>@{profile.username}</h2>
                {profile.badge&&<span className="pp-badge">{profile.badge}</span>}
              </div>
              <div className="pp-score">{score} pts</div>
              {profile.bio&&<p className="pp-bio">{profile.bio}</p>}
              <div className="pp-stats">
                <div className="ppstat"><span>{profile.report_count}</span><label>Reports</label></div>
                <div className="ppstat"><span>{profile.verified_count}</span><label>Verified</label></div>
                <div className="ppstat"><span>{profile.total_upvotes}</span><label>Upvotes</label></div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isOwn&&(
            <div className="pp-actions">
              <button className="pp-edit-btn" onClick={startEdit}>✏️ Edit Profile</button>
              <button className="pp-logout-btn" onClick={logout}>Sign Out</button>
            </div>
          )}

          {/* Edit modal */}
          {editing&&(
            <div className="pp-edit-overlay" onClick={e=>e.target===e.currentTarget&&setEditing(false)}>
              <div className="pp-edit-modal">
                <div className="pp-edit-hdr">
                  <h3>Edit Profile</h3>
                  <button className="pp-edit-close" onClick={()=>setEditing(false)}>✕</button>
                </div>
                <div className="pp-edit-body">
                  {/* Avatar */}
                  <div className="pp-edit-avatar-row">
                    {avatarPreview
                      ?<img src={avatarPreview} className="pp-edit-avatar-preview" alt="preview"/>
                      :<Avatar user={profile} size={72}/>
                    }
                    <button className="pp-change-avatar-btn" onClick={()=>avatarRef.current?.click()}>
                      📷 Change Photo
                    </button>
                    <input ref={avatarRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleAvatarChange}/>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Username</label>
                    <input className="form-input" value={editForm.username}
                      onChange={e=>setEditForm(p=>({...p,username:e.target.value}))}
                      placeholder="yourname" minLength={3} maxLength={30}/>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Bio</label>
                    <textarea className="form-textarea" value={editForm.bio}
                      onChange={e=>setEditForm(p=>({...p,bio:e.target.value}))}
                      placeholder="Tell the community about yourself…" rows={3} maxLength={200}/>
                    <div style={{textAlign:"right",fontSize:10,color:"var(--text3)"}}>{editForm.bio.length}/200</div>
                  </div>
                  {editErr&&<div style={{background:"var(--red-dim)",border:"1px solid rgba(239,68,68,.3)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"var(--red)"}}>{editErr}</div>}
                  <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:4}}>
                    <button className="btn-ghost" onClick={()=>setEditing(false)}>Cancel</button>
                    <button className="btn-primary" onClick={saveProfile} disabled={saving}>
                      {saving?<><span className="spinner" style={{width:16,height:16,borderWidth:2}}/> Saving…</>:"Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Posts */}
          <div className="pp-posts-hdr"><h3>Posts ({posts.length})</h3></div>
          <div className="feed-container">
            {posts.length===0
              ?<div className="pp-empty"><div style={{fontSize:44}}>📭</div><p>{isOwn?"Nothing posted yet.":"No reports yet."}</p></div>
              :posts.map(p=><PostCard key={p.id} report={p} onClick={setSelectedId} onDelete={isOwn?handleDelete:undefined}/>)
            }
          </div>
        </>
      ):(
        <div style={{textAlign:"center",padding:52,color:"var(--text3)"}}>User not found.</div>
      )}
      {selectedId&&<DetailDrawer reportId={selectedId} onClose={()=>setSelectedId(null)}/>}
    </div>
  );
}
