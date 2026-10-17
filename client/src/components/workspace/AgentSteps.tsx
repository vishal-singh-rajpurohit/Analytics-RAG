"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Bot, Sparkles, Terminal, BarChart3, Wrench } from "lucide-react";

export interface AgentStep {
  agent: string;
  status: "completed" | "failed" | "running";
  summary?: string;
  action?: string;
  timestamp: string;
  code_snippet?: string;
  chart_url?: string;
  error?: string;
  stdout?: string;
  details?: string;
}

interface AgentStepsProps {
  steps: AgentStep[];
}

export const AgentSteps: React.FC<AgentStepsProps> = ({ steps }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!steps || steps.length === 0) return null;

  const getAgentIcon = (agent: string) => {
    switch (agent) {
      case "Cleaner":
        return <Sparkles className="w-3.5 h-3.5 text-emerald-500" />;
      case "Analyst":
        return <Bot className="w-3.5 h-3.5 text-emerald-600" />;
      case "Sandbox":
        return <Terminal className="w-3.5 h-3.5 text-cyan-500" />;
      case "Fixer":
        return <Wrench className="w-3.5 h-3.5 text-amber-500" />;
      case "Visualizer":
        return <BarChart3 className="w-3.5 h-3.5 text-teal-500" />;
      default:
        return <Bot className="w-3.5 h-3.5 text-zinc-500" />;
    }
  };

  const getAgentBadgeColor = (agent: string) => {
    switch (agent) {
      case "Cleaner":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800";
      case "Analyst":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800";
      case "Sandbox":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:border-cyan-800";
      case "Fixer":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800";
      case "Visualizer":
        return "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:border-teal-800";
      default:
        return "bg-zinc-50 text-zinc-700 border-zinc-200";
    }
  };

  return (
    <div className="w-full bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-2 text-xs">
      <div className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Bot className="w-4 h-4 text-zinc-500" />
          <span>Multi-Agent Execution Timeline</span>
        </span>
        <span className="text-[11px] font-normal text-zinc-400">
          {steps.length} {steps.length === 1 ? "agent action" : "agent actions"}
        </span>
      </div>

      <div className="space-y-1.5">
        {steps.map((step, idx) => {
          const isExpanded = expandedIndex === idx;
          const hasDetails = Boolean(step.code_snippet || step.stdout || step.error);

          return (
            <div
              key={idx}
              className="border border-zinc-200/80 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900 overflow-hidden transition-all"
            >
              <div
                onClick={() => hasDetails && setExpandedIndex(isExpanded ? null : idx)}
                className={`p-2 flex items-center justify-between gap-2 ${
                  hasDetails ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40" : ""
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold flex items-center gap-1 shrink-0 ${getAgentBadgeColor(step.agent)}`}>
                    {getAgentIcon(step.agent)}
                    <span>{step.agent}</span>
                  </span>
                  <span className="truncate text-zinc-600 dark:text-zinc-300 font-medium">
                    {step.summary}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {step.status === "completed" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                  )}
                  {hasDetails && (
                    <span className="text-zinc-400">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                  )}
                </div>
              </div>

              {isExpanded && hasDetails && (
                <div className="p-2.5 pt-0 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2">
                  {step.code_snippet && (
                    <div>
                      <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                        Generated Python Script
                      </div>
                      <pre className="p-2 bg-zinc-900 text-zinc-100 rounded text-[11px] font-mono overflow-x-auto">
                        {step.code_snippet}
                      </pre>
                    </div>
                  )}

                  {step.stdout && (
                    <div>
                      <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                        Execution Output (stdout)
                      </div>
                      <pre className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded text-[11px] font-mono overflow-x-auto">
                        {step.stdout}
                      </pre>
                    </div>
                  )}

                  {step.error && (
                    <div>
                      <div className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1">
                        Traceback Error
                      </div>
                      <pre className="p-2 bg-red-950/20 text-red-400 border border-red-900/40 rounded text-[11px] font-mono overflow-x-auto">
                        {step.error}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
