"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  FileSpreadsheet,
  Trash2,
  LogOut,
  Sparkles,
  Loader2,
  Search,
  CheckCircle2,
  Database
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { apiClient } from "@/lib/apiClient";

interface DatasetItem {
  analysis_id: string;
  filename: string;
  total_rows: number;
  total_columns: number;
  health_score: number;
  created_at?: string;
}

interface SidebarProps {
  activeDatasetId: string;
  onSelectDataset: (dataset: DatasetItem) => void;
  onOpenUpload: () => void;
  onDeleteDataset?: (analysisId: string) => void;
  refreshTrigger?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeDatasetId,
  onSelectDataset,
  onOpenUpload,
  onDeleteDataset,
  refreshTrigger = 0
}) => {
  const { data: session, status } = useSession();
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !session) {
      setDatasets([]);
      return;
    }

    const token = (session as { accessToken?: string })?.accessToken ||
                  (session?.user as { accessToken?: string })?.accessToken;
    if (!token) {
      return;
    }

    const fetchDatasets = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get("/analysis/datasets", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data && Array.isArray(response.data)) {
          setDatasets(response.data);
          if (!activeDatasetId && response.data.length > 0) {
            onSelectDataset(response.data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load datasets:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatasets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, refreshTrigger]);

  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "User";
  const userEmail = session?.user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase() || "U";

  const filteredDatasets = datasets.filter((d) =>
    d.filename.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <aside className="w-64 sm:w-72 shrink-0 bg-white dark:bg-zinc-950 border-r border-[#E5EBF2] dark:border-zinc-800 flex flex-col h-screen select-none transition-all">
      {/* 1. Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-[#E5EBF2] dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-sm shadow-rose-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-[#19213D] dark:text-white">
                Syntropic
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Multi-Agent Analytics
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Online</span>
        </span>
      </div>

      {/* 2. New Analysis CTA Button */}
      <div className="p-3.5">
        <button
          onClick={onOpenUpload}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-semibold shadow-sm shadow-emerald-500/20 hover:shadow transition-all group"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
            <span>New Analysis</span>
          </div>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-mono">
            + CSV
          </span>
        </button>
      </div>

      {/* 3. Search Filter */}
      {datasets.length > 3 && (
        <div className="px-3.5 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter datasets..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-[#E5EBF2] dark:border-zinc-800 bg-[#F5F7FB] dark:bg-zinc-900 text-[#19213D] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>
      )}

      {/* 4. Analyses List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-3 text-xs">
        <div>
          <div className="px-2 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>Your Sessions</span>
              {isLoading && <Loader2 className="w-2.5 h-2.5 animate-spin text-emerald-600" />}
            </span>
            <span className="font-mono text-slate-400">({datasets.length})</span>
          </div>

          <div className="space-y-1.5 mt-1">
            {datasets.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-[#E5EBF2] dark:border-zinc-800 rounded-2xl space-y-2">
                <Database className="w-6 h-6 mx-auto text-slate-300 dark:text-zinc-700" />
                <p>No analyses yet.</p>
                <button
                  onClick={onOpenUpload}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                >
                  Upload your first CSV &rarr;
                </button>
              </div>
            ) : filteredDatasets.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                No sessions match &quot;{searchFilter}&quot;.
              </div>
            ) : (
              filteredDatasets.map((d) => {
                const isActive = activeDatasetId === d.analysis_id;
                return (
                  <div
                    key={d.analysis_id}
                    onClick={() => onSelectDataset(d)}
                    className={`group w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white font-medium shadow-sm shadow-emerald-500/20"
                        : "text-[#19213D] dark:text-slate-300 hover:bg-[#F5F7FB] dark:hover:bg-zinc-900 border border-transparent hover:border-[#E5EBF2] dark:hover:border-zinc-800"
                    }`}
                  >
                    <div className="flex flex-col gap-1 truncate flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-2 truncate">
                        <FileSpreadsheet className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-emerald-600 dark:text-emerald-400"}`} />
                        <span className="truncate font-bold text-xs">{d.filename}</span>
                      </div>
                      <div className={`text-[10px] flex items-center gap-1.5 pl-6 font-mono ${isActive ? "text-emerald-100" : "text-slate-400"}`}>
                        <span>{d.total_rows.toLocaleString()} rows</span>
                        <span>&bull;</span>
                        <span className={`px-1 py-0.2 rounded font-bold ${
                          isActive 
                            ? "bg-white/20 text-white" 
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        }`}>
                          {d.health_score}%
                        </span>
                      </div>
                    </div>

                    {onDeleteDataset && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDataset(d.analysis_id);
                        }}
                        className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
                          isActive 
                            ? "hover:bg-white/20 text-white" 
                            : "hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600"
                        }`}
                        title="Delete this analysis"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 5. User Profile Footer */}
      {session?.user && (
        <div className="p-3.5 border-t border-[#E5EBF2] dark:border-zinc-800 bg-[#F5F7FB]/50 dark:bg-zinc-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={userName}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#E5EBF2] dark:border-zinc-700 shadow-2xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-xs font-extrabold shrink-0 shadow-2xs shadow-emerald-500/20">
                  {userInitial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs text-[#19213D] dark:text-white truncate">
                  {userName}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {userEmail}
                </div>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/auth/signup" })}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
