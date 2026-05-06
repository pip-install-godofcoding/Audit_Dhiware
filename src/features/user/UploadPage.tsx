import React, { useState } from "react";
import { Upload, FileText, CheckCircle2 } from "lucide-react";

import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { mockUploadDocument } from "../../api/mock";

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<any>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [error, setError] = useState("");

  const allowedTypes = [
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const handleFileChange = (file: File | null) => {
    setError("");

    if (!file) return;

    if (!allowedTypes.includes(file.type)) {
      setError("Only PDF, DOCX, and TXT files are allowed.");
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);

    try {
      const response = await mockUploadDocument(
        selectedFile.name,
        selectedFile.type
      );

      clearInterval(interval);

      setUploadProgress(100);

      setUploadedDoc(response);

    } catch (err) {
      setError("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Upload Documents
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Upload files for audit processing and semantic indexing.
          </p>
        </div>

        {/* UPLOAD CARD */}
        <Card className="p-8 rounded-2xl border border-dashed border-gray-300 bg-white">

          <div className="flex flex-col items-center justify-center text-center">

            <div className="bg-indigo-100 p-4 rounded-full mb-4">
              <Upload className="w-8 h-8 text-indigo-600" />
            </div>

            <h2 className="text-lg font-semibold text-gray-900">
              Drag & Drop Files
            </h2>

            <p className="text-sm text-gray-500 mt-2">
              Supports PDF, DOCX, and TXT documents
            </p>

            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) =>
                handleFileChange(
                  e.target.files ? e.target.files[0] : null
                )
              }
              className="mt-6"
            />

            {selectedFile && (
              <div className="mt-4 text-sm text-gray-700">
                Selected:
                <span className="font-medium ml-1">
                  {selectedFile.name}
                </span>
              </div>
            )}

            {error && (
              <div className="mt-4 text-sm text-red-500">
                {error}
              </div>
            )}

            {/* PROGRESS BAR */}
            {isUploading && (
              <div className="w-full mt-6">

                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>

              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isUploading ? "Uploading..." : "Upload Document"}
            </Button>

          </div>

        </Card>

        {/* SUCCESS CARD */}
        {uploadedDoc && (
          <Card className="mt-6 p-5 rounded-2xl bg-white">

            <div className="flex items-start gap-4">

              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>

              <div className="flex-1">

                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    Upload Successful
                  </h3>

                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                    PII Removed ✓
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="w-4 h-4" />

                  <span>{uploadedDoc.filename}</span>
                </div>

                <div className="mt-2 text-xs text-gray-400">
                  Uploaded on {uploadedDoc.uploadedAt}
                </div>

              </div>

            </div>

          </Card>
        )}

      </div>
    </div>
  );
}