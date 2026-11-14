/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileArchive,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  Download,
  FileText,
  HelpCircle,
  GitMerge,
  Layers,
  Sparkles,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Check,
  ShieldCheck,
  Clock,
  AlertTriangle
} from 'lucide-react';
import {
  parseZipArchive,
  parseRarArchive,
  parseSingleStockFileWithAudit,
  parseAmiBrokerPastedTextWithAudit,
  mergeConsistencyReports,
  mergeIncrementalStockData,
  buildScreenerItemsFromBars,
  PRESEEDED_DSE_STOCKS
} from '../lib/dseDataEngine';
import {
  DseStockItem,
  CandleBar,
  UploadedDataSummary,
  IncrementalMergeReport,
  DataConsistencyReport
} from '../types/dse';
import {
  UserFundamentalAndActionRecord,
  loadUserFundamentalsMap,
  parseDseFundamentalsAndActionsText,
} from '../lib/dseCorporateActions';

interface DataUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingStocks: DseStockItem[];
  onDataLoaded: (stocks: DseStockItem[], summary: UploadedDataSummary) => void;
  onRestorePreseeded: () => void;
  onApplyFundamentals?: (records: UserFundamentalAndActionRecord[]) => void;
  onClearFundamentals?: () => void;
}

/**
 * Recursively extracts all files from dropped DataTransfer items.
 * Handles nested folders, subdirectories, and single/multiple files across Chrome, Edge, Safari, Firefox.
 */
async function extractFilesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
  const fileList: File[] = [];
  const items = dataTransfer.items;

  if (items && items.length > 0) {
    const traverseEntry = async (entry: any): Promise<void> => {
      if (!entry) return;
      if (entry.isFile) {
        try {
          const file = await new Promise<File>((resolve, reject) => {
            entry.file(resolve, reject);
          });
          fileList.push(file);
        } catch (e) {
          console.warn('Could not read file entry:', entry.name, e);
        }
      } else if (entry.isDirectory) {
        try {
          const dirReader = entry.createReader();
          const readBatch = (): Promise<any[]> => {
            return new Promise((resolve, reject) => {
              dirReader.readEntries(resolve, reject);
            });
          };
          let batch: any[];
          do {
            batch = await readBatch();
            for (const child of batch) {
              await traverseEntry(child);
            }
          } while (batch && batch.length > 0);
        } catch (e) {
          console.warn('Could not read directory entry:', entry.name, e);
        }
      }
    };

    const entriesToTraverse: any[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;
        if (entry) {
          entriesToTraverse.push(entry);
        } else {
          const f = item.getAsFile();
          if (f) fileList.push(f);
        }
      }
    }

    if (entriesToTraverse.length > 0) {
      for (const entry of entriesToTraverse) {
        await traverseEntry(entry);
      }
    }
  }

  // Fallback to standard files if no items were extracted via webkitGetAsEntry
  if (fileList.length === 0 && dataTransfer.files && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      fileList.push(dataTransfer.files[i]);
    }
  }

  return fileList;
}

