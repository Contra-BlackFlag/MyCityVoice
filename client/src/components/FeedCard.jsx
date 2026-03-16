// components/FeedCard.jsx
import React, { useState } from "react";
import { getCategoryInfo, getStatusInfo, formatRelativeTime } from "../utils/constants";
import { reportsApi } from "../services/api";
import { useSession } from "../hooks/useSession";
import "./FeedCard.css";

export default function FeedCard({ report, onClick, isNew = false }) {
  const [upvotes, setUpvotes] = useState(report.upvotes || 0);
  const [upvoted, setUpvoted] = useState(() => {
    const votes = JSON.parse(localStorage.getItem("civic_votes") || "{}");
    return !!votes[report.id];
  });
  const [loading, setLoading] = useState(false);
  const { sessionId } = useSession();

  const cat = getCategoryInfo(report.category);
  const status = getStatusInfo(report.status);

  const handleUpvote = async (e) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const res = await reportsApi.upvote(report.id, sessionId);
      setUpvotes(res.upvotes);
      setUpvoted(res.voted);
      const votes = JSON.parse(localStorage.getItem("civic_votes") || "{}");
      if (res.voted) votes[report.id] = true;
      else delete votes[report.id];
      localStorage.setItem("civic_votes", JSON.stringify(votes));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`feed-card ${isNew ? "is-new" : ""}`} onClick={() => onClick(report.id)}>
      {isNew && <div className="new-badge">NEW</div>}

      <div className="card-top">
        <div className="card-category" style={{ "--cat-color": cat.color }}>
          <span>{cat.icon}</span>
          <span>{cat.label}</span>
        </div>
        <span className="card-status" style={{ "--status-color": status.color }}>
          {status.label}
        </span>
      </div>

      {report.image_url && (
        <div className="card-image-wrap">
          <img
            src={report.image_url}
            alt={report.title}
            className="card-image"
            loading="lazy"
            onError={(e) => (e.target.parentElement.style.display = "none")}
          />
        </div>
      )}

      <div className="card-body">
        <h3 className="card-title">{report.title}</h3>
        <p className="card-desc">{report.description}</p>
      </div>

      <div className="card-location">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="10" r="3" />
          <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8z" />
        </svg>
        <span>{report.address ? report.address.split(",").slice(0, 2).join(",") : `${Number(report.latitude).toFixed(3)}, ${Number(report.longitude).toFixed(3)}`}</span>
      </div>

      <div className="card-footer">
        <span className="card-time">{formatRelativeTime(report.created_at)}</span>
        <div className="card-actions">
          <button
            className={`card-upvote ${upvoted ? "upvoted" : ""}`}
            onClick={handleUpvote}
            disabled={loading}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={upvoted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            {upvotes}
          </button>
          <button className="card-view-btn">View →</button>
        </div>
      </div>
    </div>
  );
}
