/**
 * API Client — Production Axios client for the FastAPI backend.
 * Base URL: http://localhost:8000/api/v1
 */
import axios from "axios"
import type { Document } from "../types"

const api = axios.create({
  baseURL: "http://localhost:8000/api/v1",
  headers: { "Content-Type": "application/json" },
})

// ── Interceptors ──────────────────────────────────────────────────────────

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("auth_token")
      window.location.href = "/login"
    }
    return Promise.reject(err)
  }
)

// ── Types ─────────────────────────────────────────────────────────────────

export interface AuditConfig {
  documentIds: string[]
  frameworks: string[]
  options: {
    adversarialDebate: boolean
    confidenceDecay: boolean
    confidenceThreshold: number
    controlDomains: Record<string, boolean>
  }
}

export interface AuditStatusResponse {
  auditId: string
  status: "running" | "complete" | "failed"
  progress: number
  totalControls: number
  completedControls: number
  currentControl: string
  findingsCount: number
}

export interface UserItem {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastActive: string | null
}

export interface HealthService {
  [key: string]: string
}

export interface SystemHealth {
  services: HealthService
  ragLatencyMs: number
  llmTokenUsage: number
  activeAuditJobs: number
}

export interface AuditHistoryItem {
  id: string
  status: string
  config_json: any
  run_by: string
  started_at: string
  completed_at: string | null
  total_controls: number
  completed_controls: number
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════

export const login = async (email: string, password: string) => {
  const res = await api.post("/auth/login", { email, password })
  localStorage.setItem("auth_token", res.data.token)
  return res.data
}

export const logout = () => {
  localStorage.removeItem("auth_token")
  window.location.href = "/login"
}



// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════════

export const getDocuments = async (): Promise<Document[]> => {
  const res = await api.get("/documents")
  return res.data
}

export const uploadDocument = async (file: File): Promise<Document> => {
  const formData = new FormData()
  formData.append("file", file)
  const res = await api.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return res.data
}



// ═══════════════════════════════════════════════════════════════════════════
// AUDITS
// ═══════════════════════════════════════════════════════════════════════════

export const runAudit = async (config: AuditConfig) => {
  const res = await api.post("/audits/run", config)
  return res.data
}

export const getAuditStatus = async (auditId: string): Promise<AuditStatusResponse> => {
  const res = await api.get(`/audits/${auditId}/status`)
  return res.data
}

export const getAudits = async (): Promise<AuditHistoryItem[]> => {
  const res = await api.get("/audits")
  return res.data
}



// ═══════════════════════════════════════════════════════════════════════════
// FINDINGS
// ═══════════════════════════════════════════════════════════════════════════

export const getFindings = async (auditId: string) => {
  const res = await api.get(`/audits/${auditId}/findings`)
  return res.data
}

export const updateFinding = async (
  findingId: string,
  update: { reviewStatus: string; severity?: string; comment?: string }
) => {
  const res = await api.patch(`/findings/${findingId}`, update)
  return res.data
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const downloadReport = async (auditId: string, format: "pdf" | "excel" | "json") => {
  const res = await api.get(`/audits/${auditId}/report?format=${format}`, { responseType: "blob" })
  const url = window.URL.createObjectURL(new Blob([res.data]))
  return { url, filename: `audit-report.${format}` }
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN — USERS
// ═══════════════════════════════════════════════════════════════════════════

export const getUsers = async (): Promise<UserItem[]> => {
  const res = await api.get("/users")
  return res.data
}

export const createUser = async (data: { name: string; email: string; password: string; role: string }): Promise<UserItem> => {
  const res = await api.post("/users", data)
  return res.data
}

export const toggleUserActive = async (userId: string, isActive: boolean): Promise<UserItem> => {
  const res = await api.patch(`/users/${userId}`, { isActive })
  return res.data
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN — SYSTEM HEALTH
// ═══════════════════════════════════════════════════════════════════════════

export const getSystemHealth = async (): Promise<SystemHealth> => {
  const res = await api.get("/system/health")
  return res.data
}

// ═══════════════════════════════════════════════════════════════════════════
// COPILOT
// ═══════════════════════════════════════════════════════════════════════════

export const copilotChat = async (messages: { role: string; content: string }[], context = "") => {
  const res = await api.post("/copilot/chat", { messages, context })
  return res.data.response
}

export default api
