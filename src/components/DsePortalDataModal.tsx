/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Globe,
  TrendingUp,
  X,
  CheckCircle2,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { MarketBreadth } from '../types/dse';
import { INITIAL_MARKET_BREADTH } from '../lib/dseDataEngine';

interface DsePortalDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBreadth: MarketBreadth;
  onUpdateBreadth: (updated: MarketBreadth) => void;
  scannedStocksCount?: number;
  scannedAdvancing?: number;
  scannedDeclining?: number;
  scannedUnchanged?: number;
  scannedTurnoverCr?: number;
  scannedTradeVolumeMn?: number;
  scannedTotalShares?: number;
}

export const DsePortalDataModal: React.FC<DsePortalDataModalProps> = ({
  isOpen,
  onClose,
  currentBreadth,
  onUpdateBreadth,
  scannedStocksCount = 0,
  scannedAdvancing = 0,
  scannedDeclining = 0,
  scannedUnchanged = 0,
  scannedTurnoverCr = 0,
  scannedTradeVolumeMn = 0,
  scannedTotalShares = 0,
}) => {
  const [dsexIndex, setDsexIndex] = useState<number>(currentBreadth.dsexIndex > 3000 ? currentBreadth.dsexIndex : 5450.63);
  const [dsexChange, setDsexChange] = useState<number>(currentBreadth.dsexChange);
  const [dsexChangePct, setDsexChangePct] = useState<number>(currentBreadth.dsexChangePct);
  const [ds30Index, setDs30Index] = useState<number>(currentBreadth.ds30Index || 2068.63);
  const [ds30Change, setDs30Change] = useState<number>(currentBreadth.ds30Change ?? 12.45);
  const [ds30ChangePct, setDs30ChangePct] = useState<number>(currentBreadth.ds30ChangePct ?? 0.60);
  const [advancing, setAdvancing] = useState<number>(currentBreadth.advancing);
  const [declining, setDeclining] = useState<number>(currentBreadth.declining);
  const [unchanged, setUnchanged] = useState<number>(currentBreadth.unchanged);
  const [turnoverCr, setTurnoverCr] = useState<number>(currentBreadth.turnoverCr);
  const [tradeVolumeMn, setTradeVolumeMn] = useState<number>(currentBreadth.tradeVolumeMn ?? 0);
  const [sessionDate, setSessionDate] = useState<string>(currentBreadth.sessionDate || 'Active Session');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  // Real-time calculated breadth analytics
  const totalIssues = advancing + declining + unchanged;
  const adRatio = declining > 0 ? Math.round((advancing / declining) * 100) / 100 : advancing > 0 ? advancing : 0;
  const netBreadth = advancing - declining;
  const advancePct = totalIssues > 0 ? Math.round((advancing / totalIssues) * 1000) / 10 : 0;
  const declinePct = totalIssues > 0 ? Math.round((declining / totalIssues) * 1000) / 10 : 0;

  // Auto determine regime
  const computedRegime: 'BULLISH' | 'NEUTRAL' | 'CAUTION' | 'BEARISH' =
    adRatio >= 1.25 && dsexChange >= 0
      ? 'BULLISH'
      : adRatio >= 0.9
      ? 'NEUTRAL'
      : adRatio >= 0.65
      ? 'CAUTION'
      : 'BEARISH';

  const handleApply = () => {
    const updated: MarketBreadth = {
      dsexIndex,
      dsexChange,
      dsexChangePct,
      ds30Index,
      ds30Change,
      ds30ChangePct,
      advancing,
      declining,
      unchanged,
      turnoverCr,
      tradeVolumeMn,
      totalSharesTraded: Math.round(tradeVolumeMn * 1000000),
      sessionDate,
      isManualOverride: true,
      regime: computedRegime,
      regimeNote: `Official DSE Portal Override: DSEX ${dsexIndex.toFixed(2)} (${dsexChange >= 0 ? '+' : ''}${dsexChange.toFixed(2)}, ${dsexChangePct >= 0 ? '+' : ''}${dsexChangePct.toFixed(2)}%) | DS30 ${ds30Index.toFixed(2)} (${ds30Change >= 0 ? '+' : ''}${ds30Change.toFixed(2)}). Breadth: ${advancing} Adv / ${declining} Dec / ${unchanged} Unch (A/D: ${adRatio}x).`,
    };

    onUpdateBreadth(updated);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 900);
  };

  const handleSyncLiveDataset = () => {
    const liveAdv = scannedAdvancing;
    const liveDec = scannedDeclining;
    const liveUnch = scannedUnchanged;
    const liveTurnover = Math.round(scannedTurnoverCr * 100) / 100;
    const liveVolMn = Math.round(scannedTradeVolumeMn * 100) / 100;
    const liveAd = liveDec > 0 ? liveAdv / liveDec : liveAdv > 0 ? 2.0 : 1.0;
    const liveRegime: MarketBreadth['regime'] =
      liveAd >= 1.25 && dsexChange >= 0
        ? 'BULLISH'
        : liveAd >= 0.9
        ? 'NEUTRAL'
        : liveAd >= 0.65
        ? 'CAUTION'
        : 'BEARISH';

    const updated: MarketBreadth = {
      ...currentBreadth,
      dsexIndex,
      dsexChange,
      dsexChangePct,
      ds30Index,
      ds30Change,
      ds30ChangePct,
      advancing: liveAdv,
      declining: liveDec,
      unchanged: liveUnch,
      turnoverCr: liveTurnover,
      tradeVolumeMn: liveVolMn,
      totalSharesTraded: scannedTotalShares || Math.round(liveVolMn * 1000000),
      isManualOverride: false,
      regime: liveRegime,
      regimeNote: `Live Dataset Sync: ${liveAdv} Adv / ${liveDec} Dec / ${liveUnch} Unch | Trade Value: ৳${liveTurnover.toFixed(2)} Cr.`,
    };
    onUpdateBreadth(updated);
    onClose();
  };

  const handleResetYesterdayPortal = () => {
    setDsexIndex(INITIAL_MARKET_BREADTH.dsexIndex);
    setDsexChange(INITIAL_MARKET_BREADTH.dsexChange);
    setDsexChangePct(INITIAL_MARKET_BREADTH.dsexChangePct);
    setDs30Index(INITIAL_MARKET_BREADTH.ds30Index ?? 2068.63);
    setDs30Change(INITIAL_MARKET_BREADTH.ds30Change ?? 12.45);
    setDs30ChangePct(INITIAL_MARKET_BREADTH.ds30ChangePct ?? 0.60);
    setAdvancing(INITIAL_MARKET_BREADTH.advancing);
    setDeclining(INITIAL_MARKET_BREADTH.declining);
    setUnchanged(INITIAL_MARKET_BREADTH.unchanged);
    setTurnoverCr(INITIAL_MARKET_BREADTH.turnoverCr);
    setTradeVolumeMn(INITIAL_MARKET_BREADTH.tradeVolumeMn ?? 162.48);
    setSessionDate(INITIAL_MARKET_BREADTH.sessionDate || 'Reference Portal');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-mono">
      <div className="bg-[#0b111e] border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Globe className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Official DSE Portal Benchmark &amp; Market Breadth
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Dhaka Stock Exchange (DSE) official closing index, turnover and market-wide advance/decline breadth
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Active Official Portal Stats Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl bg-[#070b13] border border-cyan-500/30">
          <div className="space-y-1">
            <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold">
              Official DSEX Broad Index
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-white">{dsexIndex.toFixed(2)}</span>
              <span
                className={`text-xs font-bold flex items-center ${
                  dsexChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {dsexChange >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {dsexChange >= 0 ? '+' : ''}
                {dsexChange.toFixed(2)} ({dsexChangePct >= 0 ? '+' : ''}
                {dsexChangePct.toFixed(2)}%)
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-sans block">
              Market-Wide Benchmark (~5,450)
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-bold">
              DS30 Blue-Chip Index
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-white">{ds30Index.toFixed(2)}</span>
              <span
                className={`text-xs font-bold flex items-center ${
                  ds30Change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {ds30Change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {ds30Change >= 0 ? '+' : ''}
                {ds30Change.toFixed(2)} ({ds30ChangePct >= 0 ? '+' : ''}
                {ds30ChangePct.toFixed(2)}%)
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-sans block">
              Top 30 Liquid Equities (~2,068)
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold">
              Market Breadth (A/D)
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>{advancing} Adv</span>
              </div>
              <div className="flex items-center gap-1 text-rose-400 font-bold text-xs">
                <ArrowDownRight className="h-3.5 w-3.5" />
                <span>{declining} Dec</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400 font-bold text-xs">
                <Minus className="h-3.5 w-3.5" />
                <span>{unchanged} Unch</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-300 font-sans flex items-center gap-1.5">
              <span>Ratio: <strong className="text-emerald-400 font-mono">{adRatio}x</strong></span>
              <span>&bull;</span>
              <span>Net: <strong className="text-emerald-400 font-mono">+{netBreadth}</strong></span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">
                Total Turnover
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                Crore BDT
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-amber-400 font-mono">৳{turnoverCr.toFixed(2)} Cr</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block">
              {(turnoverCr * 10).toFixed(2)} Million BDT
            </span>
          </div>
        </div>

        {/* Breadth Distribution Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-300">
            <span className="text-emerald-400 font-bold">Advancing: {advancePct}% ({advancing})</span>
            <span className="text-slate-400 font-bold">Unchanged: {unchanged}</span>
            <span className="text-rose-400 font-bold">Declining: {declinePct}% ({declining})</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
            <div
              style={{ width: `${advancePct}%` }}
              className="bg-emerald-500 h-full transition-all duration-300"
              title={`Advancing: ${advancing}`}
            />
            <div
              style={{ width: `${100 - advancePct - declinePct}%` }}
              className="bg-slate-600 h-full transition-all duration-300"
              title={`Unchanged: ${unchanged}`}
            />
            <div
              style={{ width: `${declinePct}%` }}
              className="bg-rose-500 h-full transition-all duration-300"
              title={`Declining: ${declining}`}
            />
          </div>
        </div>

        {/* Scanned Universe vs Full Portal Breadth Note */}
        {scannedStocksCount > 0 && (
          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs flex flex-wrap items-center justify-between gap-3 text-purple-300">
            <div className="flex items-center gap-2 font-sans">
              <Layers className="h-4 w-4 text-purple-400 shrink-0" />
              <span>
                Active session dataset: <strong>{scannedStocksCount} scrips</strong> ({scannedAdvancing} Adv, {scannedDeclining} Dec, {scannedUnchanged} Unch &bull; ৳{scannedTurnoverCr.toFixed(2)} Cr &bull; {scannedTradeVolumeMn.toFixed(2)}M Shs).
              </span>
            </div>
            <button
              type="button"
              onClick={handleSyncLiveDataset}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono font-bold text-[11px] cursor-pointer transition-colors"
            >
              Sync Live from Dataset
            </button>
          </div>
        )}

        {/* Input Fields to Fine-tune or Update Official Figures */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            Update / Edit Official Figures
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* DSEX Index */}
            <div className="space-y-1">
              <label className="text-cyan-400 text-[11px] font-bold">DSEX Broad Index Value (~5,450)</label>
              <input
                type="number"
                step="0.01"
                value={dsexIndex}
                onChange={e => setDsexIndex(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* DSEX Point Change */}
            <div className="space-y-1">
              <label className="text-slate-400 text-[11px]">DSEX Point Change (+/-)</label>
              <input
                type="number"
                step="0.01"
                value={dsexChange}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  setDsexChange(val);
                  if (dsexIndex > 0) {
                    setDsexChangePct(Math.round((val / (dsexIndex - val)) * 10000) / 100);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* DSEX Percentage Change */}
            <div className="space-y-1">
              <label className="text-slate-400 text-[11px]">DSEX Change %</label>
              <input
                type="number"
                step="0.01"
                value={dsexChangePct}
                onChange={e => setDsexChangePct(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* DS30 Blue-Chip Index */}
            <div className="space-y-1">
              <label className="text-indigo-400 text-[11px] font-bold">DS30 Blue-Chip Value (~2,068)</label>
              <input
                type="number"
                step="0.01"
                value={ds30Index}
                onChange={e => setDs30Index(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:border-indigo-400 focus:outline-none"
              />
            </div>

            {/* DS30 Point Change */}
            <div className="space-y-1">
              <label className="text-slate-400 text-[11px]">DS30 Point Change (+/-)</label>
              <input
                type="number"
                step="0.01"
                value={ds30Change}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  setDs30Change(val);
                  if (ds30Index > 0) {
                    setDs30ChangePct(Math.round((val / (ds30Index - val)) * 10000) / 100);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:border-indigo-400 focus:outline-none"
              />
            </div>

            {/* DS30 Percentage Change */}
            <div className="space-y-1">
              <label className="text-slate-400 text-[11px]">DS30 Change %</label>
              <input
                type="number"
                step="0.01"
                value={ds30ChangePct}
                onChange={e => setDs30ChangePct(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:border-indigo-400 focus:outline-none"
              />
            </div>

            {/* Advancing Stocks */}
            <div className="space-y-1">
              <label className="text-emerald-400 text-[11px] font-bold">Advancing Stocks (Adv)</label>
              <input
                type="number"
                value={advancing}
                onChange={e => setAdvancing(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-emerald-500/50 text-emerald-300 font-mono font-bold focus:border-emerald-400 focus:outline-none"
              />
            </div>

            {/* Declining Stocks */}
            <div className="space-y-1">
              <label className="text-rose-400 text-[11px] font-bold">Declining Stocks (Dec)</label>
              <input
                type="number"
                value={declining}
                onChange={e => setDeclining(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-rose-500/50 text-rose-300 font-mono font-bold focus:border-rose-400 focus:outline-none"
              />
            </div>

            {/* Unchanged Stocks */}
            <div className="space-y-1">
              <label className="text-slate-400 text-[11px]">Unchanged Stocks (Unch)</label>
              <input
                type="number"
                value={unchanged}
                onChange={e => setUnchanged(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-mono font-bold focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Daily Turnover Cr & Mn */}
            <div className="space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-amber-400 text-[11px] font-bold">Total DSE Market Turnover</label>
                {scannedTurnoverCr > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTurnoverCr(Math.round(scannedTurnoverCr * 100) / 100);
                      setTradeVolumeMn(Math.round(scannedTradeVolumeMn * 100) / 100);
                    }}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-mono cursor-pointer"
                  >
                    Use Dataset Sum (৳{scannedTurnoverCr.toFixed(2)} Cr)
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={turnoverCr}
                    onChange={e => setTurnoverCr(parseFloat(e.target.value) || 0)}
                    placeholder="Crore BDT"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 font-mono font-bold focus:border-amber-400 focus:outline-none pr-10"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] text-amber-500/70 font-mono">Cr</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={turnoverCr > 0 ? (turnoverCr * 10).toFixed(1) : ''}
                    onChange={e => {
                      const mn = parseFloat(e.target.value) || 0;
                      setTurnoverCr(Math.round((mn / 10) * 100) / 100);
                    }}
                    placeholder="Million BDT"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-mono font-bold focus:border-cyan-400 focus:outline-none pr-10"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-mono">Mn</span>
                </div>
              </div>
            </div>

            {/* Total Volume (Million Shares) */}
            <div className="space-y-1">
              <label className="text-cyan-400 text-[11px] font-bold">Trade Volume (Million Shares)</label>
              <input
                type="number"
                step="0.01"
                value={tradeVolumeMn}
                onChange={e => setTradeVolumeMn(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 font-mono font-bold focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Calculated Regime */}
            <div className="space-y-1 sm:col-span-3">
              <label className="text-slate-400 text-[11px]">Computed Regime</label>
              <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 font-bold text-center">
                {computedRegime}
              </div>
            </div>
          </div>
        </div>

        {/* Quantitative Edge Commentary */}
        <div className="p-3.5 rounded-xl bg-[#070b13] border border-slate-800 text-xs text-slate-300 space-y-2 font-sans">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold font-mono">
            <Info className="h-4 w-4" />
            <span>Why Accurate Turnover &amp; Breadth Maximize Trade Profitability:</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            By default, market breadth (<strong className="text-emerald-400">Adv / Dec / Unch</strong>) and <strong className="text-amber-400">Trade Value / Volume</strong> compute dynamically from the active session in your uploaded DSE dataset. Use manual overrides here only when you want to inject official exchange portal closing numbers for partial watchlists.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={handleResetYesterdayPortal}
            type="button"
            className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Load Sample Portal Reference (৳{INITIAL_MARKET_BREADTH.turnoverCr.toFixed(2)} Cr)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              type="button"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{saveSuccess ? 'Override Applied!' : 'Apply Manual Override'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DsePortalDataModal;
