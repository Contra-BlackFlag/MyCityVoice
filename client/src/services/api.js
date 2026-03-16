import axios from "axios";

const api = axios.create({ baseURL: "/api", timeout: 30000 });

// Attach JWT token from localStorage on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem("cp_token");
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r.data,
  e => Promise.reject(new Error(e.response?.data?.error || e.message))
);

export default api;

export const authApi = {
  register: d => api.post("/auth/register", d),
  login:    d => api.post("/auth/login", d),
  me:       () => api.get("/auth/me"),
};

export const reportsApi = {
  getFeed:       p  => api.get("/reports", { params: p }),
  getMap:        () => api.get("/reports/map"),
  getById:       id => api.get(`/reports/${id}`),
  create:        fd => api.post("/reports", fd, { headers: { "Content-Type": "multipart/form-data" } }),
  vote:          (id, type) => api.post(`/reports/${id}/vote`, { type }),
  comment:       (id, content) => api.post(`/reports/${id}/comments`, { content }),
  getLeaderboard:() => api.get("/reports/leaderboard"),
  getUserReports:uid => api.get(`/reports/user/${uid}`),
};
