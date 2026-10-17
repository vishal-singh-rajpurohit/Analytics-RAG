"use client";

import React, { useRef, useEffect } from "react";
import { 
  Bot, 
  Sparkles, 
  Loader2, 
  User as UserIcon,
  Maximize2, 
  Download,
  Terminal,
  MessageSquare,
  HelpCircle,
  ArrowRight
} from "lucide-react";
import { AgentSteps, AgentStep } from "@/components/workspace/AgentSteps";
import { CodeViewer } from "@/components/workspace/CodeViewer";
import { getChartUrl } from "@/lib/apiClient";

interface QueryResult {
  summary: string;
  code?: string | null;
  chart_urls?: string[];
  agent_steps?: AgentStep[];
  result_text?: string | null;
}

export interface DynamicResponseItem {
  id: string;
  query: string;
  timestamp: string;
  result: QueryResult | null;
}

interface AiAnalystChatViewProps {
  responses: DynamicResponseItem[];
  isLoading: boolean;
  userInitial?: string;
  userName?: string;
  datasetName: string;
  onSendSuggestedPrompt?: (prompt: string) => void;
  onExpandChart?: (chartUrl: string) => void;
}

export const AiAnalystChatView: React.FC<AiAnalystChatViewProps> = ({
  responses,
  isLoading,
  userInitial = "U",
  userName = "User",
  datasetName,
  onSendSuggestedPrompt,
  onExpandChart
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [responses, isLoading]);

  const defaultPrompts = [
    {
      title: "Outlier Analysis",
      desc: "Detect distribution anomalies using IQR bounds",
      query: "Analyze statistical outliers across all continuous columns and explain extreme values"
    },
    {
      title: "Category Breakdown",
      desc: "Group records and calculate averages",
      query: "Group dataset by categorical features, compute mean values, and summarize trends"
    },
    {
      title: "Correlation Heatmap",
      desc: "Plot relationships between continuous columns",
      query: "Compute the correlation matrix for all continuous variables and generate a heatmap chart"
    },
    {
      title: "Executive Summary",
      desc: "Synthesize key business takeaways",
      query: "Generate an executive summary of this dataset highlighting key patterns and recommendations"
    }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Empty state when no chat messages yet */}
      {responses.length === 0 && (
        <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 text-center space-y-6 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
            <Bot className="w-7 h-7" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-lg font-bold text-[#19213D] dark:text-white">
              AI Analyst Ready for {datasetName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ask natural language questions. The LangGraph agent pipeline generates secure Python code, 
              executes aggregations in a sandbox, and produces high-resolution Matplotlib visualizations.
            </p>
          </div>

          {/* Quick Prompts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto pt-2 text-left">
            {defaultPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSendSuggestedPrompt?.(p.query)}
                className="p-3.5 rounded-xl border border-[#E5EBF2] dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 bg-[#F5F7FB] dark:bg-zinc-950/60 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 text-left transition-all group shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#19213D] dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    {p.title}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform group-hover:text-emerald-500" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {p.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Message History Stream */}
      {responses.map((item) => (
        <div key={item.id} className="space-y-4 animate-in fade-in">
          {/* User Message Bubble */}
          <div className="flex items-start justify-end gap-3 pl-8">
            <div className="flex flex-col items-end space-y-1 max-w-2xl">
              <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl rounded-tr-xs text-xs sm:text-sm font-medium shadow-sm leading-relaxed">
                {item.query}
              </div>
              <span className="text-[10px] text-slate-400 font-mono pr-1">
                {item.timestamp}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-xs font-extrabold shrink-0 shadow-sm shadow-emerald-500/20 mt-0.5">
              {userInitial}
            </div>
          </div>

          {/* AI Response Card */}
          <div className="flex items-start gap-3 pr-8">
            <div className="w-8 h-8 rounded-xl bg-[#19213D] dark:bg-zinc-800 text-emerald-400 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Bot className="w-4 h-4" />
            </div>

            <div className="flex-1 max-w-3xl space-y-3">
              {item.result ? (
                <div className="bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                  {/* Multi-Agent Steps Timeline */}
                  {item.result.agent_steps && item.result.agent_steps.length > 0 && (
                    <AgentSteps steps={item.result.agent_steps} />
                  )}

                  {/* Written Analytical Summary */}
                  <div className="text-xs sm:text-sm text-[#19213D] dark:text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                    {item.result.summary}
                  </div>

                  {/* Generated Chart Attachments */}
                  {item.result.chart_urls && item.result.chart_urls.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Generated Visualizations</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {item.result.chart_urls.map((chartUrl, cIdx) => {
                          const fullUrl = getChartUrl(chartUrl);
                          return (
                            <div 
                              key={cIdx} 
                              className="group relative border border-[#E5EBF2] dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-zinc-950 p-2"
                            >
                              <img 
                                src={fullUrl} 
                                alt={`Chart ${cIdx + 1}`} 
                                className="w-full h-auto max-h-56 object-contain rounded-lg"
                              />
                              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-zinc-900/95 p-1 rounded-lg border border-[#E5EBF2] dark:border-zinc-700 shadow-sm">
                                <button
                                  onClick={() => onExpandChart?.(fullUrl)}
                                  className="p-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600"
                                  title="Expand"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                                <a
                                  href={fullUrl}
                                  download={`chart_${cIdx + 1}.png`}
                                  className="p-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600"
                                  title="Download"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sandboxed Python Code Snippet */}
                  {item.result.code && (
                    <div className="pt-2">
                      <CodeViewer 
                        code={item.result.code} 
                        title="The Analyst: Executed Python &amp; Pandas Code" 
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 shadow-xs flex items-center gap-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Agent pipeline executing in secure sandbox...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Loading state indicator */}
      {isLoading && responses[responses.length - 1]?.result !== null && (
        <div className="flex items-center gap-3 pr-8 animate-in fade-in">
          <div className="w-8 h-8 rounded-xl bg-[#19213D] dark:bg-zinc-800 text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <span>Analyzing query, compiling Python execution graph, and rendering charts...</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
};
