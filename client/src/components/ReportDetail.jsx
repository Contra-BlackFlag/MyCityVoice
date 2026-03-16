// components/ReportDetail.jsx
import React, { useState, useEffect } from "react";
import { reportsApi } from "../services/api";
import { useSession } from "../hooks/useSession";
import { getCategoryInfo, getStatusInfo, formatRelativeTime } from "../utils/constants";
import "./ReportDetail.css";

export default function ReportDetail({ reportId, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [upvoted, setUpvoted] = useState(false);
  const { sessionId } = useSession();

  useEffect(() => {
    if (!reportId) return;
    setLoading(true);
    reportsApi
      .getById(reportId)
      .then((res) => {
        setReport(res.data);
        const votes = JSON.parse(localStorage.getItem("civic_votes") || "{}");
        setUpvoted(!!votes[reportId]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [reportId]);

  const handleUpvote = async () => {
    if (!report) return;
    try {
      const res = await reportsApi.upvote(report.id, sessionId);
      setReport((p) => ({ ...p, upvotes: res.upvotes }));
      setUpvoted(res.voted);
      const votes = JSON.parse(localStorage.getItem("civic_votes") || "{}");
      if (res.voted) votes[report.id] = true;
      else delete votes[report.id];
      localStorage.setItem("civic_votes", JSON.stringify(votes));
    } catch (err) {
      console.error(err);
    }
  };

  const handleComment = async () => {
    if (!comment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await reportsApi.addComment(report.id, comment.trim());
      setReport((p) => ({ ...p, comments: [...(p.comments || []), res.data] }));
      setComment("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const cat = report ? getCategoryInfo(report.category) : null;
  const status = report ? getStatusInfo(report.status) : null;

  return (
    <div className="detail-panel fade-in">
      <div className="detail-header">
        <button className="detail-close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h3 className="detail-heading">Issue Details</h3>
      </div>

      {loading ? (
        <div className="detail-loading">
          <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 24, width: "60%" }} />
          <div className="skeleton" style={{ height: 16, width: "40%" }} />
          <div className="skeleton" style={{ height: 80 }} />
        </div>
      ) : report ? (
        <div className="detail-content">
          {report.image_url && (
            <div className="detail-image-wrap">
              <img
                src={report.image_url}
                alt={report.title}
                className="detail-image"
                onError={(e) => (e.target.style.display = "none")}
              />
            </div>
          )}

          <div className="detail-meta">
            <div className="detail-badges">
              <span className="badge-cat" style={{ "--cat-color": cat?.color }}>
                {cat?.icon} {cat?.label}
              </span>
              <span className="badge-status" style={{ "--status-color": status?.color }}>
                {status?.label}
              </span>
            </div>
            <span className="detail-time">{formatRelativeTime(report.created_at)}</span>
          </div>

          <h2 className="detail-title">{report.title}</h2>
          <p className="detail-description">{report.description}</p>

          <div className="detail-location">
            <span className="loc-pin">📍</span>
            <span className="loc-text">{report.address || `${report.latitude?.toFixed(4)}, ${report.longitude?.toFixed(4)}`}</span>
          </div>

          <div className="detail-actions">
            <button
              className={`upvote-btn ${upvoted ? "upvoted" : ""}`}
              onClick={handleUpvote}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill={upvoted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M7 11l5-5 5 5M7 17l5-5 5 5" />
              </svg>
              {report.upvotes} Upvote{report.upvotes !== 1 ? "s" : ""}
            </button>
            <div className="comment-count-badge">
              💬 {report.comments?.length || 0} comment{report.comments?.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Comments */}
          <div className="comments-section">
            <h4 className="comments-heading">Community Comments</h4>

            <div className="comment-input-row">
              <input
                className="comment-input"
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                maxLength={500}
              />
              <button
                className="comment-submit"
                onClick={handleComment}
                disabled={!comment.trim() || submittingComment}
              >
                {submittingComment ? "..." : "Post"}
              </button>
            </div>

            <div className="comments-list">
              {report.comments?.length === 0 ? (
                <div className="no-comments">
                  <span>🔇</span>
                  <p>No comments yet. Be the first!</p>
                </div>
              ) : (
                [...(report.comments || [])].reverse().map((c) => (
                  <div key={c.id} className="comment-item">
                    <div className="comment-avatar">
                      {c.content.charAt(0).toUpperCase()}
                    </div>
                    <div className="comment-body">
                      <p className="comment-text">{c.content}</p>
                      <span className="comment-time">{formatRelativeTime(c.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="detail-error">Report not found.</div>
      )}
    </div>
  );
}
