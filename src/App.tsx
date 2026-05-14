import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from "./features/auth/LoginPage";
import UploadPage from "./features/user/UploadPage";
import DocumentsPage from "./features/user/DocumentsPage";
import DocumentDetailPage from "./features/user/DocumentDetailPage";
import AdminUsersPage from "./features/admin/AdminUsersPage";
import AdminSettingsPage from "./features/admin/AdminSettingsPage";
import AdminAuditHistoryPage from "./features/admin/AdminAuditHistoryPage";
import AdminSystemHealthPage from "./features/admin/AdminSystemHealthPage";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import AuditSetupPage from "./features/auditor/AuditSetupPage";
import AuditProgressPage from "./features/auditor/AuditProgressPage";
import FindingsReviewPage from "./features/auditor/FindingsReviewPage";
import ReportViewerPage from "./features/auditor/ReportViewerPage";
import ChatWorkspacePage from "./features/auditor/ChatWorkspacePage";
import AuditorChatbot from "./features/auditor/components/AuditorChatbot";

const Placeholder = ({ title }: { title: string }) => (
  <div className="min-h-screen bg-transparent flex items-center justify-center">
    <div className="text-center">
      <p className="text-2xl font-bold text-gray-300">{title}</p>
      <p className="text-sm text-gray-400 mt-2">Coming soon — Person 1 owns this screen.</p>
    </div>
  </div>
);

export default function App() {
  return (
    <Router>
      <Routes>

  {/* ROOT */}
  <Route
    path="/"
    element={<Navigate to="/login" replace />}
  />

  {/* PUBLIC */}
  <Route
    path="/login"
    element={<LoginPage />}
  />

  {/* USER ROUTES */}
  <Route
    element={<ProtectedRoute allowedRoles={["user"]} />}
  >
    <Route path="/user/upload" element={<UploadPage />} />
    <Route path="/user/documents" element={<DocumentsPage />} />
    <Route
      path="/user/documents/:id"
      element={<DocumentDetailPage />}
    />
  </Route>

  {/* ADMIN ROUTES */}
  <Route
    element={<ProtectedRoute allowedRoles={["admin"]} />}
  >
    <Route path="/admin/users" element={<AdminUsersPage />} />
    <Route path="/admin/settings" element={<AdminSettingsPage />} />
    <Route path="/admin/history" element={<AdminAuditHistoryPage />} />
    <Route
      path="/admin/system-health"
      element={<AdminSystemHealthPage />}
    />
  </Route>

  {/* AUDITOR ROUTES */}
  <Route
    element={<ProtectedRoute allowedRoles={["auditor"]} />}
  >
    <Route path="/auditor/setup" element={<AuditSetupPage />} />
    <Route path="/auditor/progress" element={<AuditProgressPage />} />
    <Route path="/auditor/findings" element={<FindingsReviewPage />} />
    <Route path="/auditor/report" element={<ReportViewerPage />} />
    <Route path="/auditor/chat" element={<ChatWorkspacePage />} />
  </Route>

  {/* FALLBACK */}
  <Route
    path="*"
    element={<Navigate to="/login" replace />}
  />

</Routes>
      <AuditorChatbot />
    </Router>
  );
}
