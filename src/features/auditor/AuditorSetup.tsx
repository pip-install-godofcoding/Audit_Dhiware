import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/Button"
import { Step1Documents, Document } from "./components/Step1Documents"
import { Step2Frameworks, Framework } from "./components/Step2Frameworks"
import { Step3Options, AuditOptions } from "./components/Step3Options"
import { Step4Review } from "./components/Step4Review"
import { mockRunAudit } from "@/api"

// Mock Data
const MOCK_DOCUMENTS: Document[] = [
  { id: "doc-1", name: "security_policy.pdf", fileType: "pdf", size: "2.4 MB", uploadDate: "2024-03-01", status: "masked" },
  { id: "doc-2", name: "vendor_contract.pdf", fileType: "pdf", size: "1.1 MB", uploadDate: "2024-03-05", status: "masked" },
  { id: "doc-3", name: "incident_response.docx", fileType: "docx", size: "5.6 MB", uploadDate: "2024-03-10", status: "pending" },
  { id: "doc-4", name: "access_logs_q1.txt", fileType: "txt", size: "12.0 MB", uploadDate: "2024-03-12", status: "masked" },
];

const MOCK_FRAMEWORKS: Framework[] = [
  { id: "iso-27001", name: "ISO 27001", shortName: "ISO", controls: 114, description: "International standard on how to manage information security." },
  { id: "nist-csf", name: "NIST CSF 2.0", shortName: "NIST", controls: 108, description: "Cybersecurity framework by the National Institute of Standards and Technology." },
  { id: "soc2", name: "SOC 2 Type II", shortName: "SOC2", controls: 64, description: "Auditing procedure that ensures service providers securely manage data." },
  { id: "gdpr", name: "GDPR", shortName: "GDPR", controls: 99, description: "General Data Protection Regulation for EU data privacy." },
  { id: "pci-dss", name: "PCI-DSS v4.0", shortName: "PCI", controls: 250, description: "Payment Card Industry Data Security Standard." },
];

export function AuditorSetup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [selectedFrameworkIds, setSelectedFrameworkIds] = useState<string[]>([]);
  const [options, setOptions] = useState<AuditOptions>({
    adversarialDebate: true,
    confidenceDecay: false,
    confidenceThreshold: 0.75,
  });

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleRunAudit = async () => {
    setIsSubmitting(true);
    try {
      const response = await mockRunAudit({
        documents: selectedDocIds,
        frameworks: selectedFrameworkIds,
        options
      });
      // Navigate to progress screen (currently a placeholder)
      navigate(`/auditor/progress?id=${(response as any).audit_id}`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNextDisabled = () => {
    if (currentStep === 1) return selectedDocIds.length === 0;
    if (currentStep === 2) return selectedFrameworkIds.length === 0;
    return false;
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      {/* Header and Progress Indicator */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configure New Audit</h1>
        <div className="mt-4 flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-secondary rounded-full -z-10">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            />
          </div>
          {[1, 2, 3, 4].map(step => (
            <div 
              key={step}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors border-2
                ${currentStep > step ? "bg-primary border-primary text-primary-foreground" : 
                  currentStep === step ? "bg-background border-primary text-primary" : 
                  "bg-background border-secondary text-muted-foreground"}`}
            >
              {step}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
          <span>Documents</span>
          <span>Frameworks</span>
          <span>Options</span>
          <span>Review</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <Step1Documents 
            documents={MOCK_DOCUMENTS} 
            selectedDocIds={selectedDocIds} 
            onSelectionChange={setSelectedDocIds} 
          />
        )}
        {currentStep === 2 && (
          <Step2Frameworks 
            frameworks={MOCK_FRAMEWORKS} 
            selectedFrameworkIds={selectedFrameworkIds} 
            onSelectionChange={setSelectedFrameworkIds} 
          />
        )}
        {currentStep === 3 && (
          <Step3Options 
            options={options} 
            onOptionsChange={setOptions} 
          />
        )}
        {currentStep === 4 && (
          <Step4Review 
            documents={MOCK_DOCUMENTS} 
            selectedDocIds={selectedDocIds} 
            frameworks={MOCK_FRAMEWORKS} 
            selectedFrameworkIds={selectedFrameworkIds} 
            options={options} 
          />
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button 
          variant="outline" 
          onClick={handlePrev} 
          disabled={currentStep === 1 || isSubmitting}
        >
          Back
        </Button>
        {currentStep < 4 ? (
          <Button 
            onClick={handleNext} 
            disabled={isNextDisabled()}
          >
            Next Step
          </Button>
        ) : (
          <Button 
            onClick={handleRunAudit} 
            isLoading={isSubmitting}
            className="w-32"
          >
            Run Audit
          </Button>
        )}
      </div>
    </div>
  )
}
