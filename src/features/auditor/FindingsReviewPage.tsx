import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, FileText, Lightbulb, X, Loader2 } from 'lucide-react';
import { getFindings, updateFinding } from '../../api/client';

// TYPES
type FindingStatus = "gap" | "partial" | "covered" | "stale";
type Severity = "high" | "medium" | "low";
type ReviewStatus = "pending" | "accepted" | "rejected" | "modified";

interface EvidenceChunk {
  id: string;
  sourceDoc: string;
  section: string;
  page: number;
  text: string;
}

interface JudgeVerdict {
  confidence: number;
  verdict: FindingStatus;
  decisiveEvidence: string;
}

interface Finding {
  id: string;
  controlId: string;
  controlName: string;
  severity: Severity;
  status: FindingStatus;
  reviewStatus: ReviewStatus;
  confidence: number;
  frameworks: string[];
  evidenceChunks: EvidenceChunk[];
  prosecutorArgs: string[];
  defenderArgs: string[];
  judgeVerdict: JudgeVerdict | null;
  remediation: string;
  auditorComment?: string;
}

export default function FindingsReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auditId = searchParams.get("auditId") || "";

  // STATE
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [filterSeverity, setFilterSeverity] = useState<"all" | Severity>("all");
  const [filterReview, setFilterReview] = useState<"all" | ReviewStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDebate, setShowDebate] = useState(false);
  const [showModifyDrawer, setShowModifyDrawer] = useState(false);

  // Fetch findings from backend
  useEffect(() => {
    const fetchData = async () => {
      if (!auditId) {
        setError("No audit ID specified. Navigate here from the audit progress page.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await getFindings(auditId);
        const mapped: Finding[] = data.map((f: any) => ({
          id: f.id,
          controlId: f.controlId || f.control_id || "—",
          controlName: f.controlName || f.control_name || "—",
          severity: (f.aiSeverity || f.ai_severity || "medium") as Severity,
          status: (f.aiStatus || f.ai_status || "gap") as FindingStatus,
          reviewStatus: (f.reviewStatus || f.review_status || "pending") as ReviewStatus,
          confidence: f.confidence || 0,
          frameworks: f.frameworks || [],
          evidenceChunks: f.evidenceChunks || f.evidence_chunks || [],
          prosecutorArgs: f.prosecutorArgs || f.prosecutor_args || [],
          defenderArgs: f.defenderArgs || f.defender_args || [],
          judgeVerdict: f.judgeVerdict || f.judge_verdict || null,
          remediation: f.remediation || "—",
          auditorComment: f.auditorComment || f.auditor_comment || "",
        }));
        setFindings(mapped);
        if (mapped.length > 0) setSelectedId(mapped[0].id);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load findings");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [auditId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mr-3" />
        <span className="text-gray-500">Loading findings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 max-w-md text-center">
          {error}
        </div>
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No findings detected</p>
          <p className="text-sm mt-2">All controls passed for this audit.</p>
        </div>
      </div>
    );
  }

  const selectedFinding = findings.find(f => f.id === selectedId) || findings[0];

  const [modifyDraft, setModifyDraft] = useState<{ severity: Severity; comment: string }>({
    severity: selectedFinding.severity,
    comment: selectedFinding.auditorComment || ""
  });

  // DERIVED
  const filteredFindings = useMemo(() => {
    return findings.filter(f => {
      if (filterSeverity !== "all" && f.severity !== filterSeverity) return false;
      if (filterReview === "pending" && f.reviewStatus !== "pending") return false;
      if (filterReview === "reviewed" && f.reviewStatus === "pending") return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return f.controlName.toLowerCase().includes(query) || f.controlId.toLowerCase().includes(query);
      }
      return true;
    });
  }, [findings, filterSeverity, filterReview, searchQuery]);

  const reviewedCount = findings.filter(f => f.reviewStatus !== "pending").length;

  const groupedFindings = useMemo(() => {
    return {
      high: filteredFindings.filter(f => f.severity === "high"),
      medium: filteredFindings.filter(f => f.severity === "medium"),
      low: filteredFindings.filter(f => f.severity === "low"),
    };
  }, [filteredFindings]);

  // HANDLERS
  const autoSelectNext = (currentFindings: Finding[], currentSelectedId: string) => {
    const currentIndex = currentFindings.findIndex(f => f.id === currentSelectedId);
    if (currentIndex === -1) return;
    
    // Find next pending
    for (let i = 1; i < currentFindings.length; i++) {
      const idx = (currentIndex + i) % currentFindings.length;
      if (currentFindings[idx].reviewStatus === "pending") {
        setSelectedId(currentFindings[idx].id);
        setShowDebate(false);
        return;
      }
    }
  };

  const handleAccept = (id: string) => {
    setFindings(prev => {
      const next = prev.map(f => f.id === id ? { ...f, reviewStatus: "accepted" as const } : f);
      autoSelectNext(next, id);
      return next;
    });
  };

  const handleReject = (id: string) => {
    setFindings(prev => {
      const next = prev.map(f => f.id === id ? { ...f, reviewStatus: "rejected" as const } : f);
      autoSelectNext(next, id);
      return next;
    });
  };

  const handleUndo = (id: string) => {
    setFindings(prev => prev.map(f => f.id === id ? { ...f, reviewStatus: "pending" as const, auditorComment: undefined } : f));
  };

  const handleModifyOpen = () => {
    setModifyDraft({ severity: selectedFinding.severity, comment: selectedFinding.auditorComment || "" });
    setShowModifyDrawer(true);
  };

  const handleModifySave = () => {
    setFindings(prev => {
      const next = prev.map(f => f.id === selectedId ? { 
        ...f, 
        reviewStatus: "modified" as const, 
        severity: modifyDraft.severity,
        auditorComment: modifyDraft.comment
      } : f);
      autoSelectNext(next, selectedId);
      return next;
    });
    setShowModifyDrawer(false);
  };

  // RENDER HELPERS
  const getSeverityBadge = (severity: Severity, type: 'pill' | 'large' = 'pill') => {
    if (type === 'pill') {
      if (severity === 'high') return <span className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-2 py-0.5 rounded-md uppercase">High</span>;
      if (severity === 'medium') return <span className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-md uppercase">Medium</span>;
      return <span className="bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-2 py-0.5 rounded-md uppercase">Low</span>;
    } else {
      if (severity === 'high') return <span className="bg-red-50 border border-red-200 text-red-700 px-3 py-1 rounded-lg text-sm font-bold uppercase">High Severity</span>;
      if (severity === 'medium') return <span className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-lg text-sm font-bold uppercase">Medium Severity</span>;
      return <span className="bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-lg text-sm font-bold uppercase">Low Severity</span>;
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col overflow-hidden h-screen">
      
      {/* TOP BAR */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Findings Review</h1>
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-500 font-medium">{reviewedCount} / {findings.length} reviewed</span>
          <div className="w-48 h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
            <div 
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${(reviewedCount / findings.length) * 100}%` }}
            ></div>
          </div>
        </div>
        <button 
          onClick={() => navigate("/auditor/report")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          View Report →
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex h-[calc(100vh-73px)] w-full">
        
        {/* LEFT PANEL */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col h-full z-10">
          
          {/* FILTER BAR */}
          <div className="p-4 border-b border-gray-100 shrink-0">
            <input 
              type="text" 
              placeholder="Search controls..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

            <div className="mt-3 flex gap-1 flex-wrap">
              <span className="text-xs text-gray-500 font-medium w-full mb-1">Severity:</span>
              {(['all', 'high', 'medium', 'low'] as const).map(sev => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`text-xs px-2 py-1 rounded-full cursor-pointer capitalize ${filterSeverity === sev ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {sev}
                </button>
              ))}
            </div>

            <div className="mt-3 flex gap-1 flex-wrap">
              <span className="text-xs text-gray-500 font-medium w-full mb-1">Status:</span>
              <button onClick={() => setFilterReview('all')} className={`text-xs px-2 py-1 rounded-full cursor-pointer ${filterReview === 'all' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>All</button>
              <button onClick={() => setFilterReview('pending')} className={`text-xs px-2 py-1 rounded-full cursor-pointer ${filterReview === 'pending' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Pending</button>
              <button onClick={() => setFilterReview('reviewed')} className={`text-xs px-2 py-1 rounded-full cursor-pointer ${filterReview === 'reviewed' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Reviewed</button>
            </div>
          </div>

          {/* FINDINGS LIST */}
          <div className="flex-1 overflow-y-auto">
            {(['high', 'medium', 'low'] as const).map(severity => {
              const group = groupedFindings[severity];
              if (group.length === 0) return null;
              
              let headerColor = "text-green-600";
              if (severity === "high") headerColor = "text-red-600";
              if (severity === "medium") headerColor = "text-amber-600";

              return (
                <div key={severity}>
                  <div className={`sticky top-0 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide border-y border-gray-100 z-10 ${headerColor}`}>
                    {severity} Severity
                  </div>
                  {group.map(f => (
                    <div 
                      key={f.id}
                      onClick={() => { setSelectedId(f.id); setShowDebate(false); }}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${selectedId === f.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500 pl-3' : 'border-l-4 border-l-transparent'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400">{f.id}</span>
                        {f.reviewStatus === 'accepted' && <span className="bg-green-100 text-green-700 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase">✓ Accepted</span>}
                        {f.reviewStatus === 'rejected' && <span className="bg-red-100 text-red-600 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase">✗ Rejected</span>}
                        {f.reviewStatus === 'modified' && <span className="bg-purple-100 text-purple-700 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase">~ Modified</span>}
                      </div>
                      
                      <div className="text-sm font-medium text-gray-900 mt-0.5 line-clamp-1">
                        {f.controlName}
                      </div>
                      
                      <div className="flex items-center mt-1">
                        <span className={`w-2 h-2 rounded-full mr-1.5 ${f.severity === 'high' ? 'bg-red-500' : f.severity === 'medium' ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                        <span className={`text-xs capitalize ${f.severity === 'high' ? 'text-red-600' : f.severity === 'medium' ? 'text-amber-600' : 'text-green-600'}`}>{f.severity}</span>
                        <span className="text-xs text-gray-400 ml-auto">{Math.round(f.confidence * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            
            {filteredFindings.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400">
                No findings match your filters.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 overflow-y-auto bg-white flex flex-col relative h-full">
          
          <div className="flex-1 overflow-y-auto pb-24">
            {/* FINDING HEADER */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400">{selectedFinding.id}</span>
                {getSeverityBadge(selectedFinding.severity, 'large')}
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mt-2">
                {selectedFinding.controlName}
              </h2>
              
              <div className="mt-3 flex items-center gap-4">
                {selectedFinding.status === "gap" && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">✗ Gap</span>}
                {selectedFinding.status === "partial" && <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-semibold">~ Partial</span>}
                {selectedFinding.status === "covered" && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">✓ Covered</span>}
                {selectedFinding.status === "stale" && <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">⏱ Stale</span>}
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Confidence</span>
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${selectedFinding.confidence > 0.8 ? 'bg-green-500' : selectedFinding.confidence > 0.6 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${selectedFinding.confidence * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{Math.round(selectedFinding.confidence * 100)}%</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedFinding.frameworks.map(fw => (
                  <span key={fw} className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-md font-mono">
                    {fw}
                  </span>
                ))}
              </div>
            </div>

            {/* FINDING BODY */}
            <div className="px-6 py-5 space-y-6 max-w-4xl">
              
              {/* EVIDENCE */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  Evidence Retrieved <span className="text-gray-400 font-normal">({selectedFinding.evidenceChunks.length} chunks)</span>
                </h3>
                {selectedFinding.evidenceChunks.map(chunk => (
                  <div key={chunk.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-600">{chunk.sourceDoc}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-400">{chunk.section}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-400">Page {chunk.page}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700 leading-relaxed italic border-l-2 border-indigo-300 pl-3">
                      "{chunk.text}"
                    </p>
                  </div>
                ))}
              </div>

              {/* ADVERSARIAL DEBATE */}
              {selectedFinding.judgeVerdict && (
                <div>
                  <div 
                    onClick={() => setShowDebate(!showDebate)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer border border-gray-100 transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      ⚔ Adversarial Debate
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-medium">3 LLM calls</span>
                      {showDebate ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {showDebate && (
                    <div className="mt-2 space-y-3 animate-in slide-in-from-top-2 duration-200">
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-center mb-2">
                          <span className="text-xs font-bold text-red-600 uppercase tracking-wide">PROSECUTOR</span>
                          <span className="text-xs text-red-400 ml-2 font-medium">Argues gap</span>
                        </div>
                        {selectedFinding.prosecutorArgs.map((pt, i) => (
                          <div key={i} className="text-sm text-red-800 flex gap-2 mb-1.5">
                            <span className="opacity-50">—</span> <span>{pt}</span>
                          </div>
                        ))}
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center mb-2">
                          <span className="text-xs font-bold text-green-600 uppercase tracking-wide">DEFENDER</span>
                          <span className="text-xs text-green-500 ml-2 font-medium">Argues covered</span>
                        </div>
                        {selectedFinding.defenderArgs.length > 0 ? (
                          selectedFinding.defenderArgs.map((pt, i) => (
                            <div key={i} className="text-sm text-green-800 flex gap-2 mb-1.5">
                              <span className="opacity-50">—</span> <span>{pt}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-green-600 italic">No counter-arguments found.</div>
                        )}
                      </div>

                      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                        <div className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2">JUDGE VERDICT</div>
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold uppercase">{selectedFinding.judgeVerdict.verdict}</span>
                          <span className="text-xs text-indigo-400 font-medium">Confidence: {Math.round(selectedFinding.judgeVerdict.confidence * 100)}%</span>
                        </div>
                        <p className="text-sm text-indigo-800 mt-2 font-medium">
                          {selectedFinding.judgeVerdict.decisiveEvidence}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* REMEDIATION */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-amber-800 uppercase tracking-wide">Remediation</span>
                </div>
                <p className="text-sm text-amber-700 leading-relaxed mt-2 font-medium">
                  {selectedFinding.remediation}
                </p>
              </div>

              {/* AUDITOR NOTE */}
              {selectedFinding.reviewStatus === "modified" && selectedFinding.auditorComment && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 shadow-sm">
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-wide">Auditor Note:</span>
                  <p className="text-sm text-purple-700 mt-1 font-medium">{selectedFinding.auditorComment}</p>
                </div>
              )}

            </div>
          </div>

          {/* ACTION BUTTONS (Sticky Bottom) */}
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
            {selectedFinding.reviewStatus === "pending" ? (
              <div className="flex gap-3 max-w-4xl">
                <button 
                  onClick={() => handleAccept(selectedFinding.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-3 rounded-xl transition-colors shadow-sm"
                >
                  ✓ Accept Finding
                </button>
                <button 
                  onClick={() => handleReject(selectedFinding.id)}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-sm font-semibold py-3 rounded-xl transition-colors"
                >
                  ✗ Reject
                </button>
                <button 
                  onClick={handleModifyOpen}
                  className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 text-sm font-semibold py-3 rounded-xl transition-colors"
                >
                  ~ Modify
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-100 max-w-4xl">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    This finding is <strong className="capitalize">{selectedFinding.reviewStatus}</strong>.
                  </span>
                </div>
                <button 
                  onClick={() => handleUndo(selectedFinding.id)}
                  className="text-sm text-indigo-600 font-semibold hover:text-indigo-800 underline"
                >
                  Undo Review
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODIFY DRAWER */}
      {showModifyDrawer && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModifyDrawer(false)}></div>
          
          <div className="relative w-96 bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Modify Finding</h2>
              <button onClick={() => setShowModifyDrawer(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Override Severity</label>
                <div className="flex gap-2">
                  {(['high', 'medium', 'low'] as const).map(sev => {
                    const isSelected = modifyDraft.severity === sev;
                    let selectedColor = "";
                    if (sev === "high") selectedColor = "bg-red-600 text-white border-red-600";
                    else if (sev === "medium") selectedColor = "bg-amber-500 text-white border-amber-500";
                    else selectedColor = "bg-green-600 text-white border-green-600";
                    
                    const unselectedColor = sev === "high" ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" : sev === "medium" ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100" : "bg-green-50 text-green-600 border-green-200 hover:bg-green-100";

                    return (
                      <button
                        key={sev}
                        onClick={() => setModifyDraft(prev => ({ ...prev, severity: sev }))}
                        className={`flex-1 border px-2 py-2 rounded-lg text-sm font-bold transition-colors capitalize ${isSelected ? selectedColor : unselectedColor}`}
                      >
                        {sev}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide">Auditor Comment</label>
                <textarea 
                  value={modifyDraft.comment}
                  onChange={(e) => setModifyDraft(prev => ({ ...prev, comment: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-32 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none placeholder:text-gray-400"
                  placeholder="Explain your reasoning for modifying this finding..."
                ></textarea>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50">
              <button 
                onClick={() => setShowModifyDrawer(false)}
                className="flex-1 border border-gray-200 bg-white text-gray-700 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleModifySave}
                disabled={!modifyDraft.comment.trim()}
                className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-purple-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Changes
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
