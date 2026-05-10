import React, { useState, useEffect } from "react";
import {
  Server,
  Database,
  Activity,
  ShieldCheck,
  FileSearch,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  XCircle,
} from "lucide-react";

import { Card } from "../../components/ui/Card";
import { getSystemHealth } from "../../api/client";
import type { SystemHealth } from "../../api/client";

const SERVICE_META: Record<string, { label: string; description: string; icon: any }> = {
  api: { label: "API Gateway", description: "Handles authentication and frontend API requests", icon: Server },
  database: { label: "PostgreSQL + pgvector", description: "Primary relational and vector storage database", icon: Database },
  redis: { label: "Redis Cache", description: "Session store, task queue broker, and audit status cache", icon: Activity },
  minio: { label: "MinIO Object Storage", description: "Stores uploaded documents and evidence files", icon: FileSearch },
  llm: { label: "Ollama LLM (Mistral)", description: "Local AI model for classification, debate, and copilot", icon: Brain },
  ingest: { label: "Ingest Service", description: "Document parsing, PII masking, and vector embedding pipeline", icon: ShieldCheck },
};

export default function AdminSystemHealthPage() {

  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const data = await getSystemHealth();
      setHealth(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to fetch system health");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "healthy") {
      return (
        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Healthy
        </span>
      );
    }
    if (status === "degraded") {
      return (
        <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Degraded
        </span>
      );
    }
    return (
      <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        Down
      </span>
    );
  };

  const healthyCount = health ? Object.values(health.services).filter(s => s === "healthy").length : 0;
  const totalCount = health ? Object.keys(health.services).length : 0;
  const warningCount = health ? Object.values(health.services).filter(s => s !== "healthy").length : 0;

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-6">

          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            System Health Dashboard
          </h1>

          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Live infrastructure health from the backend. Data refreshes on page load.
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
            <span className="text-gray-500">Checking all services...</span>
          </Card>
        ) : health && (
          <>
            {/* OVERVIEW CARDS */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">

              <Card className="bg-white rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm text-gray-500">Healthy Services</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {healthyCount} / {totalCount}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-white rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="bg-indigo-100 p-3 rounded-full">
                    <Activity className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm text-gray-500">RAG Latency</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {health.ragLatencyMs} ms
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-white rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className={`${warningCount > 0 ? 'bg-yellow-100' : 'bg-green-100'} p-3 rounded-full`}>
                    {warningCount > 0 ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm text-gray-500">Issues</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {warningCount}
                    </p>
                  </div>
                </div>
              </Card>

            </div>

            {/* SERVICE GRID */}
            <div className="grid md:grid-cols-2 gap-6">

              {Object.entries(health.services).map(([key, status]) => {
                const meta = SERVICE_META[key] || {
                  label: key.charAt(0).toUpperCase() + key.slice(1),
                  description: `${key} service`,
                  icon: Server,
                };
                const Icon = meta.icon;

                return (
                  <Card key={key} className="bg-white rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-start gap-4">
                        <div className="bg-indigo-100 p-3 rounded-2xl">
                          <Icon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h2 className="font-semibold text-gray-900">{meta.label}</h2>
                          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{meta.description}</p>
                        </div>
                      </div>
                      {getStatusBadge(status)}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-400 uppercase">Status</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">{status}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-400 uppercase">Active Jobs</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">{health.activeAuditJobs}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}

            </div>
          </>
        )}

      </div>
    </div>
  );
}