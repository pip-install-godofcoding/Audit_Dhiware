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

## 🚀 How to Run the Platform Locally

The platform is a fully containerized, microservices architecture that runs locally using Docker Compose.

### Prerequisites
*   Docker & Docker Compose installed
*   At least 16GB of system RAM (to run the local Llama 3.1 LLM)
*   Node.js v18+ (for frontend development)

### 1. Start the Backend Infrastructure
The backend consists of PostgreSQL (with pgvector), Redis, MinIO, OPA, FastAPI backend, Celery workers, and a local Ollama server running `llama3.1` (8B) and `all-MiniLM-L6-v2` embeddings.

```bash
# Clone the repository and navigate to the project root
git clone <your-repo-url>
cd <repo-folder>

# Spin up the entire infrastructure (this will pull the models and build the images)
docker compose up -d --build
```
*Note: The first time you run this, it will take several minutes to download the Llama 3.1 model (~4.7GB) into the Ollama container.*

### 2. Start the Frontend Application
While the backend handles the AI, vector storage, and APIs, the frontend is a Vite + React application.

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

The application will be available at `http://localhost:5174/`.

### 3. Default Credentials
To log in as the Auditor and test the system, use the seeded admin credentials:
*   **Email:** `admin@dhiware.com`
*   **Password:** `admin123`

---

## 🧠 AI Architecture (Fully Local)

This platform does **not** rely on external Cloud APIs (like OpenAI) to ensure complete data privacy and compliance.

*   **Embedding Engine**: `all-MiniLM-L6-v2` (384-dim) baked directly into the ingestion service to securely vectorize your compliance documents.
*   **Auditor Engine**: `Llama-3.1-8B` running via Ollama. It acts as the strict compliance auditor, evaluating RAG context against NIST/ISO frameworks.
*   **Adversarial Tribunal**: A multi-agent debate (Prosecutor vs. Defender vs. Judge) that triggers when compliance gaps are found to eliminate false positives and generate actionable remediation steps.

## 📁 Test Documents
We have included three sample documents in the `/test_docs` folder to test the AI's capabilities:
1.  `perfect_access_control_policy.txt`: Should pass all controls.
2.  `terrible_password_policy.txt`: Should trigger High severity gaps.
3.  `stale_backup_policy.txt`: Should trigger Stale/Partial findings.
