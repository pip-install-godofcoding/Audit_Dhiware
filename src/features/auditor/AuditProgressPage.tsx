import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK_CONTROLS = [
  { id: "A.5.1.1", name: "Policies for information security", framework: "ISO", result: "covered" as const, confidence: 0.94, debated: false, duration: 800 },
  { id: "A.6.1.1", name: "Information security roles and responsibilities", framework: "ISO", result: "covered" as const, confidence: 0.89, debated: false, duration: 700 },
  { id: "A.9.1.1", name: "Access control policy", framework: "ISO", result: "covered" as const, confidence: 0.91, debated: false, duration: 650 },
  { id: "A.9.2.5", name: "Review of user access rights", framework: "ISO", result: "gap" as const, confidence: 0.88, debated: true, duration: 2200 },
  { id: "A.9.4.2", name: "Secure log-on procedures", framework: "ISO", result: "partial" as const, confidence: 0.67, debated: true, duration: 2800 },
  { id: "A.10.1.1", name: "Policy on use of cryptographic controls", framework: "ISO", result: "gap" as const, confidence: 0.92, debated: false, duration: 900 },
  { id: "A.12.6.1", name: "Management of technical vulnerabilities", framework: "ISO", result: "stale" as const, confidence: 0.71, debated: false, duration: 1100 },
  { id: "A.14.2.1", name: "Secure development policy", framework: "ISO", result: "covered" as const, confidence: 0.85, debated: false, duration: 750 },
  { id: "A.17.1.1", name: "Planning information security continuity", framework: "ISO", result: "gap" as const, confidence: 0.95, debated: false, duration: 800 },
  { id: "A.18.1.1", name: "Identification of applicable legislation", framework: "ISO", result: "covered" as const, confidence: 0.82, debated: false, duration: 600 },
];

const MOCK_FINDINGS = [
  { id: "GAP-001", controlId: "A.9.2.5", controlName: "Review of user access rights", severity: "high" as const, status: "gap" as const, confidence: 0.88, source: "security_policy.pdf §4.2", remediation: "Conduct and document quarterly access reviews immediately." },
  { id: "GAP-002", controlId: "A.10.1.1", controlName: "Policy on use of cryptographic controls", severity: "high" as const, status: "gap" as const, confidence: 0.92, source: "soc2_report.pdf CC6.1", remediation: "Add encryption at rest attestation to next SOC audit cycle." },
  { id: "GAP-003", controlId: "A.17.1.1", controlName: "Planning information security continuity", severity: "medium" as const, status: "gap" as const, confidence: 0.95, source: "security_policy.pdf §9.1", remediation: "Document RTO/RPO targets and test recovery procedures." },
  { id: "GAP-004", controlId: "A.12.6.1", controlName: "Management of technical vulnerabilities", severity: "low" as const, status: "stale" as const, confidence: 0.71, source: "soc2_report.pdf CC7.2", remediation: "Schedule overdue vulnerability scan and upload attestation." },
];

type ControlType = typeof MOCK_CONTROLS[0];
type FindingType = typeof MOCK_FINDINGS[0];