export function DataUploadModal({
  isOpen,
  onClose,
  existingStocks,
  onDataLoaded,
  onRestorePreseeded,
  onApplyFundamentals,
  onClearFundamentals,
}: DataUploadModalProps) {
  if (!isOpen) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fundFileInputRef = useRef<HTMLInputElement>(null);

  // Active Upload Method Tab
  const [activeUploadTab, setActiveUploadTab] = useState<'files' | 'folder' | 'paste' | 'fundamentals' | 'guide'>('files');

  // Merge strategy
  const [mergeStrategy, setMergeStrategy] = useState<'incremental_merge' | 'replace_all'>('incremental_merge');

  // Drag and processing states
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<UploadedDataSummary | null>(null);
  const [mergedResult, setMergedResult] = useState<{
    stocks: DseStockItem[];
    report: IncrementalMergeReport;
  } | null>(null);

  // Paste Text state
  const [pastedText, setPastedText] = useState('');
  const [showDrilldown, setShowDrilldown] = useState(false);
  const [showSchemaAudit, setShowSchemaAudit] = useState(false);
  const [folderStats, setFolderStats] = useState<{
    totalFiles: number;
    zipCount: number;
    excelCount: number;
    csvTxtCount: number;
  } | null>(null);

  // Fundamentals & Corporate Actions CSV / Paste state
  const [fundamentalsText, setFundamentalsText] = useState('');
  const [parsedFundamentals, setParsedFundamentals] = useState<{
    records: UserFundamentalAndActionRecord[];
    warnings: string[];
  } | null>(null);
  const [savedFundamentalsCount, setSavedFundamentalsCount] = useState<number>(() => {
    return Object.keys(loadUserFundamentalsMap()).length;
  });

  /**
   * Processes a FileList or array of Files (from archives, single files, or recursive folder ingestion).
   * Supports ZIP (.zip, .tar.gz), RAR (.rar), Excel (.xlsx, .xls, .xlsm, .xlsb), CSV (.csv, .tsv), and Text/AmiBroker.
   */
  const handleProcessFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    const fileArray: File[] = [];
    if (files instanceof FileList) {
      for (let i = 0; i < files.length; i++) {
        fileArray.push(files[i]);
      }
    } else if (Array.isArray(files)) {
      fileArray.push(...files);
    }
    if (fileArray.length === 0) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setSummary(null);
    setMergedResult(null);
    setFolderStats(null);

    try {
      const combinedDataMap = new Map<string, CandleBar[]>();
      const collectedConsistencyReports: DataConsistencyReport[] = [];
      const ingestionWarnings: string[] = [];
      let totalRawBars = 0;
      let totalSize = 0;
      const allDates: string[] = [];

      let zipCount = 0;
      let rarCount = 0;
      let excelCount = 0;
      let csvTxtCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < fileArray.length; i++) {
        const f = fileArray[i];
        totalSize += f.size;
        const nameLower = f.name.toLowerCase();

        // Skip macOS metadata, hidden dotfiles, and desktop index files
        if (
          f.name.startsWith('.') ||
          f.name.startsWith('__MACOSX') ||
          nameLower.includes('__macosx') ||
          f.name === 'Thumbs.db' ||
          f.name === 'desktop.ini'
        ) {
          continue;
        }

        const isZip = nameLower.endsWith('.zip') || nameLower.endsWith('.tar.gz') || nameLower.endsWith('.tgz');
        const isRar = nameLower.endsWith('.rar');
        const isExcel =
          nameLower.endsWith('.xlsx') ||
          nameLower.endsWith('.xls') ||
          nameLower.endsWith('.xlsm') ||
          nameLower.endsWith('.xlsb');
        const isText =
          nameLower.endsWith('.csv') ||
          nameLower.endsWith('.tsv') ||
          nameLower.endsWith('.txt') ||
          nameLower.endsWith('.dat') ||
          nameLower.endsWith('.prn') ||
          nameLower.endsWith('.afl') ||
          nameLower.endsWith('.asc') ||
          nameLower.endsWith('.ascii');
        // In AmiBroker databases, some ticker files have no extension (e.g. "SQURPHARMA" or "01_BANK")
        const isLikelyTickerWithoutExt = !nameLower.includes('.') && f.size > 20 && f.size < 50000000;

        if (isZip) {
          zipCount++;
          try {
            const { dataMap, summary: zipSummary } = await parseZipArchive(f);
            if (zipSummary.consistencyReport) {
              collectedConsistencyReports.push(zipSummary.consistencyReport);
            }
            for (const [sym, bars] of dataMap.entries()) {
              if (!combinedDataMap.has(sym)) combinedDataMap.set(sym, []);
              combinedDataMap.get(sym)!.push(...bars);
              totalRawBars += bars.length;
              if (bars.length > 0) allDates.push(bars[0].date, bars[bars.length - 1].date);
            }
          } catch (zipErr: any) {
            const msg = `Could not unpack ZIP "${f.name}": ${zipErr?.message || 'corrupt or unsupported archive'}`;
            ingestionWarnings.push(msg);
            console.warn(msg, zipErr);
          }
        } else if (isRar) {
          rarCount++;
          try {
            const { dataMap, summary: rarSummary } = await parseRarArchive(f);
            if (rarSummary.consistencyReport) {
              collectedConsistencyReports.push(rarSummary.consistencyReport);
            }
            for (const [sym, bars] of dataMap.entries()) {
              if (!combinedDataMap.has(sym)) combinedDataMap.set(sym, []);
              combinedDataMap.get(sym)!.push(...bars);
              totalRawBars += bars.length;
              if (bars.length > 0) allDates.push(bars[0].date, bars[bars.length - 1].date);
            }
          } catch (rarErr: any) {
            const msg = `Could not unpack RAR "${f.name}": ${rarErr?.message || 'corrupt or unsupported archive'}`;
            ingestionWarnings.push(msg);
            console.warn(msg, rarErr);
          }
        } else if (isExcel) {
          excelCount++;
          try {
            const parsedRes = await parseSingleStockFileWithAudit(f);
            collectedConsistencyReports.push(parsedRes.consistencyReport);
            for (const [sym, bars] of parsedRes.dataMap.entries()) {
              if (!combinedDataMap.has(sym)) combinedDataMap.set(sym, []);
              combinedDataMap.get(sym)!.push(...bars);
              totalRawBars += bars.length;
              if (bars.length > 0) allDates.push(bars[0].date, bars[bars.length - 1].date);
            }
          } catch (excelErr: any) {
            const msg = `Could not parse Excel "${f.name}": ${excelErr?.message || 'invalid workbook'}`;
            ingestionWarnings.push(msg);
            console.warn(msg, excelErr);
          }
        } else if (isText || isLikelyTickerWithoutExt) {
          try {
            const parsedRes = await parseSingleStockFileWithAudit(f);
            if (parsedRes.dataMap && parsedRes.dataMap.size > 0) {
              csvTxtCount++;
              collectedConsistencyReports.push(parsedRes.consistencyReport);
              for (const [sym, bars] of parsedRes.dataMap.entries()) {
                if (!combinedDataMap.has(sym)) combinedDataMap.set(sym, []);
                combinedDataMap.get(sym)!.push(...bars);
                totalRawBars += bars.length;
                if (bars.length > 0) allDates.push(bars[0].date, bars[bars.length - 1].date);
              }
            } else {
              skippedCount++;
              if (isText && parsedRes.consistencyReport.totalRowsScanned > 0) {
                collectedConsistencyReports.push(parsedRes.consistencyReport);
              }
            }
          } catch {
            // Safely ignore non-candle files in folders (e.g. layout.awc, broker.workspace)
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      }

      setFolderStats({
        totalFiles: fileArray.length,
        zipCount,
        excelCount,
        csvTxtCount,
      });

      const mergedConsistency = mergeConsistencyReports(collectedConsistencyReports);
      if (ingestionWarnings.length > 0) {
        mergedConsistency.warnings.push(...ingestionWarnings);
      }

      if (combinedDataMap.size === 0) {
        throw new Error(
          `Scanned ${fileArray.length} file(s), but no valid stock OHLCV records passed consistency verification` +
          (mergedConsistency.invalidDateRows > 0 || mergedConsistency.invalidPriceRows > 0
            ? ` (${mergedConsistency.invalidDateRows} invalid dates, ${mergedConsistency.invalidPriceRows} invalid price rows).`
            : '. ') +
          `Please verify files contain valid Date, Close, and Volume columns.`
        );
      }

      // Deduplicate each symbol's uploaded bars internally and track cross-file duplicates
      for (const [sym, bars] of combinedDataMap.entries()) {
        const unique = new Map<string, CandleBar>();
        for (const b of bars) {
          const prev = unique.get(b.date);
          if (prev) {
            mergedConsistency.duplicatesCollapsedCount++;
            if (prev.close > 0 && Math.abs(b.close - prev.close) / prev.close > 0.005) {
              mergedConsistency.conflictingDuplicatesCount++;
            }
          }
          unique.set(b.date, b);
        }
        combinedDataMap.set(sym, Array.from(unique.values()).sort((a, b) => a.date.localeCompare(b.date)));
      }

      // Run incremental merge engine with cross-check matching
      const { mergedStocks, report } = mergeIncrementalStockData(
        existingStocks,
        combinedDataMap,
        mergeStrategy
      );

      // Create helpful source description
      const formatParts: string[] = [];
      if (zipCount > 0) formatParts.push(`${zipCount} ZIP archive${zipCount > 1 ? 's' : ''}`);
      if (rarCount > 0) formatParts.push(`${rarCount} RAR archive${rarCount > 1 ? 's' : ''}`);
      if (excelCount > 0) formatParts.push(`${excelCount} Excel workbook${excelCount > 1 ? 's' : ''}`);
      if (csvTxtCount > 0) formatParts.push(`${csvTxtCount} CSV/TXT file${csvTxtCount > 1 ? 's' : ''}`);

      let sourceDescription = '';
      if (fileArray.length === 1) {
        sourceDescription = `${fileArray[0].name} (${formatParts.join(', ') || 'File Ingestion'})`;
      } else {
        sourceDescription = `Folder Ingestion (${fileArray.length} files scanned: ${formatParts.join(', ') || 'Stock Data'})`;
      }

      const symbols = Array.from(combinedDataMap.keys());
      const uploadSummary: UploadedDataSummary = {
        fileName: sourceDescription,
        fileSize: totalSize,
        symbolsCount: symbols.length,
        totalBarsCount: totalRawBars,
        dateRange: report.dateRange,
        symbols,
        mergeReport: report,
        consistencyReport: mergedConsistency,
      };

      setSummary(uploadSummary);
      setMergedResult({ stocks: mergedStocks, report });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process stock data upload.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Processes raw text pasted directly from AmiBroker exploration or quote tables.
   */
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      setErrorMsg('Please paste AmiBroker quotes or table text first.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);
    setSummary(null);
    setMergedResult(null);

    try {
      const parsedRes = parseAmiBrokerPastedTextWithAudit(pastedText);
      const parsedMap = parsedRes.dataMap;
      if (parsedMap.size === 0) {
        throw new Error('Could not parse any records from pasted text. Please verify rows contain Ticker, Date, Close, Volume.');
      }

      const { mergedStocks, report } = mergeIncrementalStockData(
        existingStocks,
        parsedMap,
        mergeStrategy
      );

      const symbols = Array.from(parsedMap.keys());
      let totalBars = 0;
      for (const bars of parsedMap.values()) totalBars += bars.length;

      const uploadSummary: UploadedDataSummary = {
        fileName: `Pasted AmiBroker Clipboard Data (${symbols.length} tickers)`,
        fileSize: pastedText.length,
        symbolsCount: symbols.length,
        totalBarsCount: totalBars,
        dateRange: report.dateRange,
        symbols,
        mergeReport: report,
        consistencyReport: parsedRes.consistencyReport,
      };

      setSummary(uploadSummary);
      setMergedResult({ stocks: mergedStocks, report });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse pasted text.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Applies the reconciled dataset and closes the modal.
   */
  const handleApplyData = () => {
    if (mergedResult && summary) {
      onDataLoaded(mergedResult.stocks, summary);
      onClose();
    }
  };

  /**
   * Downloads sample CSV template.
   */
  const handleDownloadTemplate = () => {
    const csvContent = `Date,Symbol,Open,High,Low,Close,Volume\n2026-10-14,SQURPHARMA,221.0,223.5,220.0,222.8,1240000\n2026-10-15,SQURPHARMA,222.5,224.0,221.5,223.4,1450000\n2026-10-18,SQURPHARMA,223.0,226.5,222.0,224.8,1845200\n2026-10-19,SQURPHARMA,225.0,227.5,224.0,226.4,1980000\n2026-10-14,BATBC,518.0,522.0,516.5,520.4,850000\n2026-10-15,BATBC,521.0,526.0,520.0,524.8,940000\n2026-10-18,BATBC,525.0,531.0,524.5,528.6,1240000\n2026-10-19,BATBC,529.0,535.0,527.0,532.0,1410000\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'DSE_Incremental_Sample_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadFundamentalsTemplate = () => {
    const csvContent = `Symbol,Category,PE,FreeFloatPct,MarketCapCr,RecordDate,CashDivPct,BonusPct,AgmDate\nSQURPHARMA,A,9.8,65.2,19925,2026-11-26,110,0,2026-12-18\nGP,A,12.4,10.0,45120,2026-11-30,160,0,2026-12-22\nORIONINFU,A,42.5,59.4,812,,,\nEMERALDOIL,Z,68.0,48.0,320,,,\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'DSE_Fundamentals_RecordDates_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleParseFundamentalsText = (rawText: string) => {
    setErrorMsg(null);
    if (!rawText.trim()) {
      setErrorMsg('Please paste or upload DSE fundamentals / Category / Record Date CSV rows first.');
      return;
    }
    const parsed = parseDseFundamentalsAndActionsText(rawText);
    if (parsed.records.length === 0) {
      setErrorMsg('No valid Symbol + Fundamental/Category/RecordDate records detected in input.');
      setParsedFundamentals(null);
      return;
    }
    setParsedFundamentals(parsed);
  };

  const handleFundamentalsFileUpload = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setFundamentalsText(text);
    handleParseFundamentalsText(text);
  };

  const handleCommitFundamentals = () => {
    if (!parsedFundamentals || parsedFundamentals.records.length === 0) return;
    if (onApplyFundamentals) {
      onApplyFundamentals(parsedFundamentals.records);
      setSavedFundamentalsCount(Object.keys(loadUserFundamentalsMap()).length);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b111e] border border-slate-800 rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl space-y-4 font-mono text-slate-200 my-auto">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 text-slate-950 shadow-md shadow-cyan-950">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  AmiBroker &amp; Stock Data Ingestion Engine
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                  Incremental Stitching Active
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                AmiBroker Database, ZIP, RAR, Excel (.xlsx/.xls), CSV, TXT &bull; Smart Overlap Reconciliation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Upload Mode Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#070b13] rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveUploadTab('files')}
            className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeUploadTab === 'files'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileArchive className="h-4 w-4 text-amber-400" />
            <span>Files &amp; Archives</span>
          </button>

          <button
            onClick={() => setActiveUploadTab('folder')}
            className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeUploadTab === 'folder'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderOpen className="h-4 w-4 text-cyan-400" />
            <span>Folder Upload</span>
          </button>

          <button
            onClick={() => setActiveUploadTab('paste')}
            className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeUploadTab === 'paste'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardCheck className="h-4 w-4 text-emerald-400" />
            <span>Paste OHLCV</span>
          </button>

          <button
            onClick={() => setActiveUploadTab('fundamentals')}
            className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeUploadTab === 'fundamentals'
                ? 'bg-slate-800 text-purple-300 shadow-sm border border-purple-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-purple-400" />
            <span>Cat, P/E &amp; Record Dates</span>
          </button>

          <button
            onClick={() => setActiveUploadTab('guide')}
            className={`py-1.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeUploadTab === 'guide'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            <span>Guide</span>
          </button>
        </div>

        {/* Incremental Merge Strategy Switcher */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-[#071322] to-[#081a28] border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-cyan-400" />
              <span className="font-bold text-white uppercase tracking-wider">
                Ingestion Strategy &amp; Overlap Handling:
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Cross-checks existing stored bars against uploaded bars to reconcile dates without losing history.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#070b13] p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setMergeStrategy('incremental_merge')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                mergeStrategy === 'incremental_merge'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Check className="h-3 w-3" />
              <span>Incremental Merge (Stitch)</span>
            </button>
            <button
              onClick={() => setMergeStrategy('replace_all')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                mergeStrategy === 'replace_all'
                  ? 'bg-rose-500 text-white font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Clean Replace All</span>
            </button>
          </div>
        </div>

        {/* TAB 1: FILES & ARCHIVES DRAG & DROP (ZIP, RAR, EXCEL, CSV, TXT) */}
        {activeUploadTab === 'files' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.rar,.tar.gz,.csv,.tsv,.txt,.xlsx,.xls,.xlsm,.xlsb,.dat,.prn,.afl"
              multiple
              className="hidden"
              onChange={e => handleProcessFiles(e.target.files)}
            />

            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={async e => {
                e.preventDefault();
                setIsDragging(false);
                const extracted = await extractFilesFromDataTransfer(e.dataTransfer);
                if (extracted.length > 0) {
                  handleProcessFiles(extracted);
                } else {
                  handleProcessFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-7 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-500/10'
                  : 'border-slate-700 hover:border-cyan-400 bg-[#070b13]'
              }`}
            >
              {isProcessing ? (
                <div className="py-4 space-y-2 flex flex-col items-center">
                  <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" />
                  <div className="text-sm font-bold text-white">
                    Unpacking, Ingesting &amp; Cross-Checking Overlapping Data...
                  </div>
                  <p className="text-xs text-slate-400 font-sans">
                    Matching dates with stored bars, sorting chronologically &amp; recalculating ML predictions
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <FileArchive className="h-7 w-7" />
                    </span>
                    <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <FileSpreadsheet className="h-7 w-7" />
                    </span>
                    <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      <FileText className="h-7 w-7" />
                    </span>
                    <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/30">
                      <FolderOpen className="h-7 w-7" />
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      Drop Files or Folders Here, or Click to Browse
                    </div>
                    <p className="text-xs text-slate-400 font-sans mt-1">
                      Supports ZIP, RAR, Excel (.xlsx/.xls/.xlsm), CSV, TXT files, and whole folders with automatic recursion
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      .ZIP &bull; .RAR &bull; .TAR.GZ
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Excel .XLSX &bull; .XLS &bull; .XLSM
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      CSV &bull; TSV &bull; TXT &bull; DAT &bull; PRN
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FOLDER DIRECT UPLOAD & RECURSIVE INGESTION */}
        {activeUploadTab === 'folder' && (
          <div className="space-y-4">
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={e => handleProcessFiles(e.target.files)}
            />

            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={async e => {
                e.preventDefault();
                setIsDragging(false);
                const extracted = await extractFilesFromDataTransfer(e.dataTransfer);
                if (extracted.length > 0) {
                  handleProcessFiles(extracted);
                } else {
                  handleProcessFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => folderInputRef.current?.click()}
              className={`p-7 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-500/10'
                  : 'border-slate-700 hover:border-cyan-400 bg-[#070b13]'
              }`}
            >
              {isProcessing ? (
                <div className="py-4 space-y-2 flex flex-col items-center">
                  <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" />
                  <div className="text-sm font-bold text-white">
                    Recursively Ingesting Folder &amp; Parsing All Mixed Formats...
                  </div>
                  <p className="text-xs text-slate-400 font-sans">
                    Extracting ZIP archives, reading Excel spreadsheets, and compiling CSV/TXT ticker quotes
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      <FolderOpen className="h-8 w-8" />
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Drop Stock Data Folder Here, or Click to Browse Directory
                    </h4>
                    <p className="text-xs text-slate-400 font-sans mt-1">
                      Recursively scans all subfolders &amp; automatically parses any mix of <strong className="text-cyan-300">ZIP</strong>, <strong className="text-emerald-300">CSV</strong>, <strong className="text-amber-300">Excel</strong>, and <strong className="text-purple-300">TXT</strong> files
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 text-[10px]">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1">
                      <FolderOpen className="h-3 w-3" /> Nested Folders
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                      <FileArchive className="h-3 w-3" /> ZIP / RAR Inside
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                      <FileSpreadsheet className="h-3 w-3" /> Excel (.xlsx/.xls)
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-teal-950/60 text-teal-300 border border-teal-500/30 font-bold flex items-center gap-1">
                      <FileText className="h-3 w-3" /> CSV / AmiBroker TXT
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-sans text-slate-300 space-y-1.5">
              <div className="font-mono text-cyan-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Multi-Format Folder Ingestion Features:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                <li><strong className="text-slate-200">ZIP Archives Inside Folder:</strong> Automatically unpacks and extracts all internal quote records.</li>
                <li><strong className="text-slate-200">Excel Workbooks (.xlsx, .xls, .xlsm):</strong> Reads DSE daily quote sheets or exploration exports.</li>
                <li><strong className="text-slate-200">CSV &amp; AmiBroker Ticker Files:</strong> Ingests individual ticker files or multi-ticker tables with smart header discovery.</li>
                <li><strong className="text-slate-200">Safe Fault-Tolerance:</strong> Non-candle system files in the folder are automatically filtered without crashing.</li>
              </ul>
            </div>

            <button
              onClick={() => folderInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950 transition-all cursor-pointer"
            >
              <FolderOpen className="h-4 w-4" />
              <span>Select Stock Data Folder from Computer</span>
            </button>
          </div>
        )}

        {/* TAB 3: DIRECT CLIPBOARD PASTE (AMIBROKER EXPLORATION / QUOTE TABLE) */}
        {activeUploadTab === 'paste' && (
          <div className="space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <ClipboardCheck className="h-4 w-4 text-emerald-400" />
                <span>Paste AmiBroker Exploration or Quotation Output</span>
              </span>
              <span className="text-[11px] text-cyan-400 font-bold">
                Auto-Infers Columns With or Without Headers
              </span>
            </div>

            <textarea
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              placeholder="Paste rows copied directly from AmiBroker Analysis table, Excel, or CSV here...
With or Without Column Headers (Tab, Comma, or Space separated):
SQURPHARMA, 2026-10-18, 223.0, 226.5, 222.0, 224.8, 1845200, 41.5
BATBC, 2026-10-18, 525.0, 531.0, 524.5, 528.6, 1240000, 31.7
BEXIMCO, 2026-10-18, 114.5, 117.0, 113.8, 116.2, 2840000, 32.9"
              rows={6}
              className="w-full p-3 rounded-xl bg-[#070b13] border border-slate-800 text-xs font-mono text-slate-200 focus:outline-hidden focus:border-cyan-400 resize-none"
            />

            <button
              onClick={handleProcessPastedText}
              disabled={!pastedText.trim() || isProcessing}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
            >
              {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>Parse &amp; Cross-Check Pasted AmiBroker Data</span>
            </button>
          </div>
        )}

        {/* TAB 4: FUNDAMENTALS, CATEGORY (A/B/Z) & RECORD DATES CSV/PASTE */}
        {activeUploadTab === 'fundamentals' && (
          <div className="space-y-3 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-purple-300 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  <span>Enrich DSE Category (A/B/Z), Audited P/E, Float % &amp; Record Dates</span>
                </span>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                  Persisted locally ({savedFundamentalsCount} verified symbols saved) and automatically merged onto OHLCV stocks &amp; future uploads.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  ref={fundFileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={e => handleFundamentalsFileUpload(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fundFileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold cursor-pointer"
                >
                  Load CSV File
                </button>
                <button
                  type="button"
                  onClick={handleDownloadFundamentalsTemplate}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold cursor-pointer"
                >
                  Template CSV
                </button>
              </div>
            </div>

            <textarea
              value={fundamentalsText}
              onChange={e => setFundamentalsText(e.target.value)}
              placeholder={`Symbol, Category, PE, FreeFloatPct, MarketCapCr, RecordDate, CashDivPct, BonusPct, AgmDate
SQURPHARMA, A, 9.8, 65.2, 19925, 2026-11-26, 110, 0, 2026-12-18
GP, A, 12.4, 10.0, 45120, 2026-11-30, 160, 0, 2026-12-22
EMERALDOIL, Z, 68.0, 48.0, 320, , , ,`}
              rows={5}
              className="w-full p-3 rounded-xl bg-[#070b13] border border-slate-800 text-xs font-mono text-slate-200 focus:outline-hidden focus:border-purple-400 resize-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleParseFundamentalsText(fundamentalsText)}
                  disabled={!fundamentalsText.trim()}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  Parse &amp; Preview Rows
                </button>
                {savedFundamentalsCount > 0 && onClearFundamentals && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearFundamentals();
                      setSavedFundamentalsCount(0);
                      setParsedFundamentals(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer"
                  >
                    Clear Saved ({savedFundamentalsCount})
                  </button>
                )}
              </div>

              {parsedFundamentals && (
                <button
                  type="button"
                  onClick={handleCommitFundamentals}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Apply {parsedFundamentals.records.length} Symbols &amp; Rescore ML</span>
                </button>
              )}
            </div>

            {parsedFundamentals && (
              <div className="p-3 rounded-xl bg-[#070b13] border border-purple-500/30 space-y-2 text-[11px]">
                <div className="flex items-center justify-between text-emerald-300 font-bold">
                  <span>Parsed {parsedFundamentals.records.length} Fundamental / Corporate Action Records</span>
                  {parsedFundamentals.warnings.length > 0 && (
                    <span className="text-amber-300">{parsedFundamentals.warnings.length} row warnings</span>
                  )}
                </div>
                <div className="max-h-36 overflow-y-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-slate-900/80 text-slate-400">
                      <tr>
                        <th className="py-1 px-2">Symbol</th>
                        <th className="py-1 px-2">Cat</th>
                        <th className="py-1 px-2">P/E</th>
                        <th className="py-1 px-2">Float %</th>
                        <th className="py-1 px-2">Record Date</th>
                        <th className="py-1 px-2">Div (Cash/Bonus)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {parsedFundamentals.records.slice(0, 25).map(r => (
                        <tr key={r.symbol}>
                          <td className="py-1 px-2 font-bold text-white">{r.symbol}</td>
                          <td className={`py-1 px-2 font-bold ${r.category === 'Z' ? 'text-rose-400' : 'text-emerald-300'}`}>
                            {r.category ?? '—'}
                          </td>
                          <td className="py-1 px-2 text-slate-300">{r.pe !== undefined ? `${r.pe}x` : '—'}</td>
                          <td className="py-1 px-2 text-slate-300">{r.freeFloatPct !== undefined ? `${r.freeFloatPct}%` : '—'}</td>
                          <td className="py-1 px-2 text-amber-300">{r.recordDate ?? '—'}</td>
                          <td className="py-1 px-2 text-cyan-300">
                            {r.dividendCashPct || r.dividendBonusPct
                              ? `${r.dividendCashPct ?? 0}% C / ${r.dividendBonusPct ?? 0}% B`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: AMIBROKER GUIDE & SUPPORTED FORMATS */}
        {activeUploadTab === 'guide' && (
          <div className="p-4 rounded-xl bg-[#070b13] border border-slate-800 text-xs text-slate-300 space-y-3 font-sans">
            <h4 className="font-mono font-bold text-cyan-400 text-sm">
              AmiBroker Data Export &amp; Ingestion Instructions:
            </h4>
            <div className="space-y-2 text-[11px] text-slate-400 font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-white font-bold block">1. Incremental Daily/Weekly Updates:</span>
                <p className="font-sans text-slate-300">
                  When you upload today's new quotation file, the system matches each ticker's existing bars by date. Overlapping dates are cross-checked and verified; new incremental sessions are appended chronologically. Existing stocks not in the upload remain fully intact.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-white font-bold block">2. Standard AmiBroker ASCII Formats:</span>
                <code className="text-cyan-300 block">&lt;TICKER&gt;,&lt;DTYYYYMMDD&gt;,&lt;OPEN&gt;,&lt;HIGH&gt;,&lt;LOW&gt;,&lt;CLOSE&gt;,&lt;VOL&gt;</code>
                <p className="font-sans text-slate-300">
                  Angle brackets or raw headers are automatically parsed. Single-ticker files (e.g. <code className="text-white">BATBC.txt</code>) with only Date and OHLCV automatically derive the symbol from the filename.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-white font-bold block">3. Archive Formats:</span>
                <p className="font-sans text-slate-300">
                  You can upload compressed <strong className="text-white">.ZIP</strong>, <strong className="text-white">.RAR</strong>, or <strong className="text-white">.TAR.GZ</strong> archives containing any number of CSV, TXT, Excel, or DAT files.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2 font-mono">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* RECONCILIATION & OVERLAP CROSS-CHECK AUDIT REPORT */}
        {summary && mergedResult && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/20 via-[#071322] to-cyan-950/30 border border-emerald-500/40 space-y-3 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                <CheckCircle2 className="h-4 w-4" />
                <span>Incremental Stitching &amp; Overlap Cross-Check Complete</span>
              </div>
              <span className="text-[11px] text-cyan-300 font-bold">
                Strategy: {mergedResult.report.strategy === 'incremental_merge' ? 'Incremental Merge (Stitched)' : 'Clean Replace'}
              </span>
            </div>

            {/* Folder Ingestion Format Breakdown */}
            {folderStats && folderStats.totalFiles > 1 && (
              <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-[#070b13] border border-slate-800 text-[11px]">
                <span className="text-slate-400 font-bold">Folder Contents Parsed:</span>
                <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                  {folderStats.totalFiles} files scanned
                </span>
                {folderStats.zipCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                    {folderStats.zipCount} ZIP archive{folderStats.zipCount > 1 ? 's' : ''}
                  </span>
                )}
                {folderStats.excelCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                    {folderStats.excelCount} Excel spreadsheet{folderStats.excelCount > 1 ? 's' : ''}
                  </span>
                )}
                {folderStats.csvTxtCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-teal-950/60 text-teal-300 border border-teal-800/40">
                    {folderStats.csvTxtCount} CSV/TXT file{folderStats.csvTxtCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}

            {/* Reconciliation KPI Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#070b13] border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">NEW BARS ADDED</span>
                <span className="text-base font-bold text-emerald-400">
                  +{mergedResult.report.newIncrementalBarsAdded.toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-500 block">Incremental Sessions</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#070b13] border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">OVERLAPPING CHECKED</span>
                <span className="text-base font-bold text-cyan-300">
                  {mergedResult.report.overlappingBarsCrossChecked.toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  {mergedResult.report.overlappingBarsUpdated > 0
                    ? `${mergedResult.report.overlappingBarsUpdated} updated with latest`
                    : '100% matched & verified'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#070b13] border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">SYMBOLS RECONCILED</span>
                <span className="text-base font-bold text-white">
                  {mergedResult.report.totalSymbols} Total
                </span>
                <span className="text-[9px] text-emerald-400 block">
                  {mergedResult.report.existingSymbolsUpdatedCount} updated &bull; {mergedResult.report.newSymbolsCount} new
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#070b13] border border-amber-500/30">
                <span className="text-[10px] text-amber-400 font-bold block mb-0.5">FED UP TO DATE</span>
                <span className="text-xs font-bold text-amber-300 block truncate">
                  {mergedResult.report.dateRange.end}
                </span>
                <span className="text-[9px] text-slate-400 block">
                  {mergedResult.report.totalBarsAfter.toLocaleString()} Total Bars
                </span>
              </div>
            </div>

            {/* Data Consistency & Schema Audit Panel */}
            {summary.consistencyReport && (
              <div className="p-3 rounded-xl bg-[#070b13] border border-cyan-500/30 space-y-2 text-[11px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-cyan-300">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Data Consistency &amp; Schema Verification</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                      {summary.consistencyReport.headeredFilesCount} Headered / {summary.consistencyReport.headerlessFilesCount} Headerless Inferred
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/40 text-emerald-300">
                      {summary.consistencyReport.validBarsAccepted.toLocaleString()} Valid / {summary.consistencyReport.totalRowsScanned.toLocaleString()} Scanned
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                  <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800">
                    <span className="text-slate-400 block">Rejected Rows</span>
                    <span className={`font-bold ${(summary.consistencyReport.invalidDateRows + summary.consistencyReport.invalidPriceRows + summary.consistencyReport.missingSymbolRows) > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
                      {(summary.consistencyReport.invalidDateRows + summary.consistencyReport.invalidPriceRows + summary.consistencyReport.missingSymbolRows).toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      {summary.consistencyReport.invalidDateRows} date &bull; {summary.consistencyReport.invalidPriceRows} price &bull; {summary.consistencyReport.missingSymbolRows} sym
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800">
                    <span className="text-slate-400 block">OHLC Bounds Fixed</span>
                    <span className={`font-bold ${summary.consistencyReport.ohlcRepairedCount > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
                      {summary.consistencyReport.ohlcRepairedCount.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-500 block">H&ge;O,C &amp; L&le;O,C enforced</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800">
                    <span className="text-slate-400 block">Duplicates Collapsed</span>
                    <span className="font-bold text-cyan-300">
                      {summary.consistencyReport.duplicatesCollapsedCount.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      {summary.consistencyReport.conflictingDuplicatesCount} price/vol diffs
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800">
                    <span className="text-slate-400 block">Value / Split Flags</span>
                    <span className={`font-bold ${(summary.consistencyReport.valueMismatchCount + summary.consistencyReport.extremeJumpWarnings.length) > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
                      {summary.consistencyReport.valueMismatchCount} val / {summary.consistencyReport.extremeJumpWarnings.length} jumps
                    </span>
                    <span className="text-[9px] text-slate-500 block">&gt;35% 1D price move check</span>
                  </div>
                </div>

                {(summary.consistencyReport.warnings.length > 0 || summary.consistencyReport.extremeJumpWarnings.length > 0) && (
                  <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[10px] text-amber-200 space-y-1">
                    {summary.consistencyReport.warnings.slice(0, 3).map((w, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </div>
                    ))}
                    {summary.consistencyReport.extremeJumpWarnings.slice(0, 3).map((jw, idx) => (
                      <div key={`jw-${idx}`} className="flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          Extreme 1D move in <strong>{jw.symbol}</strong> on {jw.date}: {jw.prevClose} &rarr; {jw.close} ({jw.changePct > 0 ? '+' : ''}{jw.changePct}%) — verify bonus/split or corrupt tick.
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {summary.consistencyReport.fileSummaries.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowSchemaAudit(!showSchemaAudit)}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <span>
                        {showSchemaAudit
                          ? 'Hide Per-File Schema & Column Mapping'
                          : `Inspect Per-File Schema & Column Mapping (${summary.consistencyReport.fileSummaries.length} file${summary.consistencyReport.fileSummaries.length > 1 ? 's' : ''})`}
                      </span>
                      {showSchemaAudit ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>

                    {showSchemaAudit && (
                      <div className="mt-2 max-h-40 overflow-y-auto border border-slate-800 rounded-lg bg-[#05080f] p-1.5 text-[10px]">
                        <table className="w-full text-left">
                          <thead className="text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="py-1 px-1.5">File</th>
                              <th className="py-1 px-1.5">Mode</th>
                              <th className="py-1 px-1.5">Date</th>
                              <th className="py-1 px-1.5">Mapped Columns</th>
                              <th className="py-1 px-1.5 text-right">Valid / Bad</th>
                              <th className="py-1 px-1.5 text-right">Value Unit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {summary.consistencyReport.fileSummaries.slice(0, 60).map((fs, idx) => (
                              <tr key={idx} className="hover:bg-slate-900/50">
                                <td className="py-1 px-1.5 text-white font-bold max-w-[140px] truncate" title={fs.fileName}>
                                  {fs.fileName}
                                </td>
                                <td className="py-1 px-1.5">
                                  <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${fs.headerMode === 'header_detected' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-cyan-500/15 text-cyan-300'}`}>
                                    {fs.headerMode === 'header_detected' ? 'HEADER' : 'INFERRED'}
                                  </span>
                                </td>
                                <td className="py-1 px-1.5 text-slate-300">{fs.dateOrder}</td>
                                <td className="py-1 px-1.5 text-slate-300">
                                  {fs.detectedColumns}
                                  {fs.ignoredExtraColumns > 0 && (
                                    <span className="text-slate-500 ml-1">(+{fs.ignoredExtraColumns} extra ignored)</span>
                                  )}
                                </td>
                                <td className="py-1 px-1.5 text-right">
                                  <span className="text-emerald-400">{fs.validBars}</span>
                                  {' / '}
                                  <span className={fs.rejectedRows > 0 ? 'text-amber-400' : 'text-slate-500'}>{fs.rejectedRows}</span>
                                </td>
                                <td className="py-1 px-1.5 text-right text-amber-300">{fs.valueUnit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Drilldown Table Toggle */}
            <div className="pt-1">
              <button
                onClick={() => setShowDrilldown(!showDrilldown)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>{showDrilldown ? 'Hide Per-Symbol Cross-Check Details' : 'View Per-Symbol Cross-Check Audit Details'}</span>
                {showDrilldown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showDrilldown && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-slate-800 rounded-xl bg-[#070b13] p-2 text-[10px]">
                  <table className="w-full text-left">
                    <thead className="text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-1 px-2">Symbol</th>
                        <th className="py-1 px-2">Status</th>
                        <th className="py-1 px-2">Prev Bars</th>
                        <th className="py-1 px-2">Uploaded</th>
                        <th className="py-1 px-2">New Added</th>
                        <th className="py-1 px-2">Overlapped</th>
                        <th className="py-1 px-2">Final Bars</th>
                        <th className="py-1 px-2">Latest Close</th>
                        <th className="py-1 px-2 text-right">Trade Volume (Shares)</th>
                        <th className="py-1 px-2 text-right">Trade Value (Turnover)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {mergedResult.report.symbolDetails.map((d, i) => (
                        <tr key={i} className="hover:bg-slate-900/60">
                          <td className="py-1 px-2 font-bold text-white">{d.symbol}</td>
                          <td className="py-1 px-2">
                            <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                              d.status === 'updated_incremental'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : d.status === 'new_symbol'
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {d.status === 'updated_incremental' ? 'STITCHED' : d.status === 'new_symbol' ? 'NEW' : 'PRESERVED'}
                            </span>
                          </td>
                          <td className="py-1 px-2 text-slate-400">{d.beforeBars}</td>
                          <td className="py-1 px-2 text-slate-300">{d.uploadedBars}</td>
                          <td className="py-1 px-2 text-emerald-400 font-bold">+{d.newBarsAdded}</td>
                          <td className="py-1 px-2 text-cyan-300">{d.overlappingMatched}</td>
                          <td className="py-1 px-2 font-bold text-white">{d.finalBars}</td>
                          <td className="py-1 px-2 text-emerald-300 font-mono">{d.latestPrice.toFixed(1)}</td>
                          <td className="py-1 px-2 text-right text-slate-300 font-mono">{(d.volume || 0).toLocaleString()}</td>
                          <td className="py-1 px-2 text-right text-amber-400 font-mono font-bold">
                            {d.turnoverCr !== undefined ? `৳${d.turnoverCr} Cr` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Sample Template</span>
            </button>
            <button
              onClick={() => {
                onRestorePreseeded();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer transition-colors"
            >
              Reset to Standard Pre-loaded DSE
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={!mergedResult}
              onClick={handleApplyData}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-lg shadow-emerald-950"
            >
              <span>Apply &amp; Run Screeners</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataUploadModal;
