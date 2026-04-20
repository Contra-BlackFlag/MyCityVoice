import React,{useState} from "react";
import {BrowserRouter,Routes,Route,Navigate} from "react-router-dom";
import {AuthProvider,useAuth} from "./context/AuthContext.jsx";
import {SocketProvider}       from "./context/SocketContext.jsx";
import TopBar      from "./components/TopBar.jsx";
import BottomNav   from "./components/BottomNav.jsx";
import CreateModal from "./components/CreateModal.jsx";
import AuthPage          from "./pages/AuthPage.jsx";
import FeedPage          from "./pages/FeedPage.jsx";
import MapPage           from "./pages/MapPage.jsx";
import LeaderboardPage   from "./pages/LeaderboardPage.jsx";
import ProfilePage       from "./pages/ProfilePage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import AdminDashboard    from "./pages/admin/AdminDashboard.jsx";

function Shell(){
  const {user,loading}=useAuth();
  const [showCreate,setShowCreate]=useState(false);
  if(loading) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0a0a0a"}}>
      <div className="spinner"/>
    </div>
  );
  if(!user) return <AuthPage/>;
  if(user.role==="admin") return(
    <Routes>
      <Route path="/admin/*" element={<AdminDashboard/>}/>
      <Route path="*"        element={<Navigate to="/admin" replace/>}/>
    </Routes>
  );
  return(
    <div className="app-shell">
      <TopBar onCreateClick={()=>setShowCreate(true)}/>
      <main className="app-main">
        <Routes>
          <Route path="/"             element={<FeedPage/>}/>
          <Route path="/map"          element={<MapPage/>}/>
          <Route path="/leaderboard"  element={<LeaderboardPage/>}/>
          <Route path="/profile"      element={<ProfilePage/>}/>
          <Route path="/profile/:uid" element={<ProfilePage/>}/>
          <Route path="*"             element={<Navigate to="/" replace/>}/>
        </Routes>
      </main>
      <BottomNav onCreateClick={()=>setShowCreate(true)}/>
      {showCreate&&<CreateModal onClose={()=>setShowCreate(false)}/>}
    </div>
  );
}

export default function App(){
  return(
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/reset-password" element={<ResetPasswordPage/>}/>
            <Route path="*"               element={<Shell/>}/>
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
