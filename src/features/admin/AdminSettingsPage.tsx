import React, { useState } from "react";
import {
  Settings,
  Building2,
  Upload,
  Server,
  ShieldCheck,
} from "lucide-react";

import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import  Checkbox  from "../../components/ui/Checkbox";

export default function AdminSettingsPage() {

  const [settings, setSettings] = useState({
    organization: "ControlCase AI Labs",
    deploymentMode: "on-prem",
    frameworks: {
      iso27001: true,
      soc2: true,
      pciDss: false,
      hipaa: false,
    },
  });
  
  const handleFrameworkToggle = (key: string) => {
    setSettings((prev) => ({
      ...prev,
      frameworks: {
        ...prev.frameworks,
        [key]: !prev.frameworks[key as keyof typeof prev.frameworks],
      },
    }));
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="mb-6">

          <h1 className="text-2xl font-bold text-gray-900">
            Tenant Settings
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Configure organization, deployment, and audit framework settings.
          </p>

        </div>

        {/* ORGANIZATION SETTINGS */}
        <Card className="bg-white rounded-2xl p-6 mb-6">

          <div className="flex items-center gap-3 mb-5">

            <div className="bg-indigo-100 p-3 rounded-full">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>

            <div>

              <h2 className="font-semibold text-gray-900">
                Organization Details
              </h2>

              <p className="text-sm text-gray-500">
                Configure tenant branding and organization information.
              </p>

            </div>

          </div>

          <div className="space-y-5">

            <div>

              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Organization Name
              </label>

              <Input
                value={settings.organization}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings({
                    ...settings,
                    organization: e.target.value,
                  })
                }
                className="bg-white"
              />

            </div>

            <div>

              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Organization Logo
              </label>

              <div className="border border-dashed border-gray-300 rounded-xl p-6 bg-gray-50 text-center">

                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />

                <p className="text-sm text-gray-500">
                  Upload organization logo
                </p>

                <Button
                  variant="outline"
                  className="mt-4 bg-white"
                >
                  Choose File
                </Button>

              </div>

            </div>

          </div>

        </Card>

        {/* DEPLOYMENT SETTINGS */}
        <Card className="bg-white rounded-2xl p-6 mb-6">

          <div className="flex items-center gap-3 mb-5">

            <div className="bg-indigo-100 p-3 rounded-full">
              <Server className="w-5 h-5 text-indigo-600" />
            </div>

            <div>

              <h2 className="font-semibold text-gray-900">
                Deployment Mode
              </h2>

              <p className="text-sm text-gray-500">
                Configure infrastructure deployment strategy.
              </p>

            </div>

          </div>

          <div className="grid md:grid-cols-2 gap-4">

            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  deploymentMode: "cloud",
                })
              }
              className={`border rounded-2xl p-5 text-left transition-all ${
                settings.deploymentMode === "cloud"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 bg-white"
              }`}
            >

              <h3 className="font-medium text-gray-900">
                Cloud Deployment
              </h3>

              <p className="text-sm text-gray-500 mt-2">
                Hosted infrastructure with managed scaling.
              </p>

            </button>

            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  deploymentMode: "on-prem",
                })
              }
              className={`border rounded-2xl p-5 text-left transition-all ${
                settings.deploymentMode === "on-prem"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 bg-white"
              }`}
            >

              <h3 className="font-medium text-gray-900">
                On-Prem Deployment
              </h3>

              <p className="text-sm text-gray-500 mt-2">
                Fully isolated deployment inside enterprise environment.
              </p>

            </button>

          </div>

        </Card>

        {/* FRAMEWORK SETTINGS */}
        <Card className="bg-white rounded-2xl p-6 mb-6">

          <div className="flex items-center gap-3 mb-5">

            <div className="bg-indigo-100 p-3 rounded-full">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            </div>

            <div>

              <h2 className="font-semibold text-gray-900">
                Enabled Frameworks
              </h2>

              <p className="text-sm text-gray-500">
                Select supported compliance and audit frameworks.
              </p>

            </div>

          </div>

          <div className="space-y-4">

            <div className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3">

              <div>

                <h3 className="font-medium text-gray-900">
                  ISO 27001
                </h3>

                <p className="text-sm text-gray-500">
                  Information Security Management
                </p>

              </div>

              <Checkbox
                id="iso27001"
                checked={settings.frameworks.iso27001}
                onChange={() => handleFrameworkToggle("iso27001")}
              />

            </div>

            <div className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3">

              <div>

                <h3 className="font-medium text-gray-900">
                  SOC2
                </h3>

                <p className="text-sm text-gray-500">
                  Security & Trust Services Criteria
                </p>

              </div>

              <Checkbox
                id="soc2"
                checked={settings.frameworks.soc2}
                onChange={() => handleFrameworkToggle("soc2")}
              />

            </div>

            <div className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3">

              <div>

                <h3 className="font-medium text-gray-900">
                  PCI DSS
                </h3>

                <p className="text-sm text-gray-500">
                  Payment Card Industry Standard
                </p>

              </div>

              <Checkbox
                id="pciDss"
                checked={settings.frameworks.pciDss}
                onChange={() => handleFrameworkToggle("pciDss")}
              />

            </div>

            <div className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3">

              <div>

                <h3 className="font-medium text-gray-900">
                  HIPAA
                </h3>

                <p className="text-sm text-gray-500">
                  Healthcare Data Protection
                </p>

              </div>

              <Checkbox
                id="hipaa"
                checked={settings.frameworks.hipaa}
                onChange={() => handleFrameworkToggle("hipaa")}
              />

            </div>

          </div>

        </Card>

        {/* SAVE BUTTON */}
        <div className="flex justify-end">

          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">
            Save Settings
          </Button>

        </div>

      </div>
    </div>
  );
}