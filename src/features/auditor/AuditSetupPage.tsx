import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Play, Search } from 'lucide-react';

import Checkbox from '@/components/ui/Checkbox';
import Switch from '@/components/ui/Switch';
import Slider from '@/components/ui/Slider';
import FrameworkCard from './components/FrameworkCard';
import DocumentRow from './components/DocumentRow';

const MOCK_DOCUMENTS = [
  { id: "doc-1", filename: "vendor_contract_2026.pdf", fileType: "pdf" as const, size: "1.2 MB", uploadedAt: "12 May 2026", maskingStatus: "masked" as const },
  { id: "doc-2", filename: "security_policy_v4.docx", fileType: "docx" as const, size: "845 KB", uploadedAt: "10 May 2026", maskingStatus: "masked" as const },
  { id: "doc-3", filename: "soc2_report_2026.pdf", fileType: "pdf" as const, size: "3.1 MB", uploadedAt: "08 May 2026", maskingStatus: "masked" as const },
  { id: "doc-4", filename: "pentest_results.pdf", fileType: "pdf" as const, size: "2.4 MB", uploadedAt: "05 May 2026", maskingStatus: "processing" as const },
  { id: "doc-5", filename: "access_control_evidence.txt", fileType: "txt" as const, size: "120 KB", uploadedAt: "01 May 2026", maskingStatus: "masked" as const },
];

const MOCK_FRAMEWORKS = [
  { id: "iso27001", name: "ISO 27001 / 27002", shortName: "ISO", controlCount: 114, description: "International standard for information security management systems." },
  { id: "nist", name: "NIST CSF 2.0", shortName: "NIST", controlCount: 108, description: "NIST Cybersecurity Framework for managing and reducing cybersecurity risk." },
  { id: "soc2", name: "SOC 2 Type II", shortName: "SOC2", controlCount: 64, description: "Trust Service Criteria for security, availability, and confidentiality." },
  { id: "gdpr", name: "GDPR / DPDP Act", shortName: "GDPR", controlCount: 42, description: "Data protection and privacy regulations for EU and India." },
  { id: "pcidss", name: "PCI-DSS v4.0", shortName: "PCI", controlCount: 78, description: "Payment Card Industry Data Security Standard." },
];

const CONTROL_DOMAINS = [
  { key: "accessControl", label: "Access Control", description: "User access rights, authentication, authorisation" },
  { key: "cryptography", label: "Cryptography", description: "Encryption at rest, in transit, key management" },
  { key: "incidentResponse", label: "Incident Response", description: "Breach notification, response procedures" },
  { key: "vendorRisk", label: "Vendor Risk", description: "Third-party obligations, SOC certifications" },
  { key: "businessContinuity", label: "Business Continuity", description: "RTO/RPO targets, recovery procedures" },
  { key: "vulnerabilityMgmt", label: "Vulnerability Management", description: "Scan cadence, patch management, pentesting" },
];

