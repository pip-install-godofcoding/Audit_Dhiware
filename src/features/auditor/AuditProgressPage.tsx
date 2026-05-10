import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAuditStatus, getFindings } from '../../api/client';

interface Finding {
  id: string;
  controlId: string;
  controlName: string;
  severity: "high" | "medium" | "low";
  status: string;
  confidence: number;
  source: string;
  remediation: string;
}

export default function AuditProgressPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auditId = searchParams.get("id") || "";

  // STATE
  const [progress, setProgress] = useState(0);
  const [totalControls, setTotalControls] = useState(0);
  const [completedControls, setCompletedControls] = useState(0);
  const [currentControl, setCurrentControl] = useState("Initialising pipeline...");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [status, setStatus] = useState("running");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [error, setError] = useState("");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll real backend for audit status
  useEffect(() => {
    if (!auditId) {
      setError("No audit ID provided");
      return;
    }

    const pollStatus = async () => {
      try {
        const statusData = await getAuditStatus(auditId);
        setProgress(statusData.progress || 0);
        setTotalControls(statusData.totalControls || 0);
        setCompletedControls(statusData.completedControls || 0);
        setCurrentControl(statusData.currentControl || "Evaluating...");
        setStatus(statusData.status);

        if (statusData.status === "complete" || statusData.status === "failed") {
          setIsComplete(true);
          if (intervalRef.current) clearInterval(intervalRef.current);

          // Fetch findings from database
          try {
            const findingsData = await getFindings(auditId);
            setFindings(findingsData.map((f: any) => ({
              id: f.id,
              controlId: f.controlId || f.control_id,
              controlName: f.controlName || f.control_name,
              severity: f.aiSeverity || f.ai_severity || "medium",
              status: f.aiStatus || f.ai_status || "gap",
              confidence: f.confidence || 0,
              source: f.source || "—",
              remediation: f.remediation || "—",
            })));
          } catch {
            // Findings may not be ready yet
          }
        }
      } catch (err: any) {
        // Audit may not have started yet, keep polling
      }
    };

    pollStatus();
    intervalRef.current = setInterval(pollStatus, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [auditId]);

  const highCount = findings.filter(f => f.severity === "high").length;
  const mediumCount = findings.filter(f => f.severity === "medium").length;
  const lowCount = findings.filter(f => f.severity === "low").length;

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* HEADER SECTION */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Audit in Progress</h1>
          {isComplete ? (
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${
              status === "complete" 
                ? "bg-green-100 text-green-700" 
                : "bg-red-100 text-red-700"
            }`}>
              {status === "complete" ? "Complete ✓" : "Failed ✗"}
            </span>
          ) : (
            <div className="flex items-center">
              <span className="animate-pulse w-2 h-2 rounded-full bg-indigo-500 inline-block mr-2"></span>
              <span className="text-sm text-indigo-600 font-medium">Running</span>
            </div>
          )}
        </div>

        {/* ERROR */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* PROGRESS BAR */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mt-4">
          <div 
            className={`h-full rounded-full transition-all duration-500 ease-out ${isComplete && status === "complete" ? 'bg-green-500' : isComplete ? 'bg-red-500' : 'bg-indigo-600'}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* STATS ROW */}
        <div className="mt-3 flex gap-6 text-sm text-gray-500">
          <span>{progress}% complete</span>
          <span>{completedControls} / {totalControls} controls</span>
          <span>Audit ID: {auditId.split("-")[0]}…</span>
        </div>

        {/* CURRENT CONTROL */}
        <div className="mt-2 text-sm text-gray-500 italic">
          {currentControl}
        </div>

        {/* MAIN GRID */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* LEFT COLUMN: Findings */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-gray-900">Findings Detected</h2>
              <div className="flex gap-2">
                <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">{highCount} High</span>
                <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">{mediumCount} Medium</span>
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">{lowCount} Low</span>
              </div>
            </div>

            {findings.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
                {isComplete ? "No findings detected — all controls passed." : "Waiting for findings... Controls are being evaluated."}
              </div>
            ) : (
              findings.map(finding => (
                <div key={finding.id} className="bg-white rounded-xl border border-gray-200 p-4 mb-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    {finding.severity === "high" && <span className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-2 py-0.5 rounded-md">HIGH</span>}
                    {finding.severity === "medium" && <span className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-md">MEDIUM</span>}
                    {finding.severity === "low" && <span className="bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-2 py-0.5 rounded-md">LOW</span>}
                    <span className="text-xs text-gray-400">Confidence: {Math.round(finding.confidence * 100)}%</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mt-1">
                    {finding.controlId} — {finding.controlName}
                  </h3>
                  <div className="text-xs text-gray-400 mt-1">
                    Source: {finding.source}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 italic truncate">
                    {finding.remediation}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* RIGHT COLUMN: Summary */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Audit Summary</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Controls</span>
                <span className="font-medium">{totalControls}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Completed</span>
                <span className="font-medium">{completedControls}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Findings</span>
                <span className="font-medium">{findings.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className={`font-medium capitalize ${status === 'complete' ? 'text-green-600' : status === 'failed' ? 'text-red-600' : 'text-indigo-600'}`}>
                  {status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-6">
          <div>
            {!isComplete && (
              <button 
                onClick={() => setShowCancelModal(true)}
                className="text-sm text-gray-500 hover:text-red-600 underline cursor-pointer focus:outline-none"
              >
                Cancel audit
              </button>
            )}
          </div>
          <div>
            {isComplete && status === "complete" && (
              <button 
                onClick={() => navigate(`/auditor/findings?auditId=${auditId}`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
              >
                View Full Report
              </button>
            )}
          </div>
        </div>

      </div>

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Cancel audit?</h3>
            <p className="text-sm text-gray-500 mt-2">
              The audit will stop immediately. Progress will be lost and you will need to configure a new audit.
            </p>
            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => setShowCancelModal(false)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Keep running
              </button>
              <button 
                onClick={() => navigate("/auditor/setup")}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Cancel audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
