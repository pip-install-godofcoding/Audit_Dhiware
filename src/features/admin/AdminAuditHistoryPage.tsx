import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  ShieldAlert,
  CheckCircle2,
  Clock3,
  FileSearch,
  Loader2,
} from "lucide-react";

import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { getAudits } from "../../api/client";
import type { AuditHistoryItem } from "../../api/client";

export default function AdminAuditHistoryPage() {

  const [audits, setAudits] = useState<AuditHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    try {
      setLoading(true);
      const data = await getAudits();
      setAudits(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load audit history");
    } finally {
      setLoading(false);
    }
  };

  const completedCount = audits.filter(a => a.status === "complete").length;
  const runningCount = audits.filter(a => a.status === "running").length;
  const totalFindings = audits.reduce((sum, a) => sum + (a.completed_controls || 0), 0);

  const getStatusBadge = (status: string) => {
    if (status === "complete") {
      return (
        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
          Completed
        </span>
      );
    }
    if (status === "failed") {
      return (
        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
          Failed
        </span>
      );
    }
    return (
      <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full">
        Running
      </span>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFrameworks = (config: any) => {
    try {
      if (typeof config === "string") config = JSON.parse(config);
      return config?.frameworks?.join(", ") || "—";
    } catch {
      return "—";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Audit History
          </h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Track audit execution history, findings, and compliance reviews.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <Card className="bg-white rounded-2xl p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mr-3" />
            <span className="text-gray-500">Loading audit history...</span>
          </Card>
        ) : (
          <>
            {/* AUDIT TABLE */}
            <Card className="bg-white rounded-2xl overflow-hidden mb-6">

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-left">
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Audit ID</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Framework</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Controls</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Started</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Completed</th>
                    </tr>
                  </thead>

                  <tbody>
                    {audits.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                          No audits have been run yet. Start one from the Auditor panel.
                        </td>
                      </tr>
                    ) : audits.map((audit) => (
                      <tr
                        key={audit.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 font-mono text-sm">
                          {audit.id.split("-")[0]}…
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="bg-indigo-100 p-2 rounded-lg">
                              <ClipboardList className="w-4 h-4 text-indigo-600" />
                            </div>
                            <span className="text-sm text-gray-800">
                              {getFrameworks(audit.config_json)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {audit.completed_controls} / {audit.total_controls}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(audit.status)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(audit.started_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(audit.completed_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                </table>

              </div>

            </Card>

            {/* SUMMARY CARDS */}
            <div className="grid md:grid-cols-3 gap-6">

              <Card className="bg-white rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm text-gray-500">Completed Audits</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{completedCount}</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-white rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="bg-indigo-100 p-3 rounded-full">
                    <Clock3 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm text-gray-500">Running Audits</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{runningCount}</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-white rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="bg-red-100 p-3 rounded-full">
                    <ShieldAlert className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm text-gray-500">Total Audits</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{audits.length}</p>
                  </div>
                </div>
              </Card>

            </div>
          </>
        )}

      </div>
    </div>
  );
  
}