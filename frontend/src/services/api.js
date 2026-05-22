import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tm_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("tm_token");
      localStorage.removeItem("tm_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  // register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
};

// ── Users ─────────────────────────────────────────────────────
export const userAPI = {
  getAll: (params) => api.get("/users", { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post("/users", data),
  updateProfile: (data) => api.put("/users/profile", data),
  updateNotifications: (data) => api.put("/users/notifications", data),
  changePassword: (data) => api.put("/users/password", data),
  updatePhoto: (formData) =>
    api.put("/users/profile/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  removePhoto: () => api.delete("/users/profile/photo"),
  update: (id, data) => api.put(`/users/${id}`, data),
  updateRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
  updateStatus: (id, isActive) => api.patch(`/users/${id}/status`, { isActive }),
};

// ── Projects ──────────────────────────────────────────────────
export const projectAPI = {
  create: (data) => api.post("/projects", data),
  getAll: () => api.get("/projects"),
  getById: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  addMember: (id, data) => api.post(`/projects/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
  getTickets: (id, params) => api.get(`/projects/${id}/tickets`, { params }),
};

// ── Tickets ───────────────────────────────────────────────────
export const ticketAPI = {
  create: (data) => api.post("/tickets", data),
  getAll: (params) => api.get("/tickets", { params }),
  getMine: (params) => api.get("/tickets/mine", { params }),
  getById: (id) => api.get(`/tickets/${id}`),
  update: (id, data) => api.put(`/tickets/${id}`, data),
  delete: (id) => api.delete(`/tickets/${id}`),
  forwardTicket: (id, data) => api.post(`/tickets/${id}/forward`, data),
  addFileAttachment: (id, formData) =>
    api.post(`/tickets/${id}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  addLinkAttachment: (id, data) =>
    api.post(`/tickets/${id}/attachments/link`, data),
  removeAttachment: (id, attachmentId) =>
    api.delete(`/tickets/${id}/attachments/${attachmentId}`),
};

// ── Comments ──────────────────────────────────────────────────
export const commentAPI = {
  getByTicket: (ticketId) => api.get(`/tickets/${ticketId}/comments`),
  add: (ticketId, data) => api.post(`/tickets/${ticketId}/comments`, data),
  reply: (commentId, data) => api.post(`/comments/${commentId}/reply`, data),
  update: (commentId, data) => api.put(`/comments/${commentId}`, data),
  delete: (commentId) => api.delete(`/comments/${commentId}`),
};

// ── Chat ──────────────────────────────────────────────────────
export const chatAPI = {
  getConversations: () => api.get("/chat/conversations"),
  getPersonal: (userId) => api.get(`/chat/personal/${userId}`),
  sendPersonal: (userId, data) => api.post(`/chat/personal/${userId}`, data),
  getTeam: (teamId) => api.get(`/chat/team/${teamId}`),
  sendTeam: (teamId, data) => api.post(`/chat/team/${teamId}`, data),
};

// ── Notifications ─────────────────────────────────────────────
export const notificationAPI = {
  getAll: (params) => api.get("/notifications", { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/read-all"),
  delete: (id) => api.delete(`/notifications/${id}`),
  getVapidPublicKey: () => api.get("/notifications/vapid-public-key"),
  subscribePush: (data) => api.post("/notifications/subscribe", data),
};

// ── Teams ─────────────────────────────────────────────────────
export const teamAPI = {
  getAll: (params) => api.get("/teams", { params }),
  getById: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post("/teams", data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  delete: (id) => api.delete(`/teams/${id}`),
};

export default api;
