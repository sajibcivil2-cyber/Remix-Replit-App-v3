/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, Trash2, Download, X } from 'lucide-react';

interface CleanDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClean: () => void;
  onExportBackup: () => void;
  symbolsCount: number;
}

export function CleanDatabaseModal({
  isOpen,
  onClose,
  onConfirmClean,
  onExportBackup,
  symbolsCount
}: CleanDatabaseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono">
      <div className="w-full max-w-md bg-[#0b111e] border border-rose-500/40 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Clean Stock Database</h3>
              <p className="text-xs text-rose-300 font-sans">Destructive action &bull; Reset to 0 symbols</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300 font-sans">
          <p>
            You are about to wipe the entire active stock database containing{' '}
            <strong className="text-white font-mono">{symbolsCount} symbols</strong>.
          </p>
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5 font-mono">
              <span>⚠ What this will do:</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
              <li>Remove all loaded stocks and candle bar history from memory</li>
              <li>Wipe persistent browser storage (IndexedDB &amp; LocalStorage)</li>
              <li>Reset screener metrics, ML inferences, and backtest results</li>
            </ul>
          </div>
          <p className="text-slate-400 text-[11px]">
            Tip: You can export a JSON backup first if you want to restore this data later.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onExportBackup}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 text-cyan-400" />
            <span>Export Backup First</span>
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmClean}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>Yes, Clean Database</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default CleanDatabaseModal;
