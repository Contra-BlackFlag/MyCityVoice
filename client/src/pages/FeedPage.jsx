// pages/FeedPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { reportsApi } from "../services/api";
import { useSocket } from "../context/SocketContext";
import { CATEGORIES, STATUSES } from "../utils/constants";
import FeedCard from "../components/FeedCard";
import ReportDetail from "../components/ReportDetail";
import "./FeedPage.css";

const LIMIT = 20;

export default function FeedPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [newIds, setNewIds] = useState(new Set());
  const [filters, setFilters] = useState({ category: "all", status: "all", sort: "newest" });
  const [liveCount, setLiveCount] = useState(0);
  const { socket } = useSocket();
  const topRef = useRef(null);

  const fetchReports = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }
      try {
        const currentOffset = reset ? 0 : offset;
        const res = await reportsApi.getAll({
          category: filters.category,
          status: filters.status,
          sort: filters.sort,
          limit: LIMIT,
          offset: currentOffset,
        });
        if (reset) {
          setReports(res.data);
          setOffset(LIMIT);
        } else {
          setReports((prev) => [...prev, ...res.data]);
          setOffset((prev) => prev + LIMIT);
        }
        setTotal(res.total);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters, offset]
  );

  useEffect(() => {
    fetchReports(true);
  }, [filters]);

  useEffect(() => {
    if (!socket) return;
    const handler = (newReport) => {
      setReports((prev) => {
        if (filters.category !== "all" && newReport.category !== filters.category)
          return prev;
        return [newReport, ...prev];
      });
      setNewIds((prev) => new Set([...prev, newReport.id]));
      setLiveCount((c) => c + 1);
      setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          next.delete(newReport.id);
          return next;
        });
      }, 5000);
    };
    socket.on("new_report", handler);
    return () => socket.off("new_report", handler);
  }, [socket, filters.category]);

  useEffect(() => {
    if (!socket) return;
    const handler = ({ reportId, upvotes }) => {
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, upvotes } : r))
      );
    };
    socket.on("upvote_update", handler);
    return () => socket.off("upvote_update", handler);
  }, [socket]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setLiveCount(0);
  };

  const hasMore = reports.length < total;

  return (
    <div className="feed-page">
      <div ref={topRef} />

      {/* Sidebar filters */}
      <aside className="feed-sidebar">
        <div className="sidebar-section">
          <h3 className="sidebar-heading">Sort By</h3>
          {[
            { value: "newest", label: "🕐 Newest First" },
            { value: "oldest", label: "📅 Oldest First" },
            { value: "popular", label: "🔥 Most Upvoted" },
          ].map((opt) => (
            <button
              key={opt.value}
              className={`sidebar-option ${filters.sort === opt.value ? "active" : ""}`}
              onClick={() => handleFilterChange("sort", opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-heading">Category</h3>
          <button
            className={`sidebar-option ${filters.category === "all" ? "active" : ""}`}
            onClick={() => handleFilterChange("category", "all")}
          >
            🗂️ All Categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              className={`sidebar-option ${filters.category === cat.value ? "active" : ""}`}
              onClick={() => handleFilterChange("category", cat.value)}
            >
              {cat.icon} {cat.label.split(" / ")[0]}
            </button>
          ))}
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-heading">Status</h3>
          <button
            className={`sidebar-option ${filters.status === "all" ? "active" : ""}`}
            onClick={() => handleFilterChange("status", "all")}
          >
            📋 All Statuses
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              className={`sidebar-option ${filters.status === s.value ? "active" : ""}`}
              onClick={() => handleFilterChange("status", s.value)}
              style={{ "--status-color": s.color }}
            >
              <span className="sidebar-status-dot" />
              {s.label}
            </button>
          ))}
        </div>
      </aside>

      {/* Main feed */}
      <main className="feed-main">
        <div className="feed-header">
          <div className="feed-title-group">
            <h1 className="feed-title">
              <span className="live-dot" />
              Live Feed
            </h1>
            <span className="feed-count">{total} reports</span>
          </div>
          {liveCount > 0 && (
            <div className="live-badge" onClick={() => topRef.current?.scrollIntoView({ behavior: "smooth" })}>
              <span className="live-dot" />
              {liveCount} new since you arrived
            </div>
          )}
        </div>

        {loading ? (
          <div className="feed-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-skeleton">
                <div className="skeleton" style={{ height: 180 }} />
                <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="skeleton" style={{ height: 16, width: "70%" }} />
                  <div className="skeleton" style={{ height: 12, width: "90%" }} />
                  <div className="skeleton" style={{ height: 12, width: "55%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="feed-empty">
            <div className="empty-icon">📭</div>
            <h3>No reports yet</h3>
            <p>Be the first to report a civic issue in your area!</p>
          </div>
        ) : (
          <>
            <div className="feed-grid">
              {reports.map((report) => (
                <FeedCard
                  key={report.id}
                  report={report}
                  isNew={newIds.has(report.id)}
                  onClick={(id) => setSelectedId(id)}
                />
              ))}
            </div>

            {hasMore && (
              <div className="load-more-wrap">
                <button
                  className="load-more-btn"
                  onClick={() => fetchReports(false)}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <span className="btn-spinner" /> Loading...
                    </>
                  ) : (
                    `Load More (${total - reports.length} remaining)`
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Detail modal */}
      {selectedId && (
        <div className="feed-detail-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedId(null)}>
          <div className="feed-detail-panel fade-in">
            <ReportDetail reportId={selectedId} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
