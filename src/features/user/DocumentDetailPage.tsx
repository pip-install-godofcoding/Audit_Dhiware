import React from "react";
import {
  FileText,
  ShieldCheck,
  Database,
  CheckCircle2,
  Clock3,
  ClipboardList,
} from "lucide-react";

import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useLocation, useParams } from "react-router-dom";


export default function DocumentDetailPage() {
    const location = useLocation();
    const { id } = useParams();
const storedDocs = JSON.parse(
  localStorage.getItem("allDocuments") || "[]"
);

const document =
  location.state?.document ||
  storedDocs.find((doc: any) => doc.id === id);
if (!document) {
  return (

      <div className="p-6 text-gray-700">
        Document not found.
      </div>
    
  );
}
   
  

  const timeline = [
    {
      title: "Document Uploaded",
      description: "File successfully uploaded to ingestion pipeline",
      icon: FileText,
      completed: true,
    },
    {
      title: "PII Masking Completed",
      description: "Sensitive information masked successfully",
      icon: ShieldCheck,
      completed: true,
    },
    {
      title: "Semantic Indexing",
      description: "Vector embeddings generated and stored",
      icon: Database,
      completed: true,
    },
    {
      title: "Audit Processing",
      description: "Document used in audit retrieval workflows",
      icon: ClipboardList,
      completed: false,
    },
  ];

  return (
    
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-6">

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Document Details
            </h1>

            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Monitor document lifecycle, indexing, and audit usage.
            </p>
          </div>

          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Download
          </Button>

        </div>

        {/* DOCUMENT OVERVIEW */}
        <Card className="bg-white rounded-2xl p-6 mb-6">

          <div className="flex items-start gap-5">

            <div className="bg-indigo-100 p-4 rounded-2xl">
              <FileText className="w-8 h-8 text-indigo-600" />
            </div>

            <div className="flex-1">

              <div className="flex items-center justify-between">

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {document.filename}
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Uploaded by {document.uploadedBy || "System User"}
                  </p>
                </div>

                <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full">
                  PII Removed ✓
                </span>

              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">

                <div>
                  <p className="text-xs text-gray-400 uppercase">
                    File Type
                  </p>

                  <p className="text-sm font-medium text-gray-800 mt-1">
                    {document.type || "Unknown"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 uppercase">
                    File Size
                  </p>

                  <p className="text-sm font-medium text-gray-800 mt-1">
                    {document.size || "Unknown"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 uppercase">
                    Uploaded
                  </p>

                  <p className="text-sm font-medium text-gray-800 mt-1">
                    {document.uploadedAt}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 uppercase">
                    Indexing
                  </p>

                  <p className="text-sm font-medium text-green-600 mt-1">
                    {document.indexingStatus || "Indexed"}
                  </p>
                </div>

              </div>

            </div>

          </div>

        </Card>

        {/* TIMELINE */}
        <Card className="bg-white rounded-2xl p-6 mb-6">

          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Processing Timeline
          </h3>

          <div className="space-y-6">

            {timeline.map((step, index) => {

              const Icon = step.icon;

              return (
                <div
                  key={index}
                  className="flex items-start gap-4"
                >

                  <div
                    className={`p-3 rounded-full ${
                      step.completed
                        ? "bg-green-100"
                        : "bg-yellow-100"
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Clock3 className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>

                  <div className="flex-1">

                    <div className="flex items-center gap-2">

                      <Icon className="w-4 h-4 text-gray-500" />

                      <h4 className="font-medium text-gray-900">
                        {step.title}
                      </h4>

                    </div>

                    <p className="text-sm text-gray-500 mt-1">
                      {step.description}
                    </p>

                  </div>

                </div>
              );
            })}

          </div>

        </Card>

        {/* AUDIT USAGE */}
        <Card className="bg-white rounded-2xl p-6">

          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Audit Usage
          </h3>

          <div className="space-y-3">

            {(document.auditUsage || []).map((audit: string, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3"
              >

                <div className="flex items-center gap-3">

                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <ClipboardList className="w-4 h-4 text-indigo-600" />
                  </div>

                  <span className="text-sm font-medium text-gray-800">
                    {audit}
                  </span>

                </div>

                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">
                  Referenced
                </span>

              </div>
            ))}

          </div>

        </Card>

      </div>
    </div>
  );
}