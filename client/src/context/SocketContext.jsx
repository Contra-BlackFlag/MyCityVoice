import React,{createContext,useContext,useEffect,useState} from "react";
import {io} from "socket.io-client";
const Ctx=createContext(null);
const URL=window.location.hostname==="localhost"?"http://localhost:5000":window.location.origin;
export function SocketProvider({children}){
  const [socket,setSocket]=useState(null);
  const [connected,setConnected]=useState(false);
  useEffect(()=>{
    const s=io(URL,{transports:["websocket","polling"]});
    s.on("connect",()=>setConnected(true));
    s.on("disconnect",()=>setConnected(false));
    setSocket(s);return()=>s.disconnect();
  },[]);
  return <Ctx.Provider value={{socket,connected}}>{children}</Ctx.Provider>;
}
export const useSocket=()=>useContext(Ctx);
