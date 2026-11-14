/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  Zap,
  Target,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  ArrowUpRight,
  TrendingDown,
  Info,
  Scale,
  BrainCircuit,
  Percent,
  Download,
  Copy,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { DseStockItem, TradeAccuracyAudit } from '../types/dse';
import { computeTradeAccuracyAudit } from '../lib/quantAnalyticsEngine';

interface TradeAccuracyAuditViewProps {
  stocks: DseStockItem[];
  onSelectStock?: (stock: DseStockItem) => void;
  entryTiming?: 'next_open' | 'signal_close';
  onChangeEntryTiming?: (mode: 'next_open' | 'signal_close') => void;
}

export function TradeAccuracyAuditView({
  stocks,
  onSelectStock,
  entryTiming,
  onChangeEntryTiming,
}: TradeAccuracyAuditViewProps) {
  const [copied, setCopied] = useState(false);
  const [selectedFactorCategory, setSelectedFactorCategory] = useState<string>('All');
  const [internalEntryTiming, setInternalEntryTiming] = useState<'next_open' | 'signal_close'>('next_open');

  const activeEntryTiming = entryTiming ?? internalEntryTiming;
  const setEntryTiming = (mode: 'next_open' | 'signal_close') => {
    if (onChangeEntryTiming) onChangeEntryTiming(mode);
    else setInternalEntryTiming(mode);
  };

  const auditData: TradeAccuracyAudit = useMemo(() => {
    return computeTradeAccuracyAudit(stocks, activeEntryTiming);
  }, [stocks, activeEntryTiming]);

  const filteredFactors = useMemo(() => {
    if (selectedFactorCategory === 'All') return auditData.factorAttributions;
    return auditData.factorAttributions.filter(f => f.category === selectedFactorCategory);
  }, [auditData.factorAttributions, selectedFactorCategory]);

  const copyReportToClipboard = () => {
    const expPrefix = auditData.mathematicalExpectancyPct >= 0 ? '+' : '';
    const factorLines = auditData.factorAttributions
      .map((f, i) => `${i + 1}. ${f.factor} (Edge: ${f.alphaEdgePct >= 0 ? '+' : ''}${f.alphaEdgePct}%, Win: ${f.winRateWithFactor}%)`)
      .join('\n');

    const executionLabel = activeEntryTiming === 'next_open'
      ? 'Next-Open Fill (+4% Max Gap Cap)'
      : 'Signal-Day Close Fill';
    const reportText = `=== DSE QUANT ENGINE - EMPIRICAL POINT-IN-TIME AUDIT (${executionLabel}, 100% BO CASH-CAPPED MAX 6 SLOTS, T+2 & 0.85% FEE) ===
Total Trades Audited: ${auditData.totalTradesAudited} (Bars Scanned: ${(auditData.barsScannedCount ?? 0).toLocaleString()})
Overall Win Rate (Directional Accuracy): ${auditData.overallWinRatePct}% (${auditData.winningTrades} Wins / ${auditData.losingTrades} Losses)
Composite Profit Factor: ${auditData.overallProfitFactor}x
Mathematical Expectancy: ${expPrefix}${auditData.mathematicalExpectancyPct}% per trade
Average Gain: +${auditData.avgGainPct}% | Average Loss: -${auditData.avgLossPct}%
Payoff Ratio: ${auditData.payoffRatio}:1
Max Drawdown: -${auditData.maxDrawdownPct}%
Sharpe Ratio: ${auditData.sharpeRatio} | Sortino Ratio: ${auditData.sortinoRatio}
ML Brier Calibration Score: ${auditData.brierScore} (Empirical PIT Probabilities)
Classification Precision: ${auditData.precisionPct}% | Sensitivity: ${auditData.sensitivityPct}%

EMPIRICAL TRADE SUCCESS FACTORS:
${factorLines}
========================================================================`;

    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const factorBarColors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6'];

  return (
    <div className="space-y-6 font-mono">
      {/* Header & Verification Badge */}
      <div className="p-5 rounded-2xl bg-[#0b111e] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Trade Suggestion Performance & Analytical Accuracy Audit
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                AUDITED & VERIFIED
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Empirical validation across 5 models &bull; {activeEntryTiming === 'next_open' ? 'Historical i+1 Open (+4% gap cap)' : 'Signal-Day Close'} &bull; 100% BO Cash (Max 6 Slots) &bull; DSEX Regime Gated
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[#070b13] p-1 rounded-xl border border-slate-800 text-[11px]">
            <button
              onClick={() => setEntryTiming('next_open')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                activeEntryTiming === 'next_open'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Simulates EOD scan tonight -> limit buy at next morning open (bar i+1, max +4% gap)"
            >
              Next-Open (i+1)
            </button>
            <button
              onClick={() => setEntryTiming('signal_close')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                activeEntryTiming === 'signal_close'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Simulates executing right before EOD close (2:20 PM intraday)"
            >
              Signal Close
            </button>
          </div>

          <button
            onClick={copyReportToClipboard}
            className="px-3.5 py-2 rounded-xl bg-[#070b13] border border-slate-700 hover:border-emerald-400 text-xs text-slate-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Audit Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-slate-400" />
                <span>Copy Full Audit Summary</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Accuracy & Success Factor Scorecard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Win Rate */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Accuracy (Win Rate)</span>
            <Target className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {auditData.overallWinRatePct}%
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            {auditData.winningTrades} Wins / {auditData.losingTrades} Stopped Out
          </div>
        </div>

        {/* Profit Factor */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Profit Factor</span>
            <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {auditData.overallProfitFactor}x
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Gross gains vs losses ratio
          </div>
        </div>

        {/* Mathematical Expectancy */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Expectancy / Trade</span>
            <Percent className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className={`text-2xl font-black tabular-nums ${auditData.mathematicalExpectancyPct >= 0 ? 'text-purple-400' : 'text-rose-400'}`}>
            {auditData.mathematicalExpectancyPct >= 0 ? '+' : ''}{auditData.mathematicalExpectancyPct}%
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Net of 0.85% DSE fee &amp; T+2 lock
          </div>
        </div>

        {/* Payoff Ratio */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Payoff Ratio</span>
            <Scale className="h-3.5 w-3.5 text-emerald-300" />
          </div>
          <div className="text-2xl font-black text-emerald-300">
            {auditData.payoffRatio}:1
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Avg Gain +{auditData.avgGainPct}% vs Loss -{auditData.avgLossPct}%
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Max Drawdown</span>
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            -{auditData.maxDrawdownPct}%
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Protected via trailing stops
          </div>
        </div>

        {/* ML Calibration / Brier Score */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Brier Calibration</span>
            <BrainCircuit className="h-3.5 w-3.5 text-cyan-300" />
          </div>
          <div className="text-2xl font-black text-cyan-300 tabular-nums">
            {auditData.brierScore}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Empirical PIT probability error
          </div>
        </div>
      </div>

      {/* Trade Success Factors Decomposition (The 6 Pillars of Edge) */}
      <div className="p-5 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>Trade Success Factors: Quantitative Edge Attribution</span>
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Empirical breakdown of which technical & machine learning factors create positive statistical expectancy on DSE
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            {['All', 'Volume & Flow', 'Trend & Structure', 'Volatility', 'Machine Learning', 'Sector Alignment'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedFactorCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedFactorCategory === cat
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white bg-[#070b13]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Factors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFactors.map((item, idx) => (
            <div
              key={item.factor}
              className="p-4 rounded-xl bg-[#070b13] border border-slate-800 hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-sans font-bold">
                    {item.category}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-1.5 leading-snug">
                    {item.factor}
                  </h4>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-base font-black tabular-nums ${item.alphaEdgePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.alphaEdgePct >= 0 ? '+' : ''}{item.alphaEdgePct}%
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans">Alpha Edge</div>
                </div>
              </div>

              {/* Visual edge comparison bar */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Win Rate With Factor:</span>
                  <span className="text-emerald-400 font-bold">{item.winRateWithFactor}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    style={{ width: `${item.winRateWithFactor}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>Without Factor (Baseline):</span>
                  <span>{item.winRateWithoutFactor}%</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 font-sans leading-relaxed pt-1 border-t border-slate-800/80">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Model Calibration & Classification Confusion Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ML Calibration Curve (Predicted Conviction vs Realized Win Rate) */}
        <div className="p-5 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-cyan-400" />
              <span>Machine Learning Probability Calibration Curve</span>
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Validates that higher predicted confidence scores strictly translate into higher empirical win frequency
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={auditData.calibrationBuckets} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="range" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#070b13', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                  formatter={(val: any, name: any) => [
                    `${val}%`,
                    name === 'predictedAvgPct' ? 'Predicted Probability' : 'Realized Win Rate'
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px' }}
                  formatter={(value) => value === 'predictedAvgPct' ? 'Predicted Conviction' : 'Actual Historical Win Rate'}
                />
                <Bar dataKey="predictedAvgPct" fill="#06b6d4" radius={[4, 4, 0, 0]} name="predictedAvgPct" />
                <Bar dataKey="actualWinPct" fill="#10b981" radius={[4, 4, 0, 0]} name="actualWinPct" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-xs">
            {auditData.calibrationBuckets.map(b => (
              <div key={b.range} className="p-2.5 rounded-xl bg-[#070b13] border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 truncate">{b.range}</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">{b.actualWinPct}% Win</div>
                <div className="text-[10px] text-cyan-400">{b.tradeCount} Signals</div>
              </div>
            ))}
          </div>
        </div>

        {/* Analytical Classification Confusion Matrix */}
        <div className="p-5 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Statistical Classification Matrix (Quality Verification)</span>
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Precision, Sensitivity, and False Positive rejection performance on trade suggestions
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* True Positive */}
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span>True Positives (TP)</span>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="text-xl font-black text-emerald-300">
                {auditData.winningTrades} Setups
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-tight">
                Accurately triggered signals that reached TP1 target profit or locked gains via trailing stop.
              </p>
            </div>

            {/* False Positive */}
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1">
              <div className="flex items-center justify-between text-rose-400 font-bold">
                <span>False Positives (FP)</span>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="text-xl font-black text-rose-300">
                {auditData.losingTrades} Setups
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-tight">
                Signals stopped out at hard -4.5% stop loss ceiling with strictly bounded capital risk.
              </p>
            </div>

            {/* True Negative */}
            <div className="p-3.5 rounded-xl bg-[#070b13] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-cyan-400 font-bold">
                <span>False Breakout Filters (TN)</span>
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="text-xl font-black text-cyan-300 tabular-nums">
                {(auditData.setupsFilteredOutCount ?? 0).toLocaleString()} Filtered
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-tight">
                {(auditData.barsScannedCount ?? 0).toLocaleString()} point-in-time daily bars scanned; Stage 4 downtrends &amp; weak-volume traps rejected.
              </p>
            </div>

            {/* Precision & Recall */}
            <div className="p-3.5 rounded-xl bg-[#070b13] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-purple-400 font-bold">
                <span>Precision & Sensitivity</span>
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="text-xl font-black text-purple-300 tabular-nums">
                {auditData.precisionPct}% / {auditData.sensitivityPct}%
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-tight">
                Empirical PIT signal fidelity across {auditData.totalTradesAudited} simulated executions.
              </p>
            </div>
          </div>

          {/* Mathematical Expectancy Formula Banner */}
          <div className="p-3.5 rounded-xl bg-[#070b13] border border-slate-800/80 text-xs font-sans space-y-1.5">
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-400 font-semibold">Mathematical Expectancy Formula:</span>
              <span className={`font-bold tabular-nums ${auditData.mathematicalExpectancyPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                E = {auditData.mathematicalExpectancyPct >= 0 ? '+' : ''}{auditData.mathematicalExpectancyPct}% / trade
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tabular-nums">
              E = ({auditData.overallWinRatePct}% &times; +{auditData.avgGainPct}%) - ({Math.round((100 - auditData.overallWinRatePct) * 10) / 10}% &times; {auditData.avgLossPct}%) = {auditData.mathematicalExpectancyPct >= 0 ? '+' : ''}{auditData.mathematicalExpectancyPct}%
            </p>
            <p className="text-[11px] text-slate-500">
              {auditData.mathematicalExpectancyPct >= 0
                ? 'Positive net expectancy after 0.85% DSE round-trip fees and T+2 settlement constraints.'
                : 'Negative expectancy under current stop/target rules — tighten entry selectivity or adjust target geometry.'}
            </p>
          </div>
        </div>
      </div>

      {/* Multi-Strategy Comparative Matrix */}
      <div className="p-5 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-400" />
            <span>Cross-Strategy Comparative Audit (Side-by-Side Performance)</span>
          </h3>
          <p className="text-xs text-slate-400 font-sans">
            Independent performance verification of each quantitative trading model running on your database
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#070b13] text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-3">Quantitative Strategy Model</th>
                <th className="py-3 px-3 text-center">Trades</th>
                <th className="py-3 px-3 text-right">Win Rate</th>
                <th className="py-3 px-3 text-right">Profit Factor</th>
                <th className="py-3 px-3 text-right">Total Net PnL</th>
                <th className="py-3 px-3 text-right">Max Drawdown</th>
                <th className="py-3 px-3 text-right">Sharpe Ratio</th>
                <th className="py-3 px-3 text-right">Avg Gain / Loss</th>
                <th className="py-3 px-3 text-center">Trade Success Factor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono">
              {auditData.strategyComparisons.map((summary, idx) => (
                <tr key={summary.strategyName} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>{summary.strategyName}</span>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-300 font-bold">{summary.totalTrades}</td>
                  <td className="py-3 px-3 text-right font-black text-emerald-400">{summary.winRatePct}%</td>
                  <td className="py-3 px-3 text-right font-bold text-cyan-400">{summary.profitFactor}x</td>
                  <td className={`py-3 px-3 text-right font-bold tabular-nums ${summary.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {summary.totalReturnPct >= 0 ? '+' : ''}{summary.totalReturnPct}%
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-amber-400 tabular-nums">-{summary.maxDrawdownPct}%</td>
                  <td className="py-3 px-3 text-right font-bold text-purple-400 tabular-nums">{summary.sharpeRatio}</td>
                  <td className="py-3 px-3 text-right text-slate-300 tabular-nums">
                    +{summary.avgGainPct}% / -{summary.avgLossPct}%
                  </td>
                  <td className="py-3 px-3 text-center font-sans">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
                      {idx === 0 && 'Volume RVOL Surge'}
                      {idx === 1 && 'Squeeze Expansion'}
                      {idx === 2 && 'Stage 2 Continuation'}
                      {idx === 3 && 'ML PIT Probability'}
                      {idx === 4 && '3D+ Continuous Uptrend'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
