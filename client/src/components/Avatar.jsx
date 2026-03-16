import React from "react";
export default function Avatar({ user, size = 36 }) {
  const letter = (user?.username || "?")[0].toUpperCase();
  const color  = user?.avatar_color || "#ff5a1f";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `${color}1e`, border: `2px solid ${color}55`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * .38), fontWeight: 800,
      color, flexShrink: 0, userSelect: "none",
    }}>
      {letter}
    </div>
  );
}