export default function AuditProgressPage() {
  const navigate = useNavigate();

  // STATE
  const [completedControls, setCompletedControls] = useState<ControlType[]>([]);
  const [visibleFindings, setVisibleFindings] = useState<FindingType[]>([]);
  const [currentControlIndex, setCurrentControlIndex] = useState(0);
  const [currentControlName, setCurrentControlName] = useState("Initialising pipeline...");
  const [isComplete, setIsComplete] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // SIMULATION EFFECT
  useEffect(() => {
    let cumulative = 0;

    MOCK_CONTROLS.forEach((control, i) => {
      cumulative += control.duration;

      const timerId = setTimeout(() => {
        setCompletedControls(prev => [...prev, control]);
        setCurrentControlIndex(i + 1);
        
        setCurrentControlName(
          i + 1 < MOCK_CONTROLS.length 
            ? "Evaluating " + MOCK_CONTROLS[i+1].name + "..." 
            : "Compiling report..."
        );

        if (control.result === "gap" || control.result === "stale") {
          const finding = MOCK_FINDINGS.find(f => f.controlId === control.id);
          if (finding) {
            setVisibleFindings(prev => [...prev, finding]);
          }
        }
      }, cumulative);

      timeoutRefs.current.push(timerId);
    });

    const finalTimerId = setTimeout(() => {
      setIsComplete(true);
      setCurrentControlName("Audit complete.");
    }, cumulative + 500);

    timeoutRefs.current.push(finalTimerId);

    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, []);

  // DERIVED
  const progress = Math.round((completedControls.length / MOCK_CONTROLS.length) * 100);
  const highCount = visibleFindings.filter(f => f.severity === "high").length;
  const mediumCount = visibleFindings.filter(f => f.severity === "medium").length;
  const lowCount = visibleFindings.filter(f => f.severity === "low").length;
  const totalControlsCount = MOCK_CONTROLS.length;
  const debatedCount = completedControls.filter(c => c.debated).length;

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* HEADER SECTION */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Audit in Progress</h1>
          {isComplete ? (
            <span className="bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
              Complete ✓
            </span>
          ) : (
            <div className="flex items-center">
              <span className="animate-pulse w-2 h-2 rounded-full bg-indigo-500 inline-block mr-2"></span>
              <span className="text-sm text-indigo-600 font-medium">Running</span>
            </div>
          )}
        </div>

        {/* PROGRESS BAR */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mt-4">
          <div 
            className={`h-full rounded-full transition-all duration-500 ease-out ${isComplete ? 'bg-green-500' : 'bg-indigo-600'}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* STATS ROW */}
        <div className="mt-3 flex gap-6 text-sm text-gray-500">
          <span>{progress}% complete</span>
          <span>{completedControls.length} / {totalControlsCount} controls</span>
          <span>⚔ {debatedCount} debated</span>
        </div>

        {/* CURRENT CONTROL */}
        <div className="mt-2 text-sm text-gray-500 italic">
          {currentControlName}
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

            {visibleFindings.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
                No findings yet. Clean controls will appear in the activity log.
              </div>
            ) : (
              visibleFindings.map(finding => (
                <div key={finding.id} className="bg-white rounded-xl border border-gray-200 p-4 mb-3 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-start">
                    {finding.severity === "high" && <span className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-2 py-0.5 rounded-md">HIGH</span>}
                    {finding.severity === "medium" && <span className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-md">MEDIUM</span>}
                    {finding.severity === "low" && <span className="bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-2 py-0.5 rounded-md">LOW</span>}
                    {finding.status === "stale" && finding.severity !== "low" && finding.severity !== "medium" && finding.severity !== "high" && <span className="bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-md uppercase">{finding.status}</span>}
                    
                    <span className="text-xs text-gray-400">Confidence: {Math.round(finding.confidence * 100)}%</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mt-1">
                    {finding.id} — {finding.controlName}
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

          {/* RIGHT COLUMN: Controls */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Controls Evaluated</h2>
            <div className="grid grid-cols-2 gap-2">
              {completedControls.map(control => {
                let chipClasses = "rounded-lg px-3 py-2 text-xs border ";
                if (control.result === "covered") chipClasses += "bg-green-50 border-green-200 text-green-700";
                else if (control.result === "gap") chipClasses += "bg-red-50 border-red-200 text-red-700";
                else if (control.result === "partial") chipClasses += "bg-amber-50 border-amber-200 text-amber-700";
                else if (control.result === "stale") chipClasses += "bg-purple-50 border-purple-200 text-purple-700";

                return (
                  <div key={control.id} className={`${chipClasses} animate-in fade-in zoom-in-95 duration-200`}>
                    <div className="font-bold">{control.id}</div>
                    <div className="flex justify-between items-end mt-1">
                      <span className="capitalize">{control.result}{control.debated ? " ⚔" : ""}</span>
                      <span className="text-[10px] opacity-70">{Math.round(control.confidence * 100)}%</span>
                    </div>
                  </div>
                )
              })}
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
            {isComplete && (
              <button 
                onClick={() => navigate("/auditor/findings")}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl animate-in zoom-in-95 duration-200">
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
