"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Upload, 
  FileSpreadsheet, 
  ShieldCheck, 
  Code2, 
  BarChart3, 
  ArrowRight,
  Database,
  Lock,
  Layers,
  Zap,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { UploadSuccessData } from "@/components/workspace/FileUpload";
import { apiClient } from "@/lib/apiClient";

interface DashboardHeroProps {
  onOpenUpload: () => void;
  onUploadSuccess: (data: UploadSuccessData) => void;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  onOpenUpload,
  onUploadSuccess
}) => {
  const [isUploadingDemo, setIsUploadingDemo] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const sampleDatasets = [
    {
      title: "SaaS Hardware Inventory",
      filename: "sample_hardware_inventory.csv",
      rows: 50,
      description: "Inventory levels, unit costs, vendor ratings, and warehouse locations with subtle outliers.",
      csvData: `item_id,item_name,category,unit_cost,stock_level,reorder_point,supplier_rating,warehouse_location
HW-1001,Dell UltraSharp 27 Monitor,Displays,349.99,45,15,4.8,North-Zone
HW-1002,Logitech MX Master 3S,Peripherals,99.99,120,30,4.9,East-Zone
HW-1003,Apple MacBook Pro M3,Laptops,1999.00,18,5,4.7,Central-Vault
HW-1004,Keychron Q1 Pro Keyboard,Peripherals,199.50,60,20,4.6,East-Zone
HW-1005,Ergotron Dual Monitor Arm,Mounts,289.00,32,10,4.5,North-Zone
HW-1006,CalDigit TS4 Thunderbolt Dock,Docks,399.95,25,8,4.9,Central-Vault
HW-1007,Herman Miller Aeron Chair,Furniture,1395.00,12,3,4.9,South-Zone
HW-1008,Steelcase Gesture Chair,Furniture,1250.00,14,4,4.8,South-Zone
HW-1009,Anker 737 Power Bank,Power,149.99,85,25,4.7,West-Zone
HW-1010,Sony WH-1000XM5 Headphones,Audio,399.99,38,12,4.8,West-Zone
HW-1011,Jabra Evolve2 75 Headset,Audio,299.00,42,15,4.4,West-Zone
HW-1012,BenQ ScreenBar Halo,Lighting,179.00,55,18,4.6,North-Zone
HW-1013,Samsung T7 2TB SSD,Storage,159.99,110,40,4.8,East-Zone
HW-1014,Logitech Brio 4K Webcam,Cameras,199.99,70,20,4.3,North-Zone
HW-1015,Ubiquiti UniFi Switch 24,Networking,379.00,15,5,4.7,Central-Vault
HW-1016,Synology DS923+ NAS,Storage,599.99,9,3,4.9,Central-Vault
HW-1017,APC Smart-UPS 1500VA,Power,589.00,8,2,4.6,South-Zone
HW-1018,LG DualUp Monitor 28,Displays,599.99,22,6,4.5,North-Zone
HW-1019,Elgato Stream Deck MK2,Peripherals,149.99,50,15,4.8,East-Zone
HW-1020,Autonomous Standing Desk Pro,Furniture,699.00,16,4,4.4,South-Zone`
    },
    {
      title: "Global E-Commerce Revenue",
      filename: "sample_ecommerce_sales.csv",
      rows: 60,
      description: "Sales transactions, regional tiers, product margins, and customer retention metrics.",
      csvData: `order_id,region,product_line,order_value,discount_pct,shipping_cost,customer_type,satisfaction_score
ORD-901,North America,Electronics,450.00,0.05,12.50,Enterprise,4.8
ORD-902,Europe,Apparel,85.50,0.10,5.00,Consumer,4.2
ORD-903,Asia-Pacific,Home & Kitchen,195.00,0.15,18.00,Consumer,4.5
ORD-904,North America,Software,1200.00,0.00,0.00,Enterprise,4.9
ORD-905,Latin America,Electronics,680.00,0.20,25.00,SMB,3.9
ORD-906,Europe,Home & Kitchen,220.00,0.05,14.00,SMB,4.6
ORD-907,North America,Apparel,140.00,0.10,8.50,Consumer,4.1
ORD-908,Asia-Pacific,Electronics,990.00,0.12,30.00,Enterprise,4.7
ORD-909,Europe,Software,750.00,0.00,0.00,Enterprise,4.8
ORD-910,North America,Electronics,1850.00,0.08,45.00,Enterprise,4.9
ORD-911,Latin America,Apparel,65.00,0.05,9.00,Consumer,3.8
ORD-912,Asia-Pacific,Software,490.00,0.00,0.00,SMB,4.6`
    }
  ];

  const handleLoadDemo = async (sample: typeof sampleDatasets[0]) => {
    setIsUploadingDemo(true);
    setDemoError(null);

    try {
      const blob = new Blob([sample.csvData], { type: "text/csv" });
      const file = new File([blob], sample.filename, { type: "text/csv" });

      const formData = new FormData();
      formData.append("csv", file);

      const response = await apiClient.post("/analysis/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      onUploadSuccess(response.data);
    } catch (err: unknown) {
      console.error("Failed to load demo:", err);
      const errDetail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setDemoError(errDetail || "Could not load sample dataset.");
    } finally {
      setIsUploadingDemo(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6 sm:py-10">
      {/* 1. Executive Banner */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>Multi-Agent LangGraph Analytics Engine</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#19213D] dark:text-white tracking-tight">
          Intelligent Dataset Diagnostics &amp; Insights
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Upload any CSV file to activate our autonomous agent trio. We audit missing cells and outliers, 
          execute sandboxed Python transformations, and render high-resolution charts on demand.
        </p>

        {demoError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl max-w-md mx-auto">
            {demoError}
          </div>
        )}
      </div>

      {/* 2. Drag & Drop Primary Upload Card */}
      <div 
        onClick={onOpenUpload}
        className="p-8 sm:p-12 rounded-3xl border-2 border-dashed border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-500 bg-gradient-to-b from-white via-emerald-50/20 to-white dark:from-zinc-900 dark:via-emerald-950/20 dark:to-zinc-900 cursor-pointer shadow-sm hover:shadow-md transition-all text-center space-y-4 group"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
          <Upload className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h3 className="font-extrabold text-base sm:text-lg text-[#19213D] dark:text-white">
            Upload CSV to Start Analysis
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click anywhere or drag and drop your dataset here (1 CSV per analysis session)
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs shadow-emerald-500/20 transition-colors inline-flex items-center gap-2"
          >
            <span>Select CSV File</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. One-Click Demo Sample Datasets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Or Try with a Pre-Built Sample Dataset:</span>
          </h4>
          {isUploadingDemo && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Scanning sample dataset...</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {sampleDatasets.map((sample, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 shadow-sm hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between space-y-3 text-left"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-xs text-[#19213D] dark:text-white">
                      {sample.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 font-semibold">
                    CSV Demo
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {sample.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleLoadDemo(sample)}
                disabled={isUploadingDemo}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <span>Load {sample.title}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Three Agent Roles Visual Cards */}
      <div className="pt-4 space-y-3">
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 text-center">
          Autonomous Multi-Agent Architecture
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Agent 1 */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 shadow-sm space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h5 className="font-bold text-xs text-[#19213D] dark:text-white">
              Agent 1: The Cleaner
            </h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Scans missing cells, audits duplicate rows, and detects distribution outliers via IQR boundaries.
            </p>
          </div>

          {/* Agent 2 */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 shadow-sm space-y-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
            <h5 className="font-bold text-xs text-[#19213D] dark:text-white">
              Agent 2: The Analyst
            </h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Synthesizes queries into sandboxed Python &amp; Pandas code with automated error-fixing.
            </p>
          </div>

          {/* Agent 3 */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 shadow-sm space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h5 className="font-bold text-xs text-[#19213D] dark:text-white">
              Agent 3: The Visualizer
            </h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Renders 300 DPI Matplotlib and Seaborn graphs with categorical and trend representations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
