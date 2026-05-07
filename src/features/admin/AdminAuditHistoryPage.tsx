import React from "react";
import {
  ClipboardList,
  ShieldAlert,
  CheckCircle2,
  Clock3,
  FileSearch,
} from "lucide-react";

import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function AdminAuditHistoryPage() {

  const audits = [
    {
      id: "AUD-2026-001",
      framework: "ISO 27001",
      initiatedBy: "Madhura Hegde",
      documents: 12,
      findings: 8,
      severity: "High",
      status: "Completed",
      timestamp: "2026-05-20 10:30 AM",
    },
    {
      id: "AUD-2026-002",
      framework: "SOC2",
      initiatedBy: "Ganavi MC",
      documents: 7,
      findings: 3,
      severity: "Medium",
      status: "Running",
      timestamp: "2026-05-21 02:15 PM",
    },
    {
      id: "AUD-2026-003",
      framework: "PCI DSS",
      initiatedBy: "Rahul Kumar",
      documents: 4,
      findings: 1,
      severity: "Low",
      status: "Completed",
      timestamp: "2026-05-22 09:00 AM",
    },
  ];

  const getSeverityBadge = (severity: string) => {

    if (severity === "High") {
      return (
        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
          High
        </span>
      );
    }

    if (severity === "Medium") {
      return (
        <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">
          Medium
        </span>
      );
    }

    return (
      <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
        Low
      </span>
    );
  };

  const getStatusBadge = (status: string) => {

    if (status === "Completed") {
      return (
        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
          Completed
        </span>
      );
    }

    return (
      <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full">
          Running
      </span>
    );
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

        {/* AUDIT TABLE */}
        <Card className="bg-white rounded-2xl overflow-hidden mb-6">

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-gray-50 border-b border-gray-200">

                <tr className="text-left">

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Audit ID
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Framework
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Initiated By
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Documents
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Findings
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Severity
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Timestamp
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody>

                {audits.map((audit) => (

                  <tr
                    key={audit.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >

                    <td className="px-6 py-4 font-medium text-gray-900">
                      {audit.id}
                    </td>

                    <td className="px-6 py-4">

                      <div className="flex items-center gap-2">

                        <div className="bg-indigo-100 p-2 rounded-lg">
                          <ClipboardList className="w-4 h-4 text-indigo-600" />
                        </div>

                        <span className="text-sm text-gray-800">
                          {audit.framework}
                        </span>

                      </div>

                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {audit.initiatedBy}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {audit.documents}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {audit.findings}
                    </td>

                    <td className="px-6 py-4">
                      {getSeverityBadge(audit.severity)}
                    </td>

                    <td className="px-6 py-4">
                      {getStatusBadge(audit.status)}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {audit.timestamp}
                    </td>

                    <td className="px-6 py-4">

                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
                        onClick={() =>
                          alert(`Opening ${audit.id}`)
                        }
                      >
                        <FileSearch className="w-4 h-4 mr-1" />
                        View
                      </Button>

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

                <h3 className="text-sm text-gray-500">
                  Completed Audits
                </h3>

                <p className="text-2xl font-bold text-gray-900 mt-1">
                  24
                </p>

              </div>

            </div>

          </Card>

          <Card className="bg-white rounded-2xl p-5">

            <div className="flex items-start gap-4">

              <div className="bg-indigo-100 p-3 rounded-full">
                <Clock3 className="w-5 h-5 text-indigo-600" />
              </div>

              <div>

                <h3 className="text-sm text-gray-500">
                  Running Audits
                </h3>

                <p className="text-2xl font-bold text-gray-900 mt-1">
                  5
                </p>

              </div>

            </div>

          </Card>

          <Card className="bg-white rounded-2xl p-5">

            <div className="flex items-start gap-4">

              <div className="bg-red-100 p-3 rounded-full">
                <ShieldAlert className="w-5 h-5 text-red-600" />
              </div>

              <div>

                <h3 className="text-sm text-gray-500">
                  High Severity Findings
                </h3>

                <p className="text-2xl font-bold text-gray-900 mt-1">
                  12
                </p>

              </div>

            </div>

          </Card>

        </div>

      </div>
    </div>
  );
  
}