import React from "react";
export default function Avatar({user,size=36,className=""}){
  const letter=(user?.username||"?")[0].toUpperCase();
  const color=user?.avatar_color||"#ff5a1f";
  if(user?.avatar_url){
    return(
      <img src={user.avatar_url} alt={user.username}
        style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",border:`2px solid ${color}55`,flexShrink:0}}
        className={className}
        onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="flex";}}
      />
    );
  }
  return(
    <div className={className} style={{width:size,height:size,borderRadius:"50%",background:`${color}1e`,border:`2px solid ${color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:Math.round(size*.38),fontWeight:800,color,flexShrink:0,userSelect:"none"}}>
      {letter}
    </div>
  );
}
