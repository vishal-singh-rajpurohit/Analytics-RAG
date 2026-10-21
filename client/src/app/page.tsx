"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Sparkles,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Code2,
  BarChart3
} from "lucide-react";
import { Sidebar } from "@/components/syntropic/Sidebar";
import { TopHeader } from "@/components/syntropic/TopHeader";
import { SubHeader, DashboardTab } from "@/components/syntropic/SubHeader";
import { KpiCards } from "@/components/syntropic/KpiCards";
import { VisualizationsSection } from "@/components/syntropic/VisualizationsSection";
import { DataPreview } from "@/components/workspace/DataPreview";
import { FloatingInput } from "@/components/syntropic/FloatingInput";
import { UploadModal } from "@/components/syntropic/UploadModal";
import { DashboardHero } from "@/components/syntropic/DashboardHero";
import { DataQualitySection } from "@/components/syntropic/DataQualitySection";
import { AiAnalystChatView, DynamicResponseItem } from "@/components/syntropic/AiAnalystChatView";
import { UploadSuccessData } from "@/components/workspace/FileUpload";
import { apiClient } from "@/lib/apiClient";

interface DatasetItem {
  analysis_id: string;
  filename: string;
  total_rows: number;
  total_columns: number;
  health_score: number;
  created_at?: string;
}

interface ColumnDef {
  name: string;
  dtype: string;
}

interface CleaningReport {
  health_score?: number;
  total_rows?: number;
  total_columns?: number;
  total_missing_cells?: number;
  duplicate_rows?: number;
  anomalies?: Array<{ column: string; description: string; count?: number }>;
  recommendations?: string[];
  columns?: Array<{ name: string; dtype: string; mean?: number; min?: number; max?: number }>;
}