export default function AuditSetupPage() {
  const navigate = useNavigate();

  // STATE
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(["iso27001"]);
  const [docSearch, setDocSearch] = useState("");
  const [options, setOptions] = useState({
    adversarialDebate: true,
    confidenceDecay: true,
    confidenceThreshold: 0.75,
    domains: CONTROL_DOMAINS.reduce((acc, domain) => ({ ...acc, [domain.key]: true }), {} as Record<string, boolean>)
  });
  const [openSections, setOpenSections] = useState({ documents: true, frameworks: true, options: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // DERIVED VALUES
  const filteredDocs = useMemo(() => {
    return MOCK_DOCUMENTS.filter(doc => doc.filename.toLowerCase().includes(docSearch.toLowerCase()));
  }, [docSearch]);

  const availableDocs = useMemo(() => {
    return MOCK_DOCUMENTS.filter(doc => doc.maskingStatus === "masked");
  }, []);

  const allMaskedSelected = selectedDocs.length === availableDocs.length && availableDocs.length > 0;
  const someMaskedSelected = selectedDocs.length > 0 && !allMaskedSelected;

  const estimatedTime = useMemo(() => {
    const validSelectedDocsCount = selectedDocs.filter(id => MOCK_DOCUMENTS.find(d => d.id === id)?.maskingStatus === "masked").length;
    const time = selectedFrameworks.length * validSelectedDocsCount * 1.2;
    return `~${time > 0 ? time.toFixed(0) : 0} minutes`;
  }, [selectedDocs, selectedFrameworks]);

  const estimatedCost = useMemo(() => {
    return `$${(selectedFrameworks.length * 12).toFixed(0)}`;
  }, [selectedFrameworks]);

  // HANDLERS
  const toggleDoc = (id: string) => {
    const doc = MOCK_DOCUMENTS.find(d => d.id === id);
    if (!doc || doc.maskingStatus !== "masked") return;
    
    setSelectedDocs(prev => 
      prev.includes(id) ? prev.filter(dId => dId !== id) : [...prev, id]
    );
  };

  const toggleAllDocs = () => {
    if (allMaskedSelected) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(availableDocs.map(d => d.id));
    }
  };

  const toggleFramework = (id: string) => {
    setSelectedFrameworks(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDomain = (key: string) => {
    setOptions(prev => ({
      ...prev,
      domains: { ...prev.domains, [key]: !prev.domains[key] }
    }));
  };

  const handleRunAudit = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    const auditId = "audit-" + Date.now();
    navigate("/auditor/progress?id=" + auditId);
  };

  // HELPERS
  const isDefaultsApplied = 
    options.adversarialDebate === true && 
    options.confidenceDecay === true && 
    options.confidenceThreshold === 0.75 && 
    Object.values(options.domains).every(v => v === true);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-5xl mx-auto px-4 py-8">
        
        {/* PAGE HEADER */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Configure Audit</h1>
          <p className="text-sm text-gray-500 mt-1">Select documents, choose frameworks, and configure AI options.</p>
        </div>

        {/* TWO-COLUMN GRID */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Accordions */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* SECTION 1 — DOCUMENTS */}
            <div>
              <div 
                onClick={() => toggleSection('documents')}
                className={`flex justify-between items-center p-4 bg-white border border-gray-200 cursor-pointer hover:bg-gray-50 ${openSections.documents ? 'rounded-t-xl' : 'rounded-xl'}`}
              >
                <div className="flex items-center">
                  <span className="text-base font-semibold text-gray-900">Documents</span>
                  {selectedDocs.length > 0 && (
                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full ml-2">
                      {selectedDocs.length} selected
                    </span>
                  )}
                </div>
                {openSections.documents ? <ChevronUp className="text-gray-400 w-5 h-5" /> : <ChevronDown className="text-gray-400 w-5 h-5" />}
              </div>
              
              {openSections.documents && (
                <div className="bg-white border-x border-b border-gray-200 rounded-b-xl p-4">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                    <input 
                      type="text" 
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                      placeholder="Search documents..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 py-2 border-b border-gray-100 mb-1">
                    <Checkbox 
                      id="select-all" 
                      checked={allMaskedSelected} 
                      indeterminate={someMaskedSelected} 
                      onChange={toggleAllDocs} 
                    />
                    <label htmlFor="select-all" className="text-xs font-medium text-gray-500 cursor-pointer">
                      Select all masked documents ({availableDocs.length})
                    </label>
                  </div>
                  
                  <div className="flex flex-col">
                    {filteredDocs.length === 0 ? (
                      <div className="text-sm text-gray-400 text-center py-6">No documents match your search</div>
                    ) : (
                      filteredDocs.map(doc => (
                        <DocumentRow
                          key={doc.id}
                          id={doc.id}
                          filename={doc.filename}
                          fileType={doc.fileType}
                          size={doc.size}
                          uploadedAt={doc.uploadedAt}
                          maskingStatus={doc.maskingStatus}
                          selected={selectedDocs.includes(doc.id)}
                          onToggle={toggleDoc}
                          disabled={doc.maskingStatus !== "masked"}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2 — FRAMEWORKS */}
            <div>
              <div 
                onClick={() => toggleSection('frameworks')}
                className={`flex justify-between items-center p-4 bg-white border border-gray-200 cursor-pointer hover:bg-gray-50 ${openSections.frameworks ? 'rounded-t-xl' : 'rounded-xl'}`}
              >
                <div className="flex items-center">
                  <span className="text-base font-semibold text-gray-900">Frameworks</span>
                  {selectedFrameworks.length > 0 && (
                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full ml-2">
                      {selectedFrameworks.length} selected
                    </span>
                  )}
                </div>
                {openSections.frameworks ? <ChevronUp className="text-gray-400 w-5 h-5" /> : <ChevronDown className="text-gray-400 w-5 h-5" />}
              </div>
              
              {openSections.frameworks && (
                <div className="bg-white border-x border-b border-gray-200 rounded-b-xl p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {MOCK_FRAMEWORKS.map(fw => (
                      <FrameworkCard
                        key={fw.id}
                        id={fw.id}
                        name={fw.name}
                        shortName={fw.shortName}
                        controlCount={fw.controlCount}
                        description={fw.description}
                        selected={selectedFrameworks.includes(fw.id)}
                        onToggle={toggleFramework}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3 — AI OPTIONS */}
            <div>
              <div 
                onClick={() => toggleSection('options')}
                className={`flex justify-between items-center p-4 bg-white border border-gray-200 cursor-pointer hover:bg-gray-50 ${openSections.options ? 'rounded-t-xl' : 'rounded-xl'}`}
              >
                <div className="flex items-center">
                  <span className="text-base font-semibold text-gray-900">AI Options</span>
                  {isDefaultsApplied ? (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full ml-2">Defaults applied</span>
                  ) : (
                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full ml-2">Customised</span>
                  )}
                </div>
                {openSections.options ? <ChevronUp className="text-gray-400 w-5 h-5" /> : <ChevronDown className="text-gray-400 w-5 h-5" />}
              </div>
              
              {openSections.options && (
                <div className="bg-white border-x border-b border-gray-200 rounded-b-xl p-4">
                  
                  {/* AI Features */}
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">AI Features</h4>
                  <Switch 
                    checked={options.adversarialDebate} 
                    onChange={v => setOptions(prev => ({...prev, adversarialDebate: v}))} 
                    label="Adversarial Debate" 
                    description="Two AI agents argue contested findings. Triggers on partial findings only (~15-20%)." 
                  />
                  <div className="mt-4">
                    <Switch 
                      checked={options.confidenceDecay} 
                      onChange={v => setOptions(prev => ({...prev, confidenceDecay: v}))} 
                      label="Confidence Decay" 
                      description="Recent evidence scores higher than old evidence using exponential decay (e^−λt)." 
                    />
                  </div>

                  <div className="border-t border-gray-100 my-4"></div>

                  {/* Confidence Threshold */}
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Confidence Threshold</h4>
                  <Slider 
                    value={options.confidenceThreshold} 
                    onChange={v => setOptions(prev => ({...prev, confidenceThreshold: v}))} 
                    label="Auto-escalate to human review below:" 
                    showValue={true} 
                  />
                  <p className="text-xs text-gray-400 mt-2">Findings below this score are flagged for manual review regardless of content.</p>

                  <div className="border-t border-gray-100 my-4"></div>

                  {/* Control Domains */}
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Control Domains</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CONTROL_DOMAINS.map(domain => (
                      <div 
                        key={domain.key} 
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleDomain(domain.key)}
                      >
                        <div className="mt-0.5">
                          <Checkbox 
                            id={`domain-${domain.key}`} 
                            checked={options.domains[domain.key]} 
                            onChange={() => toggleDomain(domain.key)} 
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-700">{domain.label}</span>
                          <span className="text-xs text-gray-400 mt-0.5 leading-relaxed">{domain.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Sticky Run Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-8">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Audit Summary</h2>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
                <span className="text-gray-600">Documents</span>
                <span className={selectedDocs.length > 0 ? "text-indigo-600 font-medium" : "text-gray-500"}>
                  {selectedDocs.length} selected
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
                <span className="text-gray-600">Frameworks</span>
                <span className="text-gray-900 font-medium">{selectedFrameworks.length} selected</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
                <span className="text-gray-600">AI options</span>
                <span className="text-gray-900 font-medium text-right max-w-[150px] truncate">
                  Adversarial {options.adversarialDebate ? "on" : "off"} · Decay {options.confidenceDecay ? "on" : "off"}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
                <span className="text-gray-600">Est. time</span>
                <span className="text-gray-900 font-medium">{estimatedTime}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
                <span className="text-gray-600">Est. cost</span>
                <span className="text-gray-900 font-medium">{estimatedCost}</span>
              </div>

              <div className="mt-4">
                {(selectedDocs.length === 0 || selectedFrameworks.length === 0) ? (
                  <button disabled className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed">
                    Run Audit
                  </button>
                ) : isSubmitting ? (
                  <button disabled className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white flex items-center justify-center gap-2 cursor-wait opacity-90">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Starting audit...
                  </button>
                ) : (
                  <button 
                    onClick={handleRunAudit}
                    className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Run Audit
                  </button>
                )}
              </div>

              <p className="mt-3 text-xs text-gray-400 text-center">
                Findings appear in real time as the audit runs.
              </p>

              {selectedDocs.length === 0 && (
                <p className="mt-3 text-xs text-red-500 text-center">Select at least one document to continue.</p>
              )}
              {selectedDocs.length > 0 && selectedFrameworks.length === 0 && (
                <p className="mt-3 text-xs text-red-500 text-center">Select at least one framework.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
