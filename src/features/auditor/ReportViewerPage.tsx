import React, { useState, useMemo } from 'react';
import { Download, Share2, FileSpreadsheet, FileJson, AlertTriangle, Loader2, Check } from 'lucide-react';

// TYPES
type Severity = "high" | "medium" | "low";
type FindingStatus = "gap" | "partial" | "covered" | "stale";
type ReviewStatus = "accepted" | "rejected" | "modified" | "pending";

interface ReportFinding {
  id: string;
  controlId: string;
  controlName: string;
  severity: Severity;
  status: FindingStatus;
  reviewStatus: ReviewStatus;
  confidence: number;
  frameworks: string[];
  source: string;
  remediation: string;
  auditorComment?: string;
}

interface CoverageDomain {
  name: string;
  percentage: number;
  total: number;
  covered: number;
}

// MOCK DATA
const REPORT_METADATA = {
  auditId: "audit-1746518400000",
  runAt: "6 May 2026, 14:23",
  documents: ["vendor_contract_2026.pdf", "security_policy_v4.docx", "soc2_report_2026.pdf"],
  frameworks: ["ISO 27001", "NIST CSF 2.0"],
  totalControls: 114,
  duration: "4 minutes 12 seconds",
  totalCost: "$12.40",
};

const COVERAGE_DOMAINS: CoverageDomain[] = [
  { name: "Access Control", percentage: 87, total: 24, covered: 21 },
  { name: "Vendor Risk", percentage: 78, total: 18, covered: 14 },
  { name: "Incident Response", percentage: 54, total: 13, covered: 7 },
  { name: "Cryptography", percentage: 31, total: 16, covered: 5 },
  { name: "Business Continuity", percentage: 22, total: 9, covered: 2 },
  { name: "Vulnerability Mgmt", percentage: 67, total: 12, covered: 8 },
];

const REPORT_FINDINGS: ReportFinding[] = [
  { id: "GAP-001", controlId: "A.9.2.5", controlName: "Review of user access rights", severity: "high", status: "gap", reviewStatus: "accepted", confidence: 0.88, frameworks: ["ISO A.9.2.5", "NIST AC-2(7)", "SOC2 CC6.3"], source: "security_policy.pdf §4.2 + soc2_report.pdf CC6.3", remediation: "Conduct and document quarterly access reviews immediately." },
  { id: "GAP-002", controlId: "A.10.1.1", controlName: "Policy on use of cryptographic controls", severity: "high", status: "gap", reviewStatus: "accepted", confidence: 0.92, frameworks: ["ISO A.10.1.1", "NIST SC-28"], source: "security_policy.pdf §6.1", remediation: "Add encryption at rest attestation to next SOC audit." },
  { id: "GAP-003", controlId: "A.17.1.1", controlName: "Planning information security continuity", severity: "medium", status: "gap", reviewStatus: "accepted", confidence: 0.95, frameworks: ["ISO A.17.1.1", "SOC2 A1.2"], source: "soc2_report.pdf A1.2", remediation: "Document RTO/RPO targets and test recovery procedures." },
  { id: "GAP-004", controlId: "A.12.6.1", controlName: "Management of technical vulnerabilities", severity: "low", status: "stale", reviewStatus: "pending", confidence: 0.71, frameworks: ["NIST RA-5"], source: "soc2_report.pdf CC7.2", remediation: "Schedule overdue vulnerability scan." },
  { id: "GAP-005", controlId: "A.9.4.2", controlName: "Secure log-on procedures", severity: "medium", status: "partial", reviewStatus: "modified", confidence: 0.67, frameworks: ["ISO A.9.4.2", "NIST AC-17"], source: "soc2_report.pdf CC6.1", remediation: "Re-test MFA across all systems.", auditorComment: "MFA confirmed present but evidence is outdated. Marking as medium priority." },
];

