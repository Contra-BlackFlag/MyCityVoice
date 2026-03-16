// components/ReportModal.jsx
import React, { useState, useRef, useCallback } from "react";
import { reportsApi } from "../services/api";
import { CATEGORIES } from "../utils/constants";
import "./ReportModal.css";

export default function ReportModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: form, 2: location, 3: submitting, 4: done
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "pothole",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [locError, setLocError] = useState("");
  const [locLoading, setLocLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleImageChange = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: "Image must be under 10MB" }));
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    setErrors((prev) => ({ ...prev, image: "" }));
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    else if (formData.title.length < 5) newErrors.title = "Title must be at least 5 characters";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    else if (formData.description.length < 20) newErrors.description = "Please describe the issue in at least 20 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchLocation = useCallback(() => {
    setLocLoading(true);
    setLocError("");
    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by your browser.");
      setLocLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          if (data.display_name) address = data.display_name;
        } catch (_) {}
        setLocation({ latitude, longitude, address });
        setLocLoading(false);
      },
      (err) => {
        setLocError(
          err.code === 1
            ? "Location permission denied. Please allow location access."
            : "Unable to retrieve your location. Please try again."
        );
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
      fetchLocation();
    }
  };

  const handleSubmit = async () => {
    if (!location) {
      setLocError("Location is required to submit a report.");
      return;
    }
    setStep(3);
    setSubmitError("");
    try {
      const fd = new FormData();
      fd.append("title", formData.title);
      fd.append("description", formData.description);
      fd.append("category", formData.category);
      fd.append("latitude", location.latitude);
      fd.append("longitude", location.longitude);
      fd.append("address", location.address);
      if (imageFile) fd.append("image", imageFile);

      const result = await reportsApi.create(fd);
      setStep(4);
      setTimeout(() => {
        onSuccess && onSuccess(result.data);
        onClose();
      }, 2000);
    } catch (err) {
      setSubmitError(err.message || "Submission failed. Please try again.");
      setStep(2);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container fade-in">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h2 className="modal-title">Report Civic Issue</h2>
            <div className="step-indicator">
              <span className={`step-dot ${step >= 1 ? "active" : ""}`} />
              <span className="step-line" />
              <span className={`step-dot ${step >= 2 ? "active" : ""}`} />
              <span className="step-line" />
              <span className={`step-dot ${step >= 4 ? "active" : ""}`} />
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="modal-body">
            {/* Category */}
            <div className="field-group">
              <label className="field-label">Issue Category</label>
              <div className="category-grid">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    className={`cat-btn ${formData.category === cat.value ? "selected" : ""}`}
                    style={{ "--cat-color": cat.color }}
                    onClick={() => setFormData((p) => ({ ...p, category: cat.value }))}
                  >
                    <span className="cat-icon">{cat.icon}</span>
                    <span className="cat-label">{cat.label.split(" / ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="field-group">
              <label className="field-label">Issue Title <span className="required">*</span></label>
              <input
                className={`field-input ${errors.title ? "error" : ""}`}
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Large pothole on MG Road near bus stop"
                maxLength={100}
              />
              {errors.title && <span className="field-error">{errors.title}</span>}
            </div>

            {/* Description */}
            <div className="field-group">
              <label className="field-label">Description <span className="required">*</span></label>
              <textarea
                className={`field-textarea ${errors.description ? "error" : ""}`}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the issue in detail. When did you notice it? How severe is it?"
                rows={4}
                maxLength={1000}
              />
              <div className="char-count">{formData.description.length}/1000</div>
              {errors.description && <span className="field-error">{errors.description}</span>}
            </div>

            {/* Image Upload */}
            <div className="field-group">
              <label className="field-label">Photo Evidence <span className="optional">(optional)</span></label>
              {imagePreview ? (
                <div className="image-preview-container">
                  <img src={imagePreview} alt="Preview" className="image-preview" />
                  <button className="remove-image" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                  <div className="upload-icon">📷</div>
                  <p className="upload-text">Click to upload or drag & drop</p>
                  <p className="upload-sub">JPEG, PNG or WebP • Max 10MB</p>
                  <button
                    type="button"
                    className="btn-camera"
                    onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                  >
                    📸 Take Photo
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(e) => handleImageChange(e.target.files[0])}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => handleImageChange(e.target.files[0])}
              />
              {errors.image && <span className="field-error">{errors.image}</span>}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={handleNext}>
                Next: Add Location →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <div className="modal-body">
            <div className="location-step">
              {locLoading ? (
                <div className="loc-loading">
                  <div className="loc-spinner" />
                  <p>Fetching your location...</p>
                  <span>Please allow location access if prompted</span>
                </div>
              ) : location ? (
                <div className="loc-success">
                  <div className="loc-icon-success">📍</div>
                  <h3>Location Captured</h3>
                  <p className="loc-address">{location.address}</p>
                  <div className="loc-coords">
                    <span>{location.latitude.toFixed(5)}°N</span>
                    <span>{location.longitude.toFixed(5)}°E</span>
                  </div>
                  <button className="btn-refetch" onClick={fetchLocation}>
                    🔄 Refresh Location
                  </button>
                </div>
              ) : (
                <div className="loc-empty">
                  <div className="loc-icon">🗺️</div>
                  <h3>Location Required</h3>
                  <p>We need your location to pin the issue on the map.</p>
                  <button className="btn-primary" onClick={fetchLocation}>
                    📍 Get My Location
                  </button>
                </div>
              )}
              {locError && (
                <div className="loc-error">
                  <span>⚠️ {locError}</span>
                  <button onClick={fetchLocation}>Try Again</button>
                </div>
              )}
              {submitError && (
                <div className="loc-error">
                  <span>❌ {submitError}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={!location || locLoading}
              >
                🚨 Submit Report
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Submitting */}
        {step === 3 && (
          <div className="modal-body">
            <div className="submitting-state">
              <div className="submit-spinner" />
              <h3>Submitting Report...</h3>
              <p>Uploading your report to the civic network</p>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="modal-body">
            <div className="success-state">
              <div className="success-icon">✅</div>
              <h3>Report Submitted!</h3>
              <p>Your issue has been pinned on the map and added to the live feed.</p>
              <p className="success-sub">The community can now see and upvote your report.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
