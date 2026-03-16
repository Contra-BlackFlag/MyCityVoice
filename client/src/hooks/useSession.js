// hooks/useSession.js
import { useMemo } from "react";

export function useSession() {
  const sessionId = useMemo(() => {
    let id = localStorage.getItem("civic_session_id");
    if (!id) {
      id = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("civic_session_id", id);
    }
    return id;
  }, []);

  return { sessionId };
}
