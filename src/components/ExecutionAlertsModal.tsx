/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  Zap,
  AlertTriangle,
  Target,
  ArrowUpRight,
  TrendingUp,
  ShieldAlert,
  Bell,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { DseStockItem, LiveExecutionAlert } from '../types/dse';

interface ExecutionAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: LiveExecutionAlert[];
  stocks: DseStockItem[];
  onSelectStock: (stock: DseStockItem) => void;
}

export function ExecutionAlertsModal({
  isOpen,
  onClose,
  alerts,
  stocks,
  onSelectStock
}: ExecutionAlertsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono">
      <div className="w-full max-w-3xl bg-[#0b111e] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Live Algorithmic Execution Radar
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  {alerts.length} Active Triggers
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Real-time technical breakout, volatility squeeze, and profit-target execution alerts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Alerts List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {alerts.map(alert => {
            const stockObj = stocks.find(s => s.symbol === alert.symbol);
            const isCritical = alert.urgency === 'CRITICAL';
            const isHigh = alert.urgency === 'HIGH';

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all ${
                  isCritical
                    ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500'
                    : isHigh
                    ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500'
                    : 'bg-cyan-950/20 border-cyan-500/40 hover:border-cyan-500'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">{alert.symbol}</span>
                    <span className="text-xs text-slate-300">৳{alert.price.toFixed(1)}</span>
                    <span
                      className={`text-[11px] font-bold ${
                        alert.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {alert.changePct >= 0 ? '+' : ''}{alert.changePct}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : isHigh
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {alert.action}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {alert.timestamp}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 font-sans mb-3">{alert.message}</p>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div className="flex items-center gap-4 text-slate-400">
                    <span>
                      Target: <strong className="text-emerald-400 font-mono">৳{alert.targetPrice}</strong>
                    </span>
                    <span>
                      Stop: <strong className="text-rose-400 font-mono">৳{alert.stopLoss}</strong>
                    </span>
                  </div>

                  {stockObj && (
                    <button
                      onClick={() => {
                        onSelectStock(stockObj);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Open Chart & Execution Plan</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-cyan-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {alerts.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="font-sans text-sm">All setups operating within normal bounds.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#070b13] flex justify-between items-center text-xs text-slate-500 font-sans">
          <span>Dhaka Stock Exchange quantitative scan refreshed live</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold font-mono cursor-pointer"
          >
            Close Radar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExecutionAlertsModal;
