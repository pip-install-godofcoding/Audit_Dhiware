import React from "react"
import { Document } from "./Step1Documents"
import { Framework } from "./Step2Frameworks"
import { AuditOptions } from "./Step3Options"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { FileText, Target, Settings, BrainCircuit } from "lucide-react"

interface Step4ReviewProps {
  documents: Document[];
  selectedDocIds: string[];
  frameworks: Framework[];
  selectedFrameworkIds: string[];
  options: AuditOptions;
}

export function Step4Review({ 
  documents, selectedDocIds, frameworks, selectedFrameworkIds, options 
}: Step4ReviewProps) {
  
  const selectedDocs = documents.filter(d => selectedDocIds.includes(d.id));
  const selectedFrameworks = frameworks.filter(f => selectedFrameworkIds.includes(f.id));
  
  const totalControls = selectedFrameworks.reduce((acc, f) => acc + f.controls, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Review & Run</h2>
        <p className="text-sm text-muted-foreground">
          Verify your configuration before starting the audit.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Documents Scope
            </CardTitle>
            <Badge variant="secondary">{selectedDocs.length}</Badge>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              {selectedDocs.slice(0, 3).map(doc => (
                <li key={doc.id} className="truncate">{doc.name}</li>
              ))}
              {selectedDocs.length > 3 && (
                <li className="text-muted-foreground italic">+{selectedDocs.length - 3} more</li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Frameworks Scope
            </CardTitle>
            <Badge variant="secondary">{selectedFrameworks.length}</Badge>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              {selectedFrameworks.map(f => (
                <li key={f.id} className="flex justify-between items-center">
                  <span>{f.name}</span>
                  <span className="text-muted-foreground">{f.controls} controls</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t text-sm font-medium flex justify-between">
              <span>Total Controls:</span>
              <span>{totalControls}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Audit Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <BrainCircuit className="h-3 w-3" /> Debate
              </span>
              <span className="text-sm font-medium">
                {options.adversarialDebate ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Settings className="h-3 w-3" /> Decay
              </span>
              <span className="text-sm font-medium">
                {options.confidenceDecay ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" /> Threshold
              </span>
              <span className="text-sm font-medium">
                {Math.round(options.confidenceThreshold * 100)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-100 dark:border-blue-900/50">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Estimated time:</strong> Based on your selections ({selectedDocs.length} documents, {totalControls} controls), 
          this audit will take approximately <strong>{Math.ceil(totalControls * 0.5)} minutes</strong> to complete.
        </p>
      </div>
    </div>
  )
}
