import React, { useState } from "react";
import { authApi } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import "./AuthPage.css";

export default function AuthPage() {
  const [mode,    setMode]    = useState("login");
  const [form,    setForm]    = useState({ username:"", email:"", password:"" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const set = (k,v) => { setForm(p=>({...p,[k]:v})); setError(""); };

  const submit = async e => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = mode==="login"
        ? await authApi.login({ email:form.email, password:form.password })
        : await authApi.register({ username:form.username, email:form.email, password:form.password });
      login(res.token, res.user);
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />

      <div className="auth-card fade-up">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C7.03 2 3 6.03 3 11c0 6.25 9 13 9 13s9-6.75 9-13c0-4.97-4.03-9-9-9z" fill="var(--orange)" opacity=".95"/>
              <circle cx="12" cy="11" r="3.5" fill="#fff" opacity=".95"/>
            </svg>
          </div>
          <h1 className="auth-brand">CivicPulse</h1>
          <p className="auth-tagline">Report. Verify. Fix.</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode==="register" && (
            <div className="auth-field">
              <label>Username</label>
              <input type="text" placeholder="yourname" value={form.username}
                onChange={e=>set("username",e.target.value)} minLength={3} required />
            </div>
          )}
          <div className="auth-field">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" value={form.email}
              onChange={e=>set("email",e.target.value)} required />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password"
              placeholder={mode==="register" ? "Min 6 characters" : "••••••••"}
              value={form.password} onChange={e=>set("password",e.target.value)}
              minLength={6} required />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? <span className="auth-spin" />
              : mode==="login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>

        <button className="auth-toggle"
          onClick={()=>{ setMode(m=>m==="login"?"register":"login"); setError(""); }}>
          {mode==="login"
            ? <><span>Don't have an account?</span><strong>Sign Up</strong></>
            : <><span>Already have an account?</span><strong>Sign In</strong></>}
        </button>

        <p className="auth-note">🗺️ Help fix your city — one report at a time</p>
      </div>
    </div>
  );
}
