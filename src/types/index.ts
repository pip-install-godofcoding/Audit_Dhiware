export type FileType = "pdf" | "docx" | "txt"
export type MaskingStatus = "masked" | "processing" | "failed" | "pending"
export type FindingStatus = "gap" | "partial" | "covered" | "stale"
export type Severity = "high" | "medium" | "low"
export type ReviewStatus = "pending" | "accepted" | "rejected" | "modified"
export type UserRole = "user" | "auditor" | "admin"

export interface Document {
  id: string
  filename: string
  fileType: FileType
  size: string
  uploadedAt: string
  maskingStatus: MaskingStatus
}

export interface Framework {
  id: string
  name: string
  shortName: string
  controlCount: number
  description: string
}

export interface AuditOptions {
  adversarialDebate: boolean
  confidenceDecay: boolean
  confidenceThreshold: number
  controlDomains: Record<string, boolean>
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}