export default function ReportViewerPage() {
  // STATE
  const [filterSeverity, setFilterSeverity] = useState<"all" | Severity>("all");
  const [filterReview, setFilterReview] = useState<"all" | ReviewStatus>("all");
  const [sortField, setSortField] = useState<"severity" | "confidence" | "id">("severity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  // DERIVED
  const overallScore = Math.round(COVERAGE_DOMAINS.reduce((sum, d) => sum + d.percentage, 0) / COVERAGE_DOMAINS.length);
  const highCount = REPORT_FINDINGS.filter(f => f.severity === "high").length;
  const mediumCount = REPORT_FINDINGS.filter(f => f.severity === "medium").length;
  const lowCount = REPORT_FINDINGS.filter(f => f.severity === "low").length;
  const pendingReview = REPORT_FINDINGS.filter(f => f.reviewStatus === "pending").length;

  const filteredFindings = useMemo(() => {
    let result = [...REPORT_FINDINGS];
    
    // Filter
    if (filterSeverity !== "all") {
      result = result.filter(f => f.severity === filterSeverity);
    }
    if (filterReview !== "all") {
      result = result.filter(f => f.reviewStatus === filterReview);
    }
    
    // Sort
    result.sort((a, b) => {
      let diff = 0;
      if (sortField === "severity") {
        const sevMap = { high: 0, medium: 1, low: 2 };
        diff = sevMap[a.severity] - sevMap[b.severity];
      } else if (sortField === "confidence") {
        diff = b.confidence - a.confidence; // desc by default
      } else if (sortField === "id") {
        diff = a.id.localeCompare(b.id);
      }
      
      return sortDir === "asc" ? diff : -diff;
    });
    
    return result;
  }, [filterSeverity, filterReview, sortField, sortDir]);

  // HANDLERS
  const handleDownloadPDF = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
    }, 1500);
  };

  const handleShare = () => {
    setShowShareToast(true);
    setTimeout(() => {
      setShowShareToast(false);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-transparent pb-12 relative">
      
      {/* SHARE TOAST */}
      <div 
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 transition-all duration-300 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm px-5 py-3 rounded-full shadow-lg ${showShareToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      >
        <Check className="w-4 h-4 text-green-400" />
        Report link copied to clipboard
      </div>

      {/* TOP HEADER */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            
            <div className="flex-1">
              <div className="text-sm text-gray-400">
                Auditor <span className="mx-1">→</span> Findings Review <span className="mx-1">→</span> <span className="text-gray-700 font-medium">Report</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">Audit Report</h1>
              <div className="text-sm text-gray-400 mt-0.5">
                {REPORT_METADATA.runAt} · {REPORT_METADATA.duration}
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button 
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-80"
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download PDF
              </button>
              <button className="bg-white border border-gray-200 text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors">
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                Excel
              </button>
              <button className="bg-white border border-gray-200 text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors">
                <FileJson className="w-4 h-4 text-amber-500" />
                JSON
              </button>
              <button 
                onClick={handleShare}
                className="bg-white border border-gray-200 text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
            
          </div>
          
          <div className="mt-4 flex flex-wrap gap-6 text-sm text-gray-500">
            <span>{REPORT_METADATA.documents.length} documents</span>
            <span>{REPORT_METADATA.frameworks.join(" · ")}</span>
            <span>{REPORT_METADATA.totalControls} controls evaluated</span>
            {pendingReview > 0 && (
              <span className="font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                ⚠ {pendingReview} pending review
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        
        {/* SECTION 1: OVERALL SCORE + METADATA CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-1 shadow-sm">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Overall Score</div>
            <div className={`text-4xl font-bold mt-1 ${overallScore >= 80 ? 'text-green-600' : overallScore >= 60 ? 'text-amber-500' : 'text-red-600'}`}>
              {overallScore}%
            </div>
            <div className="text-xs text-gray-400 mt-1">across all domains</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-center">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Findings</div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">High</span>
                <span className="font-bold text-red-600">{highCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Medium</span>
                <span className="font-bold text-amber-500">{mediumCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Low</span>
                <span className="font-bold text-green-600">{lowCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Frameworks</div>
            <div className="flex flex-wrap gap-2">
              {REPORT_METADATA.frameworks.map(fw => (
                <span key={fw} className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-md font-medium">
                  {fw}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-center">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Run details</div>
            <div className="text-lg font-bold text-gray-900 leading-none">{REPORT_METADATA.totalCost}</div>
            <div className="text-xs text-gray-400 mt-1">{REPORT_METADATA.duration}</div>
            <div className="text-xs text-gray-400 mt-0.5">{REPORT_METADATA.documents.length} source documents</div>
          </div>

        </div>

        {/* SECTION 2: COVERAGE BY DOMAIN */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Coverage by Domain</h2>
          <p className="text-sm text-gray-400 mt-0.5">Percentage of controls with sufficient evidence</p>

          <div className="mt-5 space-y-4">
            {COVERAGE_DOMAINS.map(domain => {
              const colorClass = domain.percentage >= 80 ? 'bg-green-500' : domain.percentage >= 60 ? 'bg-amber-500' : 'bg-red-500';
              const textColorClass = domain.percentage >= 80 ? 'text-green-600' : domain.percentage >= 60 ? 'text-amber-500' : 'text-red-600';

              return (
                <div key={domain.name} className="flex items-center gap-4">
                  <div className="w-40 text-sm font-medium text-gray-700 flex-shrink-0 truncate" title={domain.name}>
                    {domain.name}
                  </div>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`}
                      style={{ width: `${domain.percentage}%` }}
                    ></div>
                  </div>
                  <div className={`w-10 text-sm font-semibold text-right ${textColorClass}`}>
                    {domain.percentage}%
                  </div>
                  <div className="text-xs text-gray-400 w-16 text-right">
                    ({domain.covered}/{domain.total})
                  </div>
                  <div className="w-4 flex justify-center">
                    {domain.percentage < 50 && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: FULL FINDINGS TABLE */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          
          {/* TABLE HEADER */}
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900">All Findings</h2>
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">
                {filteredFindings.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select 
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as any)}
                className="border border-gray-200 text-sm text-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="all">All severities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select 
                value={filterReview}
                onChange={(e) => setFilterReview(e.target.value as any)}
                className="border border-gray-200 text-sm text-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="all">All review statuses</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="modified">Modified</option>
                <option value="pending">Pending</option>
              </select>

              <div className="flex items-center">
                <select 
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as any)}
                  className="border border-gray-200 text-sm text-gray-700 rounded-l-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white border-r-0"
                >
                  <option value="severity">Sort by severity</option>
                  <option value="confidence">Sort by confidence</option>
                  <option value="id">Sort by ID</option>
                </select>
                <button 
                  onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                  className="border border-gray-200 bg-gray-50 text-gray-500 px-2 py-1.5 rounded-r-lg hover:bg-gray-100"
                  title="Toggle sort direction"
                >
                  {sortDir === "asc" ? "↑" : "↓"}
                </button>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-6 py-3 font-semibold">ID</th>
                  <th className="px-6 py-3 font-semibold">Severity</th>
                  <th className="px-6 py-3 font-semibold">Control</th>
                  <th className="px-6 py-3 font-semibold">Source</th>
                  <th className="px-6 py-3 font-semibold">Frameworks</th>
                  <th className="px-6 py-3 font-semibold">Confidence</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {filteredFindings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-gray-400">
                      No findings match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredFindings.map(f => {
                    
                    const sevClass = 
                      f.severity === "high" ? "bg-red-50 text-red-700 border-red-200" :
                      f.severity === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-green-50 text-green-700 border-green-200";

                    const statusClass = 
                      f.status === "gap" ? "text-red-600" :
                      f.status === "partial" ? "text-amber-600" :
                      f.status === "covered" ? "text-green-600" :
                      "text-purple-600";
                    
                    const statusText = 
                      f.status === "gap" ? "✗ Gap" :
                      f.status === "partial" ? "~ Partial" :
                      f.status === "covered" ? "✓ Covered" :
                      "⏱ Stale";

                    const reviewClass = 
                      f.reviewStatus === "accepted" ? "bg-green-100 text-green-700" :
                      f.reviewStatus === "rejected" ? "bg-red-100 text-red-600" :
                      f.reviewStatus === "modified" ? "bg-purple-100 text-purple-700" :
                      "bg-gray-100 text-gray-500";

                    const confColor = f.confidence > 0.8 ? "text-green-600" : f.confidence > 0.6 ? "text-amber-500" : "text-red-600";

                    return (
                      <tr key={f.id} className="hover:bg-gray-50 transition-colors text-sm group">
                        <td className="px-6 py-4 text-xs font-mono font-bold text-gray-500 align-top">
                          {f.id}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <span className={`border px-2 py-0.5 rounded-md text-xs font-bold inline-block uppercase ${sevClass}`}>
                            {f.severity === "medium" ? "MED" : f.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-col">
                            <div>
                              <span className="text-xs text-gray-400 font-mono mr-2">{f.controlId}</span>
                              <span className="text-gray-900 font-medium">{f.controlName}</span>
                            </div>
                            {f.auditorComment && (
                              <span className="mt-1 text-xs text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded inline-block w-fit">
                                Modified: {f.auditorComment}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400 max-w-xs truncate align-top" title={f.source}>
                          {f.source}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-wrap gap-1">
                            <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-mono">
                              {f.frameworks[0]}
                            </span>
                            {f.frameworks.length > 1 && (
                              <span className="text-xs text-gray-400 font-medium">
                                +{f.frameworks.length - 1} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${confColor.replace('text-', 'bg-')}`} style={{ width: `${f.confidence * 100}%` }}></div>
                            </div>
                            <span className={`text-xs font-semibold ${confColor}`}>
                              {Math.round(f.confidence * 100)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <span className={`text-xs font-bold uppercase tracking-wide ${statusClass}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${reviewClass}`}>
                            {f.reviewStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* TABLE FOOTER */}
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-between text-xs text-gray-400 font-medium">
            <span>Showing {filteredFindings.length} of {REPORT_FINDINGS.length} findings</span>
            <span>Last updated: {REPORT_METADATA.runAt}</span>
          </div>

        </div>

      </div>
    </div>
  );
}
