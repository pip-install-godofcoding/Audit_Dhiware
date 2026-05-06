import * as React from "react"
import { Search } from "lucide-react"
import Checkbox from "@/components/ui/Checkbox"
import DocumentRow from "./DocumentRow"

export interface Document {
  id: string;
  name: string;
  fileType: 'pdf' | 'docx' | 'txt';
  size: string;
  uploadDate: string;
  status: "masked" | "pending" | "failed";
}

interface Step1DocumentsProps {
  documents: Document[];
  selectedDocIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function Step1Documents({ documents, selectedDocIds, onSelectionChange }: Step1DocumentsProps) {
  const [search, setSearch] = React.useState("");

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredDocs.map(d => d.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedDocIds, id]);
    } else {
      onSelectionChange(selectedDocIds.filter(selectedId => selectedId !== id));
    }
  };

  const allSelected = filteredDocs.length > 0 && selectedDocIds.length === filteredDocs.length;
  const someSelected = selectedDocIds.length > 0 && selectedDocIds.length < filteredDocs.length;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Select Documents</h2>
        <p className="text-sm text-muted-foreground">
          Choose the indexed documents to include in this audit run.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            type="text"
            className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 pl-9"
            placeholder="Search documents..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-sm text-gray-500">
          <span className="font-medium text-gray-900">{selectedDocIds.length}</span> selected
        </div>
      </div>

      <div className="flex flex-col border border-gray-200 rounded-lg bg-white overflow-hidden mt-4 shadow-sm">
        <div className="flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200">
          <Checkbox 
            id="selectAll"
            checked={allSelected}
            indeterminate={someSelected}
            onChange={handleSelectAll}
          />
          <span className="text-xs font-semibold text-gray-500 uppercase ml-4">Select All</span>
        </div>
        <div className="flex flex-col">
          {filteredDocs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No documents found.</div>
          ) : (
            filteredDocs.map((doc) => (
              <DocumentRow
                key={doc.id}
                id={doc.id}
                filename={doc.name}
                fileType={doc.fileType}
                size={doc.size}
                uploadedAt={doc.uploadDate}
                maskingStatus={doc.status}
                selected={selectedDocIds.includes(doc.id)}
                onToggle={(id) => handleSelectOne(id, !selectedDocIds.includes(id))}
                disabled={doc.status !== 'masked'}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
