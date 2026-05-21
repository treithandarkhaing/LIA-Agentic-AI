import axios from "axios";

const AUTH_TOKEN_KEY = "lia_auth_token";
const AUTH_USER_KEY = "lia_auth_user";

function resolveApiBaseUrl() {
  if (import.meta.env.DEV) return "/api";
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return configured;
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "127.0.0.1";
    return `http://${host}:8000`;
  }
  return "http://127.0.0.1:8000";
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 60000,
});

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

export function setAuthSession(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user || null));
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuthSession();
    }
    return Promise.reject(error);
  },
);

const aiRequestConfig = { timeout: 300000 };

export const loginApi = (payload) => api.post("/auth/login", payload).then((res) => res.data);
export const meApi = () => api.get("/auth/me").then((res) => res.data);
export const logoutApi = () => api.post("/auth/logout").then((res) => res.data);
export const plannerApi = (payload) => api.post("/planner/generate", payload).then((res) => res.data);
export const plannerChatApi = (payload) => api.post("/planner/chat", payload, aiRequestConfig).then((res) => res.data);
export const meetingApi = (payload) => api.post("/meeting/summarize", payload).then((res) => res.data);
export const learningApi = (payload) => api.post("/learning/generate", payload).then((res) => res.data);
export const learningProductPlanApi = (formData) =>
  api.post("/learning/product-plan/generate", formData, { headers: { "Content-Type": "multipart/form-data" }, timeout: 300000 }).then((res) => res.data);
export const learningIUBlueprintApi = (productId, iuCode) =>
  api.post(`/learning/product-plan/${productId}/iu/${iuCode}/generate`, {}, aiRequestConfig).then((res) => res.data);
export const saveLearningProductPlanApi = (productId, payload) =>
  api.post(`/learning/product-plan/${productId}/save`, payload, aiRequestConfig).then((res) => res.data);
export const learningContentChatApi = (payload) => api.post("/learning/content-chat", payload, aiRequestConfig).then((res) => res.data);
export const getLearningContentHistoryApi = () => api.get("/learning/content-history").then((res) => res.data);
export const clearLearningContentHistoryApi = () => api.delete("/learning/content-history", aiRequestConfig).then((res) => res.data);
export const clearLearningContentRecordApi = (productId) => api.post(`/learning/content-history/${productId}/clear`, {}, aiRequestConfig).then((res) => res.data);
export const saveLearningAssignmentsApi = (assignments) =>
  api.post("/learning/content-assignments/save", { assignments }, aiRequestConfig).then((res) => res.data);
export const notifyLearningAssignmentsApi = (payload) =>
  api.post("/learning/content-assignments/notify", payload, aiRequestConfig).then((res) => res.data);
export const remindLearningAssignmentsApi = (payload) =>
  api.post("/learning/content-assignments/remind", payload, aiRequestConfig).then((res) => res.data);
function withAuthToken(url) {
  const token = getAuthToken();
  if (!token) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}auth_token=${encodeURIComponent(token)}`;
}
export const learningIUDownloadUrl = (productId, iuCode, format = "docx") =>
  withAuthToken(`${api.defaults.baseURL}/learning/product-plan/${productId}/iu/${iuCode}/download?format=${format}`);
export const learningProjectBriefDownloadUrl = (productId, format = "docx") =>
  withAuthToken(`${api.defaults.baseURL}/learning/product-plan/${productId}/project-brief/download?format=${format}`);
export const wellnessApi = (payload) => api.post("/wellness/analyze", payload).then((res) => res.data);
export const wellnessMoodCheckApi = (payload) => api.post("/wellness/mood-check", payload, aiRequestConfig).then((res) => res.data);
export const wellnessChatApi = (payload) => api.post("/wellness/chat", payload, aiRequestConfig).then((res) => res.data);
export const wellnessMoodHistoryApi = () => api.get("/wellness/mood-history").then((res) => res.data);
export const wellnessMusicApi = (payload) => api.post("/wellness/music", payload, aiRequestConfig).then((res) => res.data);
export const wellnessDramaApi = () => api.get("/wellness/kdrama").then((res) => res.data);


export const uploadMeetingApi = (formData) =>
  api.post("/meetings/upload", formData, { headers: { "Content-Type": "multipart/form-data" }, timeout: 300000 }).then((res) => res.data);
export const analyzeMeetingApi = (payload) => api.post("/meetings/analyze", payload, aiRequestConfig).then((res) => res.data);
export const meetingChatApi = (payload) => api.post("/meetings/chat", payload, aiRequestConfig).then((res) => res.data);
export const getMeetingsApi = () => api.get("/meetings").then((res) => res.data);
export const clearMeetingsApi = () => api.delete("/meetings").then((res) => res.data);
export const getMeetingApi = (id) => api.get(`/meetings/${id}`).then((res) => res.data);
export const generateReportApi = (payload) => api.post("/reports/generate", payload, aiRequestConfig).then((res) => res.data);
export const generateEmailsApi = (payload) => api.post("/emails/generate", payload, aiRequestConfig).then((res) => res.data);
export const sendEmailApi = (payload) => api.post("/emails/send", payload, aiRequestConfig).then((res) => res.data);
export const ingestMeetingLinkApi = (payload) => api.post("/meetings/ingest-link", payload, aiRequestConfig).then((res) => res.data);
export const ingestMeetingEmbedApi = (payload) => api.post("/meetings/ingest-embed", payload, aiRequestConfig).then((res) => res.data);
