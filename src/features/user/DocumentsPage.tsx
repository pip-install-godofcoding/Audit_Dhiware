import React, { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Search,
  Trash2,
  Eye,
  ShieldCheck,
} from "lucide-react";

import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useNavigate } from "react-router-dom";
import { mockGetDocuments } from "../../api/mock";


export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDocuments = async () => {

  try {

    const storedDocs = localStorage.getItem("allDocuments");

    if (storedDocs) {
      setDocuments(JSON.parse(storedDocs));
      setIsLoading(false);
      return;
    }

    const mockDocs = await mockGetDocuments();

    localStorage.setItem(
      "allDocuments",
      JSON.stringify(mockDocs)
    );

    setDocuments(mockDocs);

  } catch (error) {

    console.error(error);

  } finally {

    setIsLoading(false);

  }
};

loadDocuments();

loadDocuments();
  }, []);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) =>
      doc.filename.toLowerCase().includes(search.toLowerCase())
    );
  }, [documents, search]);

  const getStatusBadge = (status: string) => {
    if (status === "masked") {
      return (
        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
          PII Removed ✓
        </span>
      );
    }


    return (
      <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">
        Processing
      </span>
    );
  };
  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this document?")) return;
  const updatedDocs = documents.filter(
    (doc) => doc.id !== id
  );

  setDocuments(updatedDocs);

  const uploadedDocs = updatedDocs.filter(
    (doc) => doc.id.toString().includes("doc-")
  );

  localStorage.setItem(
    "uploadedDocs",
    JSON.stringify(uploadedDocs)
  );
};

  return (
    
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            My Documents
          </h1>

          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Manage uploaded documents and audit evidence.
          </p>
        </div>

        {/* SEARCH */}
        <Card className="p-4 mb-6 bg-white rounded-2xl">
          <div className="relative">

            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />

            <Input
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              placeholder="Search documents..."
              className="pl-10 bg-white"
            />

          </div>
        </Card>

        {/* DOCUMENT TABLE */}
        <Card className="bg-white rounded-2xl overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-gray-50 border-b border-gray-200">

                <tr className="text-left">

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Document
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Type
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Uploaded
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody>

                {isLoading ? (

                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-gray-400"
                    >
                      Loading documents...
                    </td>
                  </tr>

                ) : filteredDocuments.length === 0 ? (

                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-gray-400"
                    >
                      No documents found.
                    </td>
                  </tr>

                ) : (

                  filteredDocuments.map((doc) => (

                    <tr
                      key={doc.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >

                      <td className="px-6 py-4">

                        <div className="flex items-center gap-3">

                          <div className="bg-indigo-100 p-2 rounded-lg">
                            <FileText className="w-4 h-4 text-indigo-600" />
                          </div>

                          <div>
                            <div className="font-medium text-gray-900">
                              {doc.filename}
                            </div>

                            <div className="text-xs text-gray-400 mt-1">
                              {doc.size}
                            </div>
                          </div>

                        </div>

                      </td>

                      <td className="px-6 py-4">
                        <span className="uppercase text-sm text-gray-700">
                          {doc.fileType}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {doc.uploadedAt}
                      </td>

                      <td className="px-6 py-4">
                        {getStatusBadge(doc.maskingStatus)}
                      </td>

                      <td className="px-6 py-4">

                        <div className="flex items-center gap-2">

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
  navigate(`/user/documents/${doc.id}`, {
    state: { document: doc },
  })
}
                            className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                            className="bg-white text-red-600 border border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>

                        </div>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </Card>

        {/* INFO CARD */}
        <Card className="mt-6 p-5 bg-white rounded-2xl">

          <div className="flex items-start gap-4">

            <div className="bg-indigo-100 p-3 rounded-full">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            </div>

            <div>

              <h3 className="font-semibold text-gray-900">
                PII Masking & Indexing
              </h3>

              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Uploaded documents are automatically processed for
                sensitive data masking, semantic indexing, and audit
                retrieval workflows before use in audit analysis.
              </p>

            </div>

          </div>

        </Card>

      </div>
    </div>

  );
}