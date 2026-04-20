import React,{useState} from "react";
import {authApi} from "../services/api.js";
import {useAuth}  from "../context/AuthContext.jsx";
import "./AuthPage.css";

export default function AuthPage(){
  const [mode,setMode]=useState("login");
  const [form,setForm]=useState({username:"",email:"",password:"",secret_code:""});
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [loading,setLoading]=useState(false);
  const {login}=useAuth();

  const set=(k,v)=>{setForm(p=>({...p,[k]:v}));setError("");setSuccess("");};

  const submit=async e=>{
    e.preventDefault();setLoading(true);setError("");setSuccess("");
    try{
      if(mode==="forgot"){
        await authApi.forgotPassword({email:form.email});
        setSuccess("Reset link sent! Check your inbox.");
        setLoading(false);return;
      }
      const res = mode==="login" ? await authApi.login({email:form.email,password:form.password})
                : mode==="admin" ? await authApi.adminRegister({username:form.username,email:form.email,password:form.password,secret_code:form.secret_code})
                : await authApi.register({username:form.username,email:form.email,password:form.password});
      login(res.token,res.user);
    }catch(err){setError(err.message);}
    finally{setLoading(false);}
  };

  const switchMode=(m)=>{setMode(m);setError("");setSuccess("");};

  return(
    <div className="auth-page">
      <div className="auth-bg-1"/><div className="auth-bg-2"/>
      <div className="auth-card fade-up">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C7.03 2 3 6.03 3 11c0 6.25 9 13 9 13s9-6.75 9-13c0-4.97-4.03-9-9-9z" fill="var(--orange)"/>
              <circle cx="12" cy="11" r="3.5" fill="#fff" opacity=".95"/>
            </svg>
          </div>
          <h1>CivicPulse</h1>
          <p>{mode==="admin"?"Admin Portal":"Report. Verify. Fix."}</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {(mode==="register"||mode==="admin")&&(
            <div className="form-field">
              <label className="form-label">Username</label>
              <input className="form-input" type="text" placeholder="yourname" value={form.username} onChange={e=>set("username",e.target.value)} minLength={3} required/>
            </div>
          )}
          <div className="form-field">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e=>set("email",e.target.value)} required/>
          </div>
          {mode!=="forgot"&&(
            <div className="form-field">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder={mode==="login"?"••••••••":"Min 6 characters"} value={form.password} onChange={e=>set("password",e.target.value)} minLength={6} required/>
            </div>
          )}
          {mode==="admin"&&(
            <div className="form-field">
              <label className="form-label">Admin Secret Code</label>
              <input className="form-input" type="password" placeholder="Enter secret code" value={form.secret_code} onChange={e=>set("secret_code",e.target.value)} required/>
            </div>
          )}
          {error&&<div className="auth-msg auth-err">{error}</div>}
          {success&&<div className="auth-msg auth-ok">{success}</div>}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading?<span className="auth-spin"/>
              :mode==="login"?"Sign In"
              :mode==="forgot"?"Send Reset Link"
              :mode==="admin"?"Create Admin Account"
              :"Create Account"}
          </button>
        </form>

        <div className="auth-links">
          {mode==="login"&&<>
            <button className="auth-toggle" onClick={()=>switchMode("register")}><span>Don't have an account?</span><strong>Sign Up</strong></button>
            <button className="auth-link" onClick={()=>switchMode("forgot")}>Forgot password?</button>
            <button className="auth-link auth-admin-link" onClick={()=>switchMode("admin")}>🛡️ Admin Registration</button>
          </>}
          {mode!=="login"&&<button className="auth-toggle" onClick={()=>switchMode("login")}><span>Already have an account?</span><strong>Sign In</strong></button>}
        </div>
      </div>
    </div>
  );
}
