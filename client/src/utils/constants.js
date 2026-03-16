// utils/constants.js

export const CATEGORIES = [
  { value: "pothole", label: "Pothole / Road Damage", icon: "🕳️", color: "#f87171" },
  { value: "garbage", label: "Garbage / Waste", icon: "🗑️", color: "#a78bfa" },
  { value: "lighting", label: "Street Lighting", icon: "💡", color: "#ffd166" },
  { value: "water", label: "Water / Flooding", icon: "💧", color: "#60a5fa" },
  { value: "sewage", label: "Sewage / Drainage", icon: "🚰", color: "#86efac" },
  { value: "vandalism", label: "Vandalism / Graffiti", icon: "🎨", color: "#fb923c" },
  { value: "other", label: "Other Issue", icon: "📌", color: "#94a3b8" },
];

export const STATUSES = [
  { value: "open", label: "Open", color: "#ff6b35" },
  { value: "in_progress", label: "In Progress", color: "#ffd166" },
  { value: "resolved", label: "Resolved", color: "#00d4aa" },
];

export const getCategoryInfo = (value) =>
  CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1];

export const getStatusInfo = (value) =>
  STATUSES.find((s) => s.value === value) || STATUSES[0];

export const formatRelativeTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
