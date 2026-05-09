/**
 * API Client — replaces mock.ts with real Axios calls to the FastAPI backend.
 * Base URL: http://localhost:8000/api/v1
 *
 * All functions match the exact interface the frontend components already use.
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

// ── Types (matching mock.ts exports) ──────────────────────────────────────

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

// Aliases matching mock.ts naming convention
export const mockLogin = login

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

// Aliases matching mock.ts naming
export const mockGetDocuments = getDocuments
export const mockUploadDocument = async (filename: string, _fileType: string) => {
  // Legacy mock signature adapter — real uploads use the File-based uploadDocument
  return {
    id: "doc-" + Date.now(),
    filename,
    maskingStatus: "processing",
    uploadedAt: new Date().toISOString().split("T")[0],
  }
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

// Aliases matching mock.ts naming
export const mockRunAudit = runAudit
export const mockGetAuditStatus = getAuditStatus

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

// Aliases matching mock.ts naming
export const mockGetFindings = getFindings
export const mockUpdateFinding = async (
  findingId: string,
  update: { reviewStatus: string; comment?: string; severity?: string }
) => {
  return updateFinding(findingId, update)
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS (placeholder — backend endpoint not yet implemented)
// ═══════════════════════════════════════════════════════════════════════════

export const mockDownloadReport = async (_auditId: string, format: "pdf" | "excel" | "json") => {
  return { url: `/api/v1/reports/download?format=${format}`, filename: `audit-report-2026.${format}` }
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════

export const getUsers = async () => {
  const res = await api.get("/users")
  return res.data
}

export const createUser = async (data: { name: string; email: string; password: string; role: string }) => {
  const res = await api.post("/users", data)
  return res.data
}

export const getSystemHealth = async () => {
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
