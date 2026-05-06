# Compliance Intelligence Platform

A real-time, event-sourced cybersecurity auditing platform leveraging adversarial LLM architecture to automate compliance posture evaluation. This repository contains the frontend React application.

## 🎨 Aesthetic & Styling Guidelines

The platform uses a sophisticated, highly polished **"Claude-inspired" aesthetic**. When building new components, please adhere to these styling principles:

*   **Color Palette**:
    *   **Backgrounds**: We use a warm, Anthropic-style grey (`#EFECE6` or `bg-[#EFECE6]`) for the application canvas, contrasting with crisp white (`bg-white`) for content cards.
    *   **Accents**: Tailwind's default cool grays have been globally mapped to warm `stone` grays. Vibrant blues/indigos have been mapped to a warm terracotta/amber palette (`bg-indigo-600` now renders as a soft terracotta).
    *   **Text**: Dark charcoal (`#2D2B2A`) is used instead of pure black for softer readability.
*   **Typography**:
    *   **Headings**: `Playfair Display` (Serif) is globally applied to all `h1`, `h2`, and `h3` tags for an elegant, editorial feel.
    *   **Body**: `Inter` (Sans-serif) is used for all UI elements, dense data tables, and body copy.
*   **Tech Stack**: React 18 + TypeScript (strict) + Tailwind CSS v3 + React Router v6. No external component libraries (like Radix or MUI) or animation libraries are used to keep the bundle lightweight. Icons are exclusively sourced from `lucide-react`.

---

## ✅ Implemented Features (Auditor Persona)

The Auditor workflow is **100% complete** and can be tested locally.

1.  **Audit Setup (`/auditor/setup`)**: A robust interface leveraging custom accordions. Auditors can select indexed documents, choose compliance frameworks (ISO, SOC2, NIST), and tune AI engine parameters (Adversarial Debate, Confidence Decay).
2.  **Audit Progress (`/auditor/progress`)**: A real-time simulation engine that tracks evaluation progress. Features a procedurally generated terminal log tracking RAG retrieval and adversarial triggers.
3.  **Findings Review (`/auditor/findings`)**: An email-client style split-pane interface. Features an interactive findings list, evidence viewers, and LLM-debate transcripts (Prosecutor vs. Defender). Includes workflows to Accept, Reject, or Modify findings via an animated drawer.
4.  **Report Viewer (`/auditor/report`)**: The final audit summary dashboard. Features animated domain coverage bars, interactive sorting tables, and export toolbars.
5.  **Auditor Copilot (Global Chatbot)**: A persistent, Claude-styled floating AI assistant accessible across all auditor routes. It features typing indicators, suggestion chips, and context-aware mock responses.

---

## 🚧 Pending UI (User & Admin Personas)

The following routes are currently configured in `src/App.tsx` but point to a placeholder component. **These need to be built next:**

### User Features
*   `/login` — Authentication entry point.
*   `/user/upload` — Dashboard for users to securely upload evidence documents.
*   `/user/documents` — Management and status tracking of uploaded evidence (e.g., tracking PII masking status).

### Admin Features
*   `/admin/users` — Role-based access control management.
*   `/admin/settings` — Global system configurations, LLM prompt management, and API key configurations.

---

## 🔌 API Contracts & Backend Integration

The frontend currently relies on an artificial latency API layer defined in `src/api/mock.ts`. Backend engineers should review this file and mirror the exported TypeScript interfaces when wiring up the live API.

**Key Contracts to Implement:**
*   `mockLogin`: Validates credentials and returns JWT + User Role (`user`, `auditor`, `admin`).
*   `mockGetDocuments`: Returns the corpus of uploaded evidence and their current PII masking status.
*   `mockRunAudit(config: AuditConfig)`: Initiates the async audit pipeline and returns a tracking ID.
*   `mockGetAuditStatus(auditId)`: Polled by the frontend to drive the Progress screen and terminal feed.
*   `mockUpdateFinding`: Receives auditor overrides (Accept, Reject, Modify) to retrain the model/update the DB.

Shared frontend types (e.g., `Severity`, `FindingStatus`, `Document`) are strictly defined in `src/types/index.ts`. All new API payloads must conform to these types.
