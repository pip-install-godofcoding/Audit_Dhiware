import React, { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { Card, CardContent } from "@/components/ui/Card"
import { LiveFeed, LogEntry } from "./components/LiveFeed"
import { getAuditStatus } from "../../api/client"

export function AuditorProgress() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auditId = searchParams.get("id") || "audit-default";

  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: "init-1", status: "success", message: "Audit Orchestrator initialized." },
    { id: "init-2", status: "success", message: "Loaded target documents and framework scopes." },
  ]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    let isMounted = true;

    const pollStatus = async () => {
      try {
        const status = await getAuditStatus(auditId);
        
        if (!isMounted) return;

        setProgress(status.progress);

        // Procedurally generate terminal logs based on the returned data
        setLogs(prev => {
          const newLogs = [...prev];
          
          // If there's a previous loading log, mark it as success and add a result
          const lastLogIndex = newLogs.findIndex(l => l.status === 'loading');
          if (lastLogIndex !== -1) {
            newLogs[lastLogIndex] = { ...newLogs[lastLogIndex], status: 'success' };
            
            // Randomly pick a badge for the finished control
            const badges: ('covered' | 'partial' | 'gap' | 'stale')[] = ['covered', 'partial', 'gap', 'stale'];
            const randomBadge = badges[Math.floor(Math.random() * badges.length)];
            
            newLogs.push({
              id: `result-${Date.now()}`,
              status: 'result',
              message: "Evaluation complete.",
              badgeType: randomBadge,
              indent: true
            });
          }

          if (status.progress >= 100) {
            newLogs.push({
              id: `done-${Date.now()}`,
              status: 'success',
              message: "Audit execution completed successfully."
            });
            return newLogs;
          }

          // Add new loading log for the current control
          newLogs.push({
            id: `eval-${Date.now()}`,
            status: 'loading',
            message: `Evaluating ${status.currentControl}...`
          });

          // Add some info logs to simulate retrieval
          const chunks = Math.floor(Math.random() * 5) + 1;
          newLogs.push({
            id: `info-${Date.now()}`,
            status: 'info',
            message: `Retrieved ${chunks} context chunks via RAG agent.`,
            indent: true
          });

          // Simulate adversarial debate randomly
          if (Math.random() > 0.7) {
            newLogs.push({
              id: `debate-${Date.now()}`,
              status: 'info',
              message: "Triggering Adversarial Debate for ambiguous evidence.",
              indent: true
            });
          }

          return newLogs.slice(-50); // keep only last 50 logs to prevent memory issues
        });

        if (status.progress >= 100) {
          clearInterval(intervalId);
          setTimeout(() => {
            navigate(`/auditor/findings?id=${auditId}`);
          }, 1500); // Wait a brief moment before redirecting
        }

      } catch (error) {
        console.error("Failed to poll audit status", error);
      }
    };

    // Initial poll
    pollStatus();

    // Setup interval
    intervalId = setInterval(pollStatus, 2000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [auditId, navigate]);

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit in Progress</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Agentic engines are actively evaluating documents against the selected frameworks.
        </p>
      </div>

      <Card className="border-indigo-100 dark:border-indigo-900/50">
        <CardContent className="pt-6">
          <ProgressBar 
            value={progress} 
            showLabel={true} 
            indicatorColor="bg-indigo-600" 
            className="h-3"
          />
        </CardContent>
      </Card>

      <LiveFeed logs={logs} />
    </div>
  )
}
