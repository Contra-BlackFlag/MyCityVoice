// services/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message =
      err.response?.data?.error || err.message || "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

export const reportsApi = {
  getAll: (params = {}) => api.get("/reports", { params }),
  getMap: () => api.get("/reports/map"),
  getById: (id) => api.get(`/reports/${id}`),
  create: (formData) =>
    api.post("/reports", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  upvote: (id, session_id) =>
    api.post(`/reports/${id}/upvote`, { session_id }),
  addComment: (id, content) =>
    api.post(`/reports/${id}/comments`, { content }),
  updateStatus: (id, status) =>
    api.patch(`/reports/${id}/status`, { status }),
};

export default api;
