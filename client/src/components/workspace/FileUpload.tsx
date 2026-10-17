"use client";

import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

export interface UploadSuccessData {
  analysis_id: string;
  dataset_id?: string;
  filename: string;
  total_rows?: number;
  total_columns?: number;
  health_score?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cleaning_report?: any;
  sample_preview?: Array<Record<string, unknown>>;
  columns?: Array<{ name: string; dtype: string }>;
  msg?: string;
}

interface FileUploadProps {
  onUploadSuccess: (uploadData: UploadSuccessData) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Please select a valid CSV (.csv) dataset.");
      return;
    }

    setError(null);
    setFileName(file.name);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("csv", file);

    try {
      const response = await apiClient.post("/analysis/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      onUploadSuccess(response.data);
    } catch (err: unknown) {
      console.error("Upload error:", err);
      const errDetail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(
        errDetail || "Failed to upload and scan dataset. Please check backend connection."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length > 1) {
        setError("Only one CSV file can be uploaded per analysis session. Please select a single file.");
        return;
      }
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer ${
          isDragging
            ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
            : "border-[#E5EBF2] dark:border-zinc-700 hover:border-emerald-400 dark:hover:border-emerald-500/50 bg-[#F5F7FB] dark:bg-zinc-900/40"
        } ${disabled || isUploading ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple={false}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              if (e.target.files.length > 1) {
                setError("Only one CSV file can be uploaded per analysis session.");
                return;
              }
              handleFile(e.target.files[0]);
            }
          }}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3 text-center py-2">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            <div className="text-sm font-bold text-[#19213D] dark:text-white">
              Scanning &amp; Sanitizing Dataset...
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Agent 1 (The Cleaner) is auditing nulls, duplicate records, and outliers
            </p>
          </div>
        ) : fileName ? (
          <div className="flex flex-col items-center gap-2 text-center py-1">
            <FileSpreadsheet className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            <div className="text-sm font-bold text-[#19213D] dark:text-white flex items-center gap-1.5">
              <span>{fileName}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Dataset verified and locked for this analysis session
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center py-2">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl text-emerald-600 dark:text-emerald-400 shadow-2xs">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#19213D] dark:text-white">
                Choose CSV file or drag &amp; drop
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Standard tabular CSV formats (comma-separated, UTF-8 encoded)
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2.5 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <span className="leading-relaxed font-medium">{error}</span>
        </div>
      )}
    </div>
  );
};
