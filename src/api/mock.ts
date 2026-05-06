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

export const mockLogin = async (email: string, _password: string) => {
  await delay(800)
  const role: "admin" | "auditor" | "user" =
  email.includes("admin")
    ? "admin"
    : email.includes("auditor")
    ? "auditor"
    : "user";
  return {
    token: "mock-jwt-" + Date.now(),
    user: { id: "user-1", name: "Madhura Hegde", email, role }
  }
}

export const mockGetDocuments = async () => {
  await delay(600)
  return [
    { id: "doc-1", filename: "vendor_contract_2026.pdf", fileType: "pdf", size: "1.2 MB", uploadedAt: "2026-05-12", maskingStatus: "masked" },
    { id: "doc-2", filename: "security_policy_v4.docx", fileType: "docx", size: "845 KB", uploadedAt: "2026-05-10", maskingStatus: "masked" },
    { id: "doc-3", filename: "soc2_report_2026.pdf", fileType: "pdf", size: "3.1 MB", uploadedAt: "2026-05-08", maskingStatus: "masked" },
    { id: "doc-4", filename: "pentest_results.pdf", fileType: "pdf", size: "2.4 MB", uploadedAt: "2026-05-05", maskingStatus: "processing" },
  ]
}

export const mockUploadDocument = async (filename: string, _fileType: string) => {
  await delay(1500)
  return {
    id: "doc-" + Date.now(),
    filename,
    maskingStatus: "masked",
    uploadedAt: new Date().toISOString().split("T")[0],
  }
}

export const mockRunAudit = async (config: AuditConfig) => {
  await delay(1200)
  return {
    auditId: "audit-" + Date.now(),
    status: "running" as const,
    estimatedDuration: config.frameworks.length * config.documentIds.length * 60,
    estimatedCost: config.frameworks.length * 12,
  }
}

export const mockGetAuditStatus = async (auditId: string): Promise<AuditStatusResponse> => {
  await delay(300)
  return {
    auditId,
    status: "running",
    progress: 67,
    totalControls: 114,
    completedControls: 76,
    currentControl: "Evaluating ISO A.9.2.5 — Review of user access rights...",
    findingsCount: 12,
  }
}

export const mockGetFindings = async (_auditId: string) => {
  await delay(700)
  return []  // findings are defined locally in FindingsReviewPage for now
}

export const mockUpdateFinding = async (findingId: string, update: { reviewStatus: string, comment?: string, severity?: string }) => {
  await delay(400)
  return { findingId, ...update, updatedAt: new Date().toISOString() }
}

export const mockDownloadReport = async (_auditId: string, format: "pdf" | "excel" | "json") => {
  await delay(1500)
  return { url: "/mock-report." + format, filename: "audit-report-2026." + format }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