export default function SyntropicAnalyticsPage() {
  const { data: session, status } = useSession();

  const [activeDataset, setActiveDataset] = useState<string>("");
  const [analysisId, setAnalysisId] = useState<string>("");
  const [activeModel, setActiveModel] = useState<string>("Google Gemini (1.5 Flash)");
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshSidebar, setRefreshSidebar] = useState<number>(0);

  // Real dataset state
  const [cleaningReport, setCleaningReport] = useState<CleaningReport | null>(null);
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [sampleRows, setSampleRows] = useState<Array<Record<string, unknown>>>([]);
  const [totalRows, setTotalRows] = useState<number>(0);

  // Dynamic user query responses
  const [dynamicResponses, setDynamicResponses] = useState<DynamicResponseItem[]>([]);
  const [generatedCharts, setGeneratedCharts] = useState<string[]>([]);
  const [fullscreenChartUrl, setFullscreenChartUrl] = useState<string | null>(null);

  const justUploadedIdRef = React.useRef<string | null>(null);

  // Load dataset metadata when analysisId changes
  useEffect(() => {
    if (!analysisId || status !== "authenticated" || !session) return;

    // Skip redundant fetch if state was already populated by handleUploadSuccess
    if (justUploadedIdRef.current === analysisId) {
      justUploadedIdRef.current = null;
      return;
    }

    const token = (session as { accessToken?: string })?.accessToken ||
      (session?.user as { accessToken?: string })?.accessToken;
    if (!token) return;

    const loadDatasetData = async () => {
      try {
        const authConfig = { headers: { Authorization: `Bearer ${token}` } };
        const [metaResult, previewResult] = await Promise.allSettled([
          apiClient.get(`/analysis/${analysisId}`, authConfig),
          apiClient.get(`/analysis/${analysisId}/preview?limit=50`, authConfig)
        ]);

        if (metaResult.status === "fulfilled" && metaResult.value.data) {
          const metaData = metaResult.value.data;
          setCleaningReport(metaData.cleaning_report);
          setTotalRows(metaData.total_rows || 0);

          // Restore persistent chat history
          if (metaData.chat_history && Array.isArray(metaData.chat_history)) {
            const restored: DynamicResponseItem[] = [];
            const history = metaData.chat_history;
            for (let i = 0; i < history.length; i++) {
              const item = history[i];
              if (item.role === "user") {
                const nextItem = history[i + 1]?.role === "assistant" ? history[i + 1] : null;
                restored.push({
                  id: `query-restored-${i}`,
                  query: item.content,
                  timestamp: item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                  result: nextItem ? {
                    summary: nextItem.content,
                    code: nextItem.code,
                    chart_urls: nextItem.chart_urls || [],
                    agent_steps: nextItem.agent_steps || [],
                    result_text: nextItem.result_text
                  } : null
                });
                if (nextItem) i++;
              }
            }
            setDynamicResponses(restored);
            const charts = restored.flatMap((r) => r.result?.chart_urls || []);
            setGeneratedCharts(charts);
          } else {
            setDynamicResponses([]);
            setGeneratedCharts([]);
          }
        }

        if (previewResult.status === "fulfilled" && previewResult.value.data) {
          setColumns(previewResult.value.data.columns || []);
          setSampleRows(previewResult.value.data.rows || []);
        }
      } catch (err) {
        console.warn("Notice: Dataset metadata refresh encountered an issue:", err);
      }
    };

    loadDatasetData();
  }, [analysisId, status, session]);

  const handleSelectDataset = (dataset: DatasetItem) => {
    setActiveDataset(dataset.filename);
    setAnalysisId(dataset.analysis_id);
    setActiveTab("overview");
  };

  const handleNewChat = () => {
    setActiveDataset("");
    setAnalysisId("");
    setCleaningReport(null);
    setColumns([]);
    setSampleRows([]);
    setTotalRows(0);
    setDynamicResponses([]);
    setGeneratedCharts([]);
    setIsUploadOpen(true);
  };

  const handleDeleteAnalysis = async (idToDelete: string) => {
    if (!window.confirm("Are you sure you want to delete this analysis chat and its dataset?")) return;
    try {
      await apiClient.delete(`/analysis/${idToDelete}`);
      if (analysisId === idToDelete) {
        setActiveDataset("");
        setAnalysisId("");
        setCleaningReport(null);
        setColumns([]);
        setSampleRows([]);
        setTotalRows(0);
        setDynamicResponses([]);
        setGeneratedCharts([]);
        setActiveTab("overview");
      }
      setRefreshSidebar((prev) => prev + 1);
    } catch (err: unknown) {
      console.error("Failed to delete analysis:", err);
      const errDetail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert(errDetail || "Failed to delete analysis chat.");
    }
  };

  const handleUploadSuccess = (data: UploadSuccessData) => {
    justUploadedIdRef.current = data.analysis_id;
    setActiveDataset(data.filename);
    setAnalysisId(data.analysis_id);
    setCleaningReport(data.cleaning_report as CleaningReport || null);
    setColumns(data.columns || []);
    setSampleRows(data.sample_preview || []);
    setTotalRows(data.total_rows || 0);
    setDynamicResponses([]);
    setGeneratedCharts([]);
    setActiveTab("overview");
    setRefreshSidebar((prev) => prev + 1);
  };

  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim() || isLoading || !analysisId) return;

    // Switch to chat view when a query is submitted
    setActiveTab("chat");
    setIsLoading(true);

    const newQueryItem: DynamicResponseItem = {
      id: `query-${Date.now()}`,
      query: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      result: null,
    };

    setDynamicResponses((prev) => [...prev, newQueryItem]);

    try {
      const response = await apiClient.post("/analysis/query", {
        analysis_id: analysisId,
        query: queryText,
      });

      const resData = response.data;
      if (resData.chart_urls && resData.chart_urls.length > 0) {
        setGeneratedCharts((prev) => [...prev, ...resData.chart_urls]);
      }

      setDynamicResponses((prev) =>
        prev.map((item) =>
          item.id === newQueryItem.id ? { ...item, result: resData } : item
        )
      );
    } catch (err: unknown) {
      console.error("Query failed:", err);
      const errDetail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setDynamicResponses((prev) =>
        prev.map((item) =>
          item.id === newQueryItem.id
            ? {
              ...item,
              result: {
                summary: `### ⚠️ Agent Execution Notice\n${errDetail || "Could not complete query through agent pipeline."}`,
              },
            }
            : item
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!sampleRows.length) return;
    const header = columns.map(c => c.name).join(",");
    const rows = sampleRows.map(r => columns.map(c => `"${String(r[c.name] ?? "")}"`).join(",")).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(header + "\n" + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `${activeDataset.replace(".csv", "") || "dataset"}_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Loading State
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F7FB] dark:bg-zinc-950 text-slate-600 dark:text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <span className="text-xs font-semibold tracking-wide text-[#19213D] dark:text-slate-300">
            Initializing Multi-Agent Workspace...
          </span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Gate Screen (Executive Landing)
  if (status === "unauthenticated" || !session) {
    return (
      <main className="min-h-screen bg-[#F5F7FB] dark:bg-zinc-950 flex flex-col justify-center items-center px-4 py-12 select-none">
        <div className="w-full max-w-lg space-y-8 text-center">
          {/* Brand Icon */}
          <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-xl shadow-rose-500/20">
            <Sparkles className="w-8 h-8" />
          </div>

          {/* Heading */}
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <span>Syntropic Analytics OS</span>
            </div>
            <h1 className="text-3xl font-black text-[#19213D] dark:text-white tracking-tight">
              Multi-Agent Data Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              Sign in to access automated CSV diagnostics, sandboxed Python code execution, and high-definition chart synthesis.
            </p>
          </div>

          {/* Value Props */}
          <div className="bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 rounded-3xl p-6 text-left shadow-lg space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-[#19213D] dark:text-white">Agent 1: The Cleaner</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Automated null value audit, duplicate row detection, and IQR statistical outlier scanner.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-[#19213D] dark:text-white">Agent 2: The Analyst</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Natural language to sandboxed Python/Pandas execution with AST security isolation.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-[#19213D] dark:text-white">Agent 3: The Visualizer</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  High-resolution Matplotlib visualizations and cohort distributions generated on demand.
                </div>
              </div>
            </div>
          </div>

          {/* Action CTA */}
          <div className="space-y-3">
            <Link
              href="/auth/signup"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01]"
            >
              <span>Sign In with Google or Email</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="text-[11px] text-slate-400">
              Zero configuration required &bull; 1 CSV per analysis session
            </div>
          </div>
        </div>
      </main>
    );
  }

  const userInitial = (session?.user?.name || session?.user?.email || "U").charAt(0).toUpperCase();

  // 3. Authenticated Workspace
  return (
    <div className="flex h-screen bg-[#F5F7FB] dark:bg-zinc-950 text-[#19213D] dark:text-slate-100 font-sans overflow-hidden">
      {/* 1. Left Sidebar */}
      <Sidebar
        activeDatasetId={analysisId}
        onSelectDataset={handleSelectDataset}
        onOpenUpload={handleNewChat}
        onDeleteDataset={handleDeleteAnalysis}
        refreshTrigger={refreshSidebar}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* 2. Top Header Bar */}
        <TopHeader
          currentModel={activeModel}
          onModelChange={setActiveModel}
          onExport={handleDownloadCsv}
        />

        {/* 3. Session Sub-Header Bar (Tabbed Navigation) */}
        {activeDataset ? (
          <SubHeader
            title={`Analysis: ${activeDataset.replace(".csv", "")}`}
            datasetName={activeDataset}
            rowCount={totalRows}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            chatCount={dynamicResponses.length}
            chartsCount={generatedCharts.length}
            anomaliesCount={cleaningReport?.anomalies?.length ?? 0}
            onNewChat={handleNewChat}
            onDelete={() => handleDeleteAnalysis(analysisId)}
            onExport={handleDownloadCsv}
          />
        ) : null}

        {/* 4. Scrollable Dynamic Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto w-full">
          {!activeDataset ? (
            /* Dashboard Hero Onboarding state when no dataset uploaded yet */
            <DashboardHero
              onOpenUpload={handleNewChat}
              onUploadSuccess={handleUploadSuccess}
            />
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6 animate-in fade-in">
                  {/* Status Headline Banner */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono">
                          Ready for Inquiry
                        </span>
                        <span className="text-slate-400">&bull;</span>
                        <span className="text-xs text-slate-500 font-medium">{activeModel}</span>
                      </div>
                      <h1 className="text-xl sm:text-2xl font-black text-[#19213D] dark:text-white tracking-tight">
                        {activeDataset.replace(".csv", "")}
                      </h1>
                      <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                        Data Health Score is <strong className="text-[#19213D] dark:text-white">{cleaningReport?.health_score ?? 100}/100</strong> across{" "}
                        <strong>{totalRows.toLocaleString()} observations</strong>. Ask natural language questions below or use the AI Analyst tab to run queries.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setActiveTab("chat")}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs shadow-emerald-500/20 transition-colors flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Chat with Data</span>
                      </button>
                    </div>
                  </div>

                  {/* KPI Cards */}
                  <KpiCards cleaningReport={cleaningReport} />

                  {/* Visualizations & Categorical Breakdown Preview */}
                  <VisualizationsSection
                    dynamicChartUrls={generatedCharts}
                    columns={columns}
                    sampleRows={sampleRows}
                    onAskChart={handleSendQuery}
                  />

                  {/* Data Preview Table */}
                  <DataPreview
                    columns={columns}
                    sampleData={sampleRows}
                    totalRows={totalRows}
                    datasetName={activeDataset}
                    onDownloadCsv={handleDownloadCsv}
                  />
                </div>
              )}

              {/* TAB 2: AI ANALYST (CHAT VIEW) */}
              {activeTab === "chat" && (
                <div className="space-y-6 animate-in fade-in">
                  <AiAnalystChatView
                    responses={dynamicResponses}
                    isLoading={isLoading}
                    userInitial={userInitial}
                    userName={session?.user?.name || "You"}
                    datasetName={activeDataset}
                    onSendSuggestedPrompt={handleSendQuery}
                    onExpandChart={(url) => setFullscreenChartUrl(url)}
                  />
                </div>
              )}

              {/* TAB 3: DATA QUALITY AUDIT */}
              {activeTab === "quality" && (
                <div className="space-y-6 animate-in fade-in">
                  <DataQualitySection
                    cleaningReport={cleaningReport}
                    datasetName={activeDataset}
                  />
                </div>
              )}

              {/* TAB 4: VISUALIZATIONS */}
              {activeTab === "visuals" && (
                <div className="space-y-6 animate-in fade-in">
                  <VisualizationsSection
                    dynamicChartUrls={generatedCharts}
                    columns={columns}
                    sampleRows={sampleRows}
                    onAskChart={handleSendQuery}
                  />
                </div>
              )}

              {/* TAB 5: DATA EXPLORER */}
              {activeTab === "explorer" && (
                <div className="space-y-6 animate-in fade-in">
                  <DataPreview
                    columns={columns}
                    sampleData={sampleRows}
                    totalRows={totalRows}
                    datasetName={activeDataset}
                    onDownloadCsv={handleDownloadCsv}
                  />
                </div>
              )}
            </>
          )}

          {/* Bottom spacing for floating input */}
          <div className="h-32"></div>
        </div>

        {/* 5. Floating Bottom Input Bar (Available on all tabs for quick inquiry) */}
        {activeDataset ? (
          <div className="fixed bottom-4 left-0 sm:left-64 lg:left-72 right-0 px-4 z-40 pointer-events-none">
            <div className="pointer-events-auto">
              <FloatingInput
                targetFileName={activeDataset}
                onSendQuery={handleSendQuery}
                isLoading={isLoading}
                onNewChat={handleNewChat}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* 6. Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
