import React from "react";
import {
  Server,
  Database,
  Activity,
  ShieldCheck,
  FileSearch,
  Brain,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import { Card } from "../../components/ui/Card";

export default function AdminSystemHealthPage() {

  const services = [
    {
      name: "API Gateway",
      description: "Handles authentication and frontend API requests",
      status: "healthy",
      uptime: "99.98%",
      latency: "42 ms",
      icon: Server,
    },
    {
      name: "ShaktiDB / PostgreSQL",
      description: "Primary relational and vector storage database",
      status: "healthy",
      uptime: "99.99%",
      latency: "18 ms",
      icon: Database,
    },
    {
      name: "pgvector Index",
      description: "Semantic embedding similarity search engine",
      status: "healthy",
      uptime: "99.95%",
      latency: "26 ms",
      icon: Brain,
    },
    {
      name: "OCR & Masking Pipeline",
      description: "Extracts text and masks sensitive information",
      status: "warning",
      uptime: "97.10%",
      latency: "210 ms",
      icon: ShieldCheck,
    },
    {
      name: "Audit Retrieval Engine",
      description: "Hybrid semantic + keyword retrieval pipeline",
      status: "healthy",
      uptime: "99.91%",
      latency: "58 ms",
      icon: FileSearch,
    },
    {
      name: "Monitoring & Telemetry",
      description: "Tracks audit execution and infrastructure metrics",
      status: "healthy",
      uptime: "99.97%",
      latency: "33 ms",
      icon: Activity,
    },
  ];

  const getStatusBadge = (status: string) => {

    if (status === "healthy") {
      return (
        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Healthy
        </span>
      );
    }

    return (
      <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        Warning
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-6">

          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            System Health Dashboard
          </h1>

          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Monitor infrastructure health, RAG services, and audit platform observability.
          </p>

        </div>

        {/* OVERVIEW CARDS */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">

          <Card className="bg-white rounded-2xl p-5">

            <div className="flex items-start gap-4">

              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>

              <div>

                <h3 className="text-sm text-gray-500">
                  Healthy Services
                </h3>

                <p className="text-2xl font-bold text-gray-900 mt-1">
                  5 / 6
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

                <h3 className="text-sm text-gray-500">
                  Average Latency
                </h3>

                <p className="text-2xl font-bold text-gray-900 mt-1">
                  64 ms
                </p>

              </div>

            </div>

          </Card>

          <Card className="bg-white rounded-2xl p-5">

            <div className="flex items-start gap-4">

              <div className="bg-yellow-100 p-3 rounded-full">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>

              <div>

                <h3 className="text-sm text-gray-500">
                  Active Warnings
                </h3>

                <p className="text-2xl font-bold text-gray-900 mt-1">
                  1
                </p>

              </div>

            </div>

          </Card>

        </div>

        {/* SERVICE GRID */}
        <div className="grid md:grid-cols-2 gap-6">

          {services.map((service, index) => {

            const Icon = service.icon;

            return (
              <Card
                key={index}
                className="bg-white rounded-2xl p-6"
              >

                <div className="flex items-start justify-between mb-5">

                  <div className="flex items-start gap-4">

                    <div className="bg-indigo-100 p-3 rounded-2xl">
                      <Icon className="w-5 h-5 text-indigo-600" />
                    </div>

                    <div>

                      <h2 className="font-semibold text-gray-900">
                        {service.name}
                      </h2>

                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                        {service.description}
                      </p>

                    </div>

                  </div>

                  {getStatusBadge(service.status)}

                </div>

                <div className="grid grid-cols-2 gap-4">

                  <div className="bg-gray-50 rounded-xl p-4">

                    <p className="text-xs text-gray-400 uppercase">
                      Uptime
                    </p>

                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {service.uptime}
                    </p>

                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">

                    <p className="text-xs text-gray-400 uppercase">
                      Latency
                    </p>

                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {service.latency}
                    </p>

                  </div>

                </div>

              </Card>
            );
          })}

        </div>

      </div>
    </div>
  );
}