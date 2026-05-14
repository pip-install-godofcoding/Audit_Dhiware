import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize2, MessageSquare } from 'lucide-react';

/**
 * Full-page chat workspace — an alternative to the floating panel.
 * Provides more screen real estate for reviewing findings and reports inline.
 * The actual chat logic lives in AuditorChatbot; this page embeds it full-screen.
 */
export default function ChatWorkspacePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-[calc(100vh-160px)]">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Copilot Workspace
            </h1>
            <p className="text-sm text-gray-400">Full-screen AI assistant — everything in one place</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/auditor/setup')}
            className="text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Audit Setup
          </button>
          <button
            onClick={() => navigate('/auditor/findings')}
            className="text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Findings Review
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 flex items-center justify-center bg-gray-50/50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Maximize2 className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Use the Copilot Panel</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Click the <strong>✨ sparkle button</strong> in the bottom-right corner to open the Copilot.
            It works on every page — you can upload documents, run audits, review findings, 
            and generate reports, all through natural conversation.
          </p>
          <p className="text-gray-400 text-xs mt-4">
            The copilot connects via WebSocket for real-time streaming responses.
          </p>
        </div>
      </div>
    </div>
  );
}
