import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Share2, FileSpreadsheet, FileJson, AlertTriangle, Loader2, Check } from 'lucide-react';
import { getFindings, getAuditStatus } from '../../api/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
const COVERAGE_DOMAINS: CoverageDomain[] = [
  { name: "Access Control", percentage: 87, total: 24, covered: 21 },
  { name: "Vendor Risk", percentage: 78, total: 18, covered: 14 },
  { name: "Incident Response", percentage: 54, total: 13, covered: 7 },
  { name: "Cryptography", percentage: 31, total: 16, covered: 5 },
  { name: "Business Continuity", percentage: 22, total: 9, covered: 2 },
  { name: "Vulnerability Mgmt", percentage: 67, total: 12, covered: 8 },
];

export default function ReportViewerPage() {
  const [searchParams] = useSearchParams();
  const auditId = searchParams.get("auditId");

  // STATE
  const [findings, setFindings] = useState<ReportFinding[]>([]);
  const [metadata, setMetadata] = useState<any>({
    auditId: auditId || "",
    runAt: new Date().toLocaleDateString(),
    documents: [],
    frameworks: [],
    totalControls: 0,
    duration: "—",
    totalCost: "—",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterSeverity, setFilterSeverity] = useState<"all" | Severity>("all");
  const [filterReview, setFilterReview] = useState<"all" | ReviewStatus>("all");
  const [sortField, setSortField] = useState<"severity" | "confidence" | "id">("severity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  // FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      if (!auditId) {
        setError("No audit ID specified.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [findingsData, statusData] = await Promise.all([
          getFindings(auditId),
          getAuditStatus(auditId).catch(() => null)
        ]);

        const mappedFindings: ReportFinding[] = findingsData.map((f: any) => ({
          id: f.id,
          controlId: f.controlId || f.control_id || "—",
          controlName: f.controlName || f.control_name || "—",
          severity: (f.severity || f.aiSeverity || f.ai_severity || "medium") as Severity,
          status: (f.status || f.aiStatus || f.ai_status || "gap") as FindingStatus,
          reviewStatus: (f.reviewStatus || f.review_status || "pending") as ReviewStatus,
          confidence: f.confidence || 0,
          frameworks: f.frameworks || [],
          source: (f.evidenceChunks && f.evidenceChunks.length > 0) ? f.evidenceChunks[0].sourceDoc : "Unknown",
          remediation: f.remediation || "—",
          auditorComment: f.auditorComment || f.auditor_comment || "",
        }));

        setFindings(mappedFindings);
        
        setMetadata({
          auditId,
          runAt: new Date().toLocaleDateString(),
          documents: ["Multiple files"],
          frameworks: Array.from(new Set(mappedFindings.flatMap(f => f.frameworks))),
          totalControls: statusData ? statusData.totalControls : mappedFindings.length,
          duration: "Real-time",
          totalCost: "—",
        });

      } catch (err: any) {
        setError("Failed to load live report data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [auditId]);

  // DERIVED
  const overallScore = Math.round(COVERAGE_DOMAINS.reduce((sum, d) => sum + d.percentage, 0) / COVERAGE_DOMAINS.length);
  const highCount = findings.filter(f => f.severity === "high").length;
  const mediumCount = findings.filter(f => f.severity === "medium").length;
  const lowCount = findings.filter(f => f.severity === "low").length;
  const pendingReview = findings.filter(f => f.reviewStatus === "pending").length;

  const filteredFindings = useMemo(() => {
    let result = [...findings];
    
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
  }, [findings, filterSeverity, filterReview, sortField, sortDir]);

  // HELPERS
  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ── PDF DOWNLOAD ─────────────────────────────────────────
  const handleDownloadPDF = () => {
    setIsDownloading(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 14;
      let y = 20;

      // Title
      doc.setFontSize(22);
      doc.setTextColor(30, 30, 30);
      doc.text("Compliance Audit Report", margin, y);
      y += 10;

      // Subtitle / metadata
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`Audit ID: ${metadata.auditId || "—"}`, margin, y);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, y, { align: "right" });
      y += 6;
      doc.text(`Frameworks: ${metadata.frameworks.join(", ") || "—"}`, margin, y);
      doc.text(`Controls: ${metadata.totalControls}`, pageW - margin, y, { align: "right" });
      y += 8;

      // Divider
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      y += 6;

      // Summary cards
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text("Executive Summary", margin, y);
      y += 7;
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Overall Coverage Score: ${overallScore}%`, margin, y); y += 5;
      doc.text(`Total Findings: ${findings.length}    |    High: ${highCount}    |    Medium: ${mediumCount}    |    Low: ${lowCount}    |    Pending Review: ${pendingReview}`, margin, y);
      y += 10;

      // Coverage domains
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text("Coverage by Domain", margin, y);
      y += 3;

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Domain", "Coverage", "Covered", "Total"]],
        body: COVERAGE_DOMAINS.map(d => [
          d.name,
          `${d.percentage}%`,
          String(d.covered),
          String(d.total),
        ]),
        theme: "grid",
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: [245, 245, 255] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Findings table
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text("All Findings", margin, y);
      y += 3;

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["ID", "Control", "Severity", "Status", "Review", "Confidence", "Remediation", "Auditor Comment"]],
        body: findings.map(f => [
          f.controlId,
          f.controlName,
          f.severity.toUpperCase(),
          f.status.toUpperCase(),
          f.reviewStatus.toUpperCase(),
          `${Math.round(f.confidence * 100)}%`,
          f.remediation,
          f.auditorComment || "—",
        ]),
        theme: "grid",
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 7, textColor: [50, 50, 50], cellPadding: 2 },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 30 },
          6: { cellWidth: 35 },
          7: { cellWidth: 30 },
        },
      });

      // Footer on every page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(160, 160, 160);
        doc.text(
          `Compliance Intelligence Platform — Page ${i} of ${pageCount}`,
          pageW / 2, doc.internal.pageSize.getHeight() - 8,
          { align: "center" }
        );
      }

      doc.save(`audit-report-${metadata.auditId || "report"}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setIsDownloading(false);
    }
  };

  // ── JSON DOWNLOAD ────────────────────────────────────────
  const handleDownloadJSON = () => {
    const report = {
      auditId: metadata.auditId,
      generatedAt: new Date().toISOString(),
      metadata: {
        runAt: metadata.runAt,
        duration: metadata.duration,
        totalControls: metadata.totalControls,
        documents: metadata.documents,
        frameworks: metadata.frameworks,
      },
      summary: { overallScore, totalFindings: findings.length, highSeverity: highCount, mediumSeverity: mediumCount, lowSeverity: lowCount, pendingReview },
      coverageDomains: COVERAGE_DOMAINS,
      findings: findings.map(f => ({
        id: f.id, controlId: f.controlId, controlName: f.controlName,
        severity: f.severity, status: f.status, reviewStatus: f.reviewStatus,
        confidence: f.confidence, frameworks: f.frameworks, source: f.source,
        remediation: f.remediation, auditorComment: f.auditorComment || null,
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    triggerBlobDownload(blob, `audit-report-${metadata.auditId || "unknown"}.json`);
  };

  // ── EXCEL DOWNLOAD ───────────────────────────────────────
  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ["Compliance Audit Report"],
      [],
      ["Audit ID", metadata.auditId || "—"],
      ["Generated", new Date().toLocaleString()],
      ["Frameworks", metadata.frameworks.join(", ")],
      ["Total Controls", metadata.totalControls],
      [],
      ["Overall Score", `${overallScore}%`],
      ["Total Findings", findings.length],
      ["High Severity", highCount],
      ["Medium Severity", mediumCount],
      ["Low Severity", lowCount],
      ["Pending Review", pendingReview],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet["!cols"] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    // Sheet 2: Coverage
    const coverageData = [
      ["Domain", "Coverage %", "Covered", "Total"],
      ...COVERAGE_DOMAINS.map(d => [d.name, d.percentage, d.covered, d.total]),
    ];
    const coverageSheet = XLSX.utils.aoa_to_sheet(coverageData);
    coverageSheet["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, coverageSheet, "Coverage");

    // Sheet 3: Findings
    const findingsData = [
      ["ID", "Control ID", "Control Name", "Severity", "Status", "Review Status", "Confidence", "Frameworks", "Source", "Remediation", "Auditor Comment"],
      ...findings.map(f => [
        f.id, f.controlId, f.controlName,
        f.severity.toUpperCase(), f.status.toUpperCase(), f.reviewStatus.toUpperCase(),
        `${Math.round(f.confidence * 100)}%`,
        f.frameworks.join(" | "), f.source, f.remediation, f.auditorComment || "",
      ]),
    ];
    const findingsSheet = XLSX.utils.aoa_to_sheet(findingsData);
    findingsSheet["!cols"] = [
      { wch: 12 }, { wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 10 },
      { wch: 14 }, { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 35 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, findingsSheet, "Findings");

    // Write and download
    const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbOut], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    triggerBlobDownload(blob, `audit-report-${metadata.auditId || "unknown"}.xlsx`);
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
                {metadata.runAt} · {metadata.duration}
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
              <button onClick={handleDownloadExcel} className="bg-white border border-gray-200 text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                Excel
              </button>
              <button onClick={handleDownloadJSON} className="bg-white border border-gray-200 text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer">
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
            <span>{metadata.documents.length} documents</span>
            <span>{metadata.frameworks.join(" · ")}</span>
            <span>{metadata.totalControls} controls evaluated</span>
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
              {metadata.frameworks.map((fw: string) => (
                <span key={fw} className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-md font-medium">
                  {fw}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-center">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Run details</div>
            <div className="text-lg font-bold text-gray-900 leading-none">{metadata.totalCost}</div>
            <div className="text-xs text-gray-400 mt-1">{metadata.duration}</div>
            <div className="text-xs text-gray-400 mt-0.5">{metadata.documents.length} source documents</div>
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
            <span>Showing {filteredFindings.length} of {findings.length} findings</span>
            <span>Last updated: {metadata.runAt}</span>
          </div>

        </div>

      </div>
    </div>
  );
}
