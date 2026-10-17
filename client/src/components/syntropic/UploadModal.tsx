"use client";

import React from "react";
import { X, Database, Sparkles, FileSpreadsheet } from "lucide-react";
import { FileUpload, UploadSuccessData } from "@/components/workspace/FileUpload";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (data: UploadSuccessData) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-xl bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EBF2] dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#19213D] dark:text-white flex items-center gap-2">
                <span>New Analysis Session</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                  1 CSV Dataset
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload your CSV dataset to activate the multi-agent analysis pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <FileUpload
          onUploadSuccess={(data) => {
            onUploadSuccess(data);
            onClose();
          }}
        />

        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 justify-center pt-1 font-medium">
          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Automated missing value audit, duplicate detection, and outlier scanning enabled</span>
        </div>
      </div>
    </div>
  );
};
