// App.jsx
import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SocketProvider } from "./context/SocketContext";
import Navbar from "./components/Navbar";
import MapPage from "./pages/MapPage";
import FeedPage from "./pages/FeedPage";
import ReportModal from "./components/ReportModal";

export default function App() {
  const [showReportModal, setShowReportModal] = useState(false);

  const handleReportSuccess = (newReport) => {
    // Reports propagate via socket.io automatically
    console.log("New report submitted:", newReport?.id);
  };

  return (
    <BrowserRouter>
      <SocketProvider>
        <Navbar onReportClick={() => setShowReportModal(true)} />

        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="*" element={<MapPage />} />
        </Routes>

        {showReportModal && (
          <ReportModal
            onClose={() => setShowReportModal(false)}
            onSuccess={handleReportSuccess}
          />
        )}
      </SocketProvider>
    </BrowserRouter>
  );
}
