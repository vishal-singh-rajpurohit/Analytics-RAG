"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Lightbulb } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { AgentSteps, AgentStep } from "./AgentSteps";
import { CodeViewer } from "./CodeViewer";
import { ChartViewer } from "./ChartViewer";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  code?: string | null;
  chartUrls?: string[];
  agentSteps?: AgentStep[];
  timestamp: string;
}

interface AgentChatProps {
  analysisId: string | null;
  datasetName: string | null;
}

export const AgentChat: React.FC<AgentChatProps> = ({ analysisId, datasetName }) => {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Welcome to the **Multi-Agent Data Analysis Workspace**! Upload a CSV or select an active dataset to get started. You can ask for aggregations, statistical summaries, trends, anomaly inspections, or charts.",
      timestamp: "Just now",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || !analysisId || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoading(true);

    try {
      const response = await apiClient.post("/analysis/query", {
        analysis_id: analysisId,
        query: textToSend,
      });

      const data = response.data;
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.summary,
        code: data.code,
        chartUrls: data.chart_urls,
        agentSteps: data.agent_steps,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("Query error:", err);
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `\u26a0\ufe0f **Error:** ${
          err.response?.data?.detail || "Failed to process query through the multi-agent workflow."
        }`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    "Statistical summary of all columns",
    "Show the distribution and top 10 categories",
    "Identify any anomalies or outliers",
    "Plot a trend chart of numerical metrics",
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[#E5EBF2] dark:border-zinc-800 bg-[#F5F7FB] dark:bg-zinc-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg text-emerald-600 dark:text-emerald-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[#19213D] dark:text-zinc-100">
              Multi-Agent Orchestrator
            </h3>
            <p className="text-[11px] text-zinc-500">
              {datasetName ? `Active dataset: ${datasetName}` : "No dataset loaded"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>LangGraph Connected</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[520px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[85%] space-y-3 ${
                msg.role === "user"
                  ? "bg-emerald-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 text-xs shadow-sm"
                  : "bg-white dark:bg-zinc-800/50 border border-[#E5EBF2] dark:border-zinc-800 rounded-2xl rounded-tl-none p-4 text-xs text-zinc-800 dark:text-zinc-200 shadow-sm"
              }`}
            >
              {/* Agent execution timeline if available */}
              {msg.agentSteps && msg.agentSteps.length > 0 && (
                <AgentSteps steps={msg.agentSteps} />
              )}

              {/* Main message text */}
              <div className="whitespace-pre-wrap leading-relaxed font-sans">
                {msg.content}
              </div>

              {/* Code viewer accordion */}
              {msg.code && (
                <CodeViewer code={msg.code} title="The Analyst: Pandas Source Code" />
              )}

              {/* Rendered Matplotlib chart gallery */}
              {msg.chartUrls && msg.chartUrls.length > 0 && (
                <ChartViewer chartUrls={msg.chartUrls} />
              )}

              <div
                className={`text-[10px] ${
                  msg.role === "user" ? "text-emerald-100 text-right" : "text-zinc-400"
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-emerald-600 flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white dark:bg-zinc-800/60 border border-[#E5EBF2] dark:border-zinc-800 rounded-2xl rounded-tl-none p-4 text-xs space-y-2 text-zinc-600 dark:text-zinc-300 shadow-sm">
              <div className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>LangGraph Workflow In Progress...</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Router assessing intent &rarr; The Analyst generating code &rarr; Sandbox validating execution &rarr; The Visualizer preparing charts
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      {analysisId && !isLoading && (
        <div className="px-4 py-2 border-t border-[#E5EBF2] dark:border-zinc-800 flex items-center gap-2 overflow-x-auto bg-[#F5F7FB] dark:bg-zinc-950/20">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-[11px] font-semibold text-zinc-500 shrink-0">Try:</span>
          {samplePrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSend(p)}
              className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 border border-[#E5EBF2] dark:border-zinc-700 text-[#19213D] dark:text-zinc-300 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Query Input Footer */}
      <div className="p-3 border-t border-[#E5EBF2] dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={
              analysisId
                ? "Ask a question (e.g. 'Show me the sales trend for Q3', 'Top 5 products')..."
                : "Please upload a CSV dataset first to ask questions..."
            }
            disabled={!analysisId || isLoading}
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="flex-1 text-xs px-3.5 py-2.5 rounded-lg border border-[#E5EBF2] dark:border-zinc-700 bg-[#F5F7FB] dark:bg-zinc-800 text-[#19213D] dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!analysisId || !inputQuery.trim() || isLoading}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-emerald-500/20"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};
