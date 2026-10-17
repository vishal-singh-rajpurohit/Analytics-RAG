"use client";

import React, { useState } from "react";
import { Download, Maximize2, X, Image as ImageIcon } from "lucide-react";
import { getChartUrl } from "@/lib/apiClient";

interface ChartViewerProps {
  chartUrls: string[];
}

export const ChartViewer: React.FC<ChartViewerProps> = ({ chartUrls }) => {
  const [selectedChart, setSelectedChart] = useState<string | null>(null);

  const handleDownload = (url: string) => {
    const fullUrl = getChartUrl(url);
    const link = document.createElement("a");
    link.href = fullUrl;
    link.download = "chart_export.png";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!chartUrls || chartUrls.length === 0) return null;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-[#19213D] dark:text-zinc-100 font-bold">Generated Visualizations (Agent 3: The Visualizer)</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {chartUrls.map((url, idx) => {
          const fullUrl = getChartUrl(url);
          return (
            <div
              key={idx}
              className="group relative border border-[#E5EBF2] dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm"
            >
              <div className="relative overflow-hidden bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-2">
                <img
                  src={fullUrl}
                  alt={`Analysis visualization ${idx + 1}`}
                  className="max-h-[380px] w-auto object-contain rounded-lg transition-transform hover:scale-[1.01]"
                  loading="lazy"
                />

                <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-zinc-900/90 backdrop-blur p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm">
                  <button
                    onClick={() => setSelectedChart(fullUrl)}
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-300 transition-colors"
                    title="Fullscreen preview"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(url)}
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-300 transition-colors"
                    title="Download chart PNG"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-zinc-50/50 dark:bg-zinc-800/20 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Figure {idx + 1}: Matplotlib chart rendered at 200 DPI</span>
                <button
                  onClick={() => handleDownload(url)}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Download className="w-3 h-3" />
                  <span>Save Image</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Zoom Modal */}
      {selectedChart && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedChart(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden p-2 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800">
              <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                High-Resolution Chart Viewer
              </span>
              <button
                onClick={() => setSelectedChart(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={selectedChart}
                alt="Fullscreen chart"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
