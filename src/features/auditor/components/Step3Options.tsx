import React from "react"
import Switch from "@/components/ui/Switch"
import Slider from "@/components/ui/Slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"

export interface AuditOptions {
  adversarialDebate: boolean;
  confidenceDecay: boolean;
  confidenceThreshold: number;
}

interface Step3OptionsProps {
  options: AuditOptions;
  onOptionsChange: (options: AuditOptions) => void;
}

export function Step3Options({ options, onOptionsChange }: Step3OptionsProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Configure Options</h2>
        <p className="text-sm text-muted-foreground">
          Fine-tune the AI agent behaviors for this audit.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Features</CardTitle>
            <CardDescription>Enable advanced reasoning capabilities.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Switch 
              label="Adversarial Debate"
              description="Deploy a Prosecutor and Defender agent to debate ambiguous controls."
              checked={options.adversarialDebate}
              onChange={(checked) => onOptionsChange({ ...options, adversarialDebate: checked })}
            />
            <Switch 
              label="Confidence Decay"
              description="Lower the confidence score for evidence found in older documents."
              checked={options.confidenceDecay}
              onChange={(checked) => onOptionsChange({ ...options, confidenceDecay: checked })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Thresholds</CardTitle>
            <CardDescription>Set the minimum confidence required.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Slider 
              label="Confidence Threshold"
              value={options.confidenceThreshold}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => onOptionsChange({ ...options, confidenceThreshold: value })}
            />
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
              Findings with a confidence score below this threshold will automatically be flagged as "Pending Review" regardless of their classification.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
