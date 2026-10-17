"use client";

import React, { useState } from "react";
import { 
  Download, 
  Maximize2, 
  X, 
  Image as ImageIcon, 
  BarChart3, 
  Sparkles,
  Layers,
  ZoomIn
} from "lucide-react";
import { getChartUrl } from "@/lib/apiClient";

interface VisualizationsSectionProps {
  dynamicChartUrls?: string[];
  columns?: Array<{ name: string; dtype: string }>;
  sampleRows?: Array<Record<string, unknown>>;
  onAskChart?: (prompt: string) => void;
}

export const VisualizationsSection: React.FC<VisualizationsSectionProps> = ({ 
  dynamicChartUrls = [],
  columns = [],
  sampleRows = [],
  onAskChart
}) => {
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);

  // Derive real categorical breakdown from dataset sample rows
  const catCol = columns.find(c => 
    c.dtype.includes("object") || 
    c.dtype.includes("str") || 
    c.name.toLowerCase().includes("category") || 
    c.name.toLowerCase().includes("tier") || 
    c.name.toLowerCase().includes("status") ||
    c.name.toLowerCase().includes("type")
  );

  const catCounts: Record<string, number> = {};
  if (catCol && sampleRows.length > 0) {
    sampleRows.forEach(r => {
      const val = String(r[catCol.name] || "Other");
      catCounts[val] = (catCounts[val] || 0) + 1;
    });
  }
  const catEntries = Object.entries(catCounts).slice(0, 4);
  const totalCatSample = sampleRows.length || 1;

  return (
    <div className="space-y-6">
      {/* 1. Generated Matplotlib Charts Gallery */}
      {dynamicChartUrls.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#19213D] dark:text-white">
                  Visualizer Output (Matplotlib &amp; Seaborn)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {dynamicChartUrls.length} {dynamicChartUrls.length === 1 ? "visualization generated" : "visualizations generated"} by Agent 3
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              High Resolution (300 DPI)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dynamicChartUrls.map((url, idx) => {
              const fullUrl = getChartUrl(url);
              return (
                <div
                  key={idx}
                  className="group relative border border-[#E5EBF2] dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="relative overflow-hidden bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4 min-h-[300px]">
                    <img
                      src={fullUrl}
                      alt={`Matplotlib Chart ${idx + 1}`}
                      className="max-h-[340px] w-auto object-contain rounded-xl shadow-xs"
                    />

                    {/* Overlay Action Buttons */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-1.5 rounded-xl border border-[#E5EBF2] dark:border-zinc-700 shadow-md">
                      <button
                        onClick={() => setFullscreenChart(fullUrl)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                        title="View Fullscreen"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <a
                        href={fullUrl}
                        download={`chart_${idx + 1}.png`}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                        title="Download PNG"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  <div className="p-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-zinc-900">
                    <span className="font-medium text-[#19213D] dark:text-slate-300">
                      Chart #{idx + 1}
                    </span>
                    <button
                      onClick={() => setFullscreenChart(fullUrl)}
                      className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Click to expand</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl border border-dashed border-[#E5EBF2] dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="font-bold text-sm text-[#19213D] dark:text-white">
              No Charts Generated Yet
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ask Agent 3 in the AI Analyst prompt to chart any metric, compare categories, or generate a correlation plot.
            </p>
          </div>
          {onAskChart && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={() => onAskChart("Generate a summary bar chart of key metrics")}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-[#E5EBF2] dark:border-zinc-700 hover:border-emerald-400 text-xs font-medium text-[#19213D] dark:text-slate-300 shadow-2xs transition-all"
              >
                📊 Bar Chart of Key Metrics
              </button>
              <button
                onClick={() => onAskChart("Create a distribution histogram of numeric features")}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-[#E5EBF2] dark:border-zinc-700 hover:border-emerald-400 text-xs font-medium text-[#19213D] dark:text-slate-300 shadow-2xs transition-all"
              >
                📈 Distribution Histogram
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Categorical Distribution Breakdown */}
      {catEntries.length > 0 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-[#E5EBF2] dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#19213D] dark:text-white">
                  Cohort Breakdown: {catCol?.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sample distribution across major categories
                </p>
              </div>
            </div>

            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400">
              {sampleRows.length} sample records
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {catEntries.map(([category, count], i) => {
              const pct = Math.round((count / totalCatSample) * 100);
              const colorSchemes = [
                { bg: "bg-emerald-500", light: "bg-emerald-50 dark:bg-emerald-950/50", text: "text-emerald-600" },
                { bg: "bg-teal-500", light: "bg-teal-50 dark:bg-teal-950/50", text: "text-teal-600" },
                { bg: "bg-amber-500", light: "bg-amber-50 dark:bg-amber-950/50", text: "text-amber-600" },
                { bg: "bg-cyan-500", light: "bg-cyan-50 dark:bg-cyan-950/50", text: "text-cyan-600" },
              ];
              const scheme = colorSchemes[i % colorSchemes.length];

              return (
                <div key={category} className="p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#19213D] dark:text-slate-200 truncate max-w-[180px]">
                      {category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400">{count} records</span>
                      <span className={`font-extrabold ${scheme.text}`}>{pct}%</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200/80 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className={`${scheme.bg} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Fullscreen Lightbox Modal */}
      {fullscreenChart && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in"
          onClick={() => setFullscreenChart(null)}
        >
          <div 
            className="relative max-w-5xl w-full bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <span className="font-bold text-sm text-[#19213D] dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>High-Definition Visualization</span>
              </span>

              <div className="flex items-center gap-2">
                <a
                  href={fullscreenChart}
                  download="visualization.png"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-emerald-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </a>
                <button
                  onClick={() => setFullscreenChart(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center max-h-[80vh] overflow-auto bg-slate-50 dark:bg-zinc-950 rounded-xl p-4">
              <img
                src={fullscreenChart}
                alt="Fullscreen Chart"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
