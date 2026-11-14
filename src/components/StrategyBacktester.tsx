/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  BarChart2,
  ShieldCheck,
  Zap,
  Target,
  ArrowUpRight,
  TrendingDown,
  Info,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { DseStockItem, BacktestSummary, BacktestTrade } from '../types/dse';
import { runStrategyBacktest } from '../lib/quantAnalyticsEngine';
import { TradeAccuracyAuditView } from './TradeAccuracyAuditView';

interface StrategyBacktesterProps {
  stocks: DseStockItem[];
  onSelectStock: (stock: DseStockItem) => void;
}

export function StrategyBacktester({ stocks, onSelectStock }: StrategyBacktesterProps) {
  const [activeTab, setActiveTab] = useState<'audit' | 'simulation'>('audit');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('confluence_5');
  const [stopLossPct, setStopLossPct] = useState<number>(4.5);
  const [tp1Pct, setTp1Pct] = useState<number>(12.0);
  const [maxHoldingDays, setMaxHoldingDays] = useState<number>(20);
  const [useTrailingStop, setUseTrailingStop] = useState<boolean>(true);
  const [enforceDseMicrostructure, setEnforceDseMicrostructure] = useState<boolean>(true);
  const [entryTiming, setEntryTiming] = useState<'next_open' | 'signal_close'>('next_open');
  const [maxConcurrentPositions, setMaxConcurrentPositions] = useState<number>(6);
  const [maxEntryGapPct, setMaxEntryGapPct] = useState<number>(4.0);
  const [enforceDsexRegimeGate, setEnforceDsexRegimeGate] = useState<boolean>(true);
  const [tradeFilter, setTradeFilter] = useState<'all' | 'win' | 'loss'>('all');
  const [searchSymbol, setSearchSymbol] = useState<string>('');

  // Run backtest computation
  const backtestResult = useMemo(() => {
    const isCashCapped = maxConcurrentPositions > 0;
    return runStrategyBacktest(stocks, selectedStrategy, {
      stopLossPct,
      tp1Pct,
      maxHoldingDays,
      useTrailingStop,
      enforceT2Lock: enforceDseMicrostructure,
      roundTripFeePct: enforceDseMicrostructure ? 0.85 : 0,
      simulateCircuitLock: enforceDseMicrostructure,
      entryTiming,
      enforceCashCap: isCashCapped,
      maxConcurrentPositions: isCashCapped ? maxConcurrentPositions : 99,
      maxEntryGapPct,
      enforceDsexRegimeGate,
    });
  }, [
    stocks,
    selectedStrategy,
    stopLossPct,
    tp1Pct,
    maxHoldingDays,
    useTrailingStop,
    enforceDseMicrostructure,
    entryTiming,
    maxConcurrentPositions,
    maxEntryGapPct,
    enforceDsexRegimeGate,
  ]);

  // Filtered trades for trade log table
  const filteredTrades = useMemo(() => {
    return backtestResult.trades.filter(t => {
      if (tradeFilter === 'win' && !t.isWin) return false;
      if (tradeFilter === 'loss' && t.isWin) return false;
      if (searchSymbol.trim() && !t.symbol.toLowerCase().includes(searchSymbol.toLowerCase())) return false;
      return true;
    });
  }, [backtestResult.trades, tradeFilter, searchSymbol]);

  if (stocks.length === 0) {
    return (
      <div className="text-center py-20 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-4 font-mono">
        <div className="p-3 w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
          <BarChart2 className="h-7 w-7" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-white">Stock Database is Clean (0 Symbols Loaded)</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto font-sans">
          Upload your AmiBroker data, CSV, or ZIP archive to simulate and backtest quantitative trading strategies across historical daily bars.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono">
      {/* View Mode Switcher: Analytical Accuracy & Trade Success Audit vs Single-Strategy Simulation */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-[#0b111e] border border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 shadow-md shadow-emerald-950 font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Analytical Accuracy & Trade Success Factor Audit</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'audit' ? 'bg-slate-950 text-emerald-300' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              VERIFIED
            </span>
          </button>

          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'simulation'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 shadow-md shadow-emerald-950 font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            <span>Strategy Simulation & Equity Curve</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-sans px-2 hidden md:block">
          {activeTab === 'audit'
            ? 'Multi-model empirical audit, factor attribution, & calibration'
            : 'Interactive parameter tuning (Stop Loss, TP1, Trailing Stops, Max Holding)'}
        </div>
      </div>

      {activeTab === 'audit' ? (
        <TradeAccuracyAuditView
          stocks={stocks}
          onSelectStock={onSelectStock}
          entryTiming={entryTiming}
          onChangeEntryTiming={setEntryTiming}
        />
      ) : (
        <>
          {/* Backtester Header */}
          <div className="p-5 rounded-2xl bg-[#0b111e] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BarChart2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              Quantitative Strategy Backtest Engine
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Simulate quantitative algorithmic rules across historical bars &bull; Verify Profit Factor, Sharpe & Maximum Drawdown
            </p>
          </div>
        </div>

        {/* Strategy Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Strategy Model:</label>
          <select
            value={selectedStrategy}
            onChange={e => setSelectedStrategy(e.target.value)}
            className="bg-[#070b13] border border-slate-700 text-white font-bold text-xs px-3 py-2 rounded-xl focus:border-emerald-400 outline-none cursor-pointer"
          >
            <option value="confluence_5">5-Point Confluence Breakout Engine</option>
            <option value="squeeze_breakout">Bollinger Band Squeeze & RVOL Expansion</option>
            <option value="stage2_trend">Weinstein Stage 2 Trend Continuation</option>
            <option value="ml_conviction">ML High-Conviction Probability (P &ge; 78%)</option>
            <option value="multi_day_momentum">Multi-Day Continuous Climbers (3D+ Streak)</option>
          </select>
        </div>
      </div>

      {/* Interactive Controls Bar: Stop Loss, TP1, Holding Days */}
      <div className="p-4 rounded-2xl bg-[#0b111e] border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans">
        {/* Stop Loss Slider */}
        <div className="space-y-1.5 p-3 rounded-xl bg-[#070b13] border border-slate-800">
          <div className="flex justify-between font-mono">
            <span className="text-slate-400">Stop Loss Distance:</span>
            <span className="text-rose-400 font-bold">-{stopLossPct}%</span>
          </div>
          <input
            type="range"
            min="2.5"
            max="8.0"
            step="0.5"
            value={stopLossPct}
            onChange={e => setStopLossPct(Number(e.target.value))}
            className="w-full accent-rose-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Tight 2.5%</span>
            <span>Wide 8.0%</span>
          </div>
        </div>

        {/* Take Profit 1 Slider */}
        <div className="space-y-1.5 p-3 rounded-xl bg-[#070b13] border border-slate-800">
          <div className="flex justify-between font-mono">
            <span className="text-slate-400">Target Profit (TP1):</span>
            <span className="text-emerald-400 font-bold">+{tp1Pct}%</span>
          </div>
          <input
            type="range"
            min="6.0"
            max="25.0"
            step="1.0"
            value={tp1Pct}
            onChange={e => setTp1Pct(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Quick 6%</span>
            <span>Swing 25%</span>
          </div>
        </div>

        {/* Max Holding Days */}
        <div className="space-y-1.5 p-3 rounded-xl bg-[#070b13] border border-slate-800">
          <div className="flex justify-between font-mono">
            <span className="text-slate-400">Max Holding Period:</span>
            <span className="text-cyan-400 font-bold">{maxHoldingDays} Sessions</span>
          </div>
          <input
            type="range"
            min="5"
            max="40"
            step="1"
            value={maxHoldingDays}
            onChange={e => setMaxHoldingDays(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>5 Days</span>
            <span>40 Days</span>
          </div>
        </div>

        {/* Trailing Stop & DSE Microstructure Toggles */}
        <div className="flex flex-col justify-between p-3 rounded-xl bg-[#070b13] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium">Lock-In Trailing Stop</span>
            <input
              type="checkbox"
              checked={useTrailingStop}
              onChange={e => setUseTrailingStop(e.target.checked)}
              className="h-4 w-4 accent-emerald-500 cursor-pointer rounded"
            />
          </div>
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span className="text-cyan-300 font-medium" title="Enforces DSE T+2 settlement lock (no Day 0/1 exits), circuit limit freezes, and 0.85% round-trip transaction fees">
              DSE Reality (T+2 &amp; 0.85% Fee)
            </span>
            <input
              type="checkbox"
              checked={enforceDseMicrostructure}
              onChange={e => setEnforceDseMicrostructure(e.target.checked)}
              className="h-4 w-4 accent-cyan-500 cursor-pointer rounded"
            />
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Zero look-ahead PIT engine &bull; {enforceDseMicrostructure ? 'T+2 Lock + Circuit Freeze + 0.85% DSE Fee active' : 'Frictionless theoretical mode'}
          </p>
        </div>
      </div>

      {/* Portfolio Cash Cap, Execution Timing & DSEX Regime Controls */}
      <div className="p-4 rounded-2xl bg-[#0b111e] border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-sans">
        {/* Entry Execution Timing */}
        <div className="p-3 rounded-xl bg-[#070b13] border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between font-mono">
            <span className="text-slate-400">Execution Timing:</span>
            <span className="text-emerald-400 font-bold text-[10px]">
              {entryTiming === 'next_open' ? 'i+1 Open' : 'Bar i Close'}
            </span>
          </div>
          <select
            value={entryTiming}
            onChange={e => setEntryTiming(e.target.value as 'next_open' | 'signal_close')}
            className="w-full bg-[#0b111e] border border-slate-700 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg focus:border-emerald-400 outline-none cursor-pointer font-mono"
          >
            <option value="next_open">Next Session Open (Historical i+1)</option>
            <option value="signal_close">Signal Day Close (2:20 PM EOD)</option>
          </select>
          <p className="text-[10px] text-slate-500 leading-tight">
            EOD scans tonight have no tomorrow Open yet — use Limit Orders inside Entry Zone. Past bar i+1 Open models morning fills.
          </p>
        </div>

        {/* Open Gap Chase Limit */}
        <div className="p-3 rounded-xl bg-[#070b13] border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between font-mono">
            <span className="text-slate-400">Max Morning Gap Cap:</span>
            <span className="text-amber-300 font-bold">+{maxEntryGapPct.toFixed(1)}%</span>
          </div>
          <select
            value={maxEntryGapPct}
            disabled={entryTiming !== 'next_open'}
            onChange={e => setMaxEntryGapPct(Number(e.target.value))}
            className="w-full bg-[#0b111e] border border-slate-700 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg focus:border-amber-400 outline-none cursor-pointer font-mono disabled:opacity-40"
          >
            <option value={3.0}>Strict Limit (+3.0% Max Gap)</option>
            <option value={4.0}>Standard Limit (+4.0% Max Gap)</option>
            <option value={5.0}>Moderate Limit (+5.0% Max Gap)</option>
            <option value={8.0}>Aggressive (+8.0% Max Gap)</option>
          </select>
          <p className="text-[10px] text-slate-500 leading-tight">
            Skips historical setups whose next-day open gaps above your limit chase threshold.
          </p>
        </div>

        {/* 100% BO Cash & Concurrent Slots */}
        <div className="p-3 rounded-xl bg-[#070b13] border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between font-mono">
            <span className="text-slate-400">BO Cash Concurrency:</span>
            <span className="text-cyan-300 font-bold">
              {maxConcurrentPositions > 0 ? `${maxConcurrentPositions} Slots` : 'Uncapped'}
            </span>
          </div>
          <select
            value={maxConcurrentPositions}
            onChange={e => setMaxConcurrentPositions(Number(e.target.value))}
            className="w-full bg-[#0b111e] border border-slate-700 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg focus:border-cyan-400 outline-none cursor-pointer font-mono"
          >
            <option value={4}>Focused BO (Max 4 Slots &bull; 100% Cash)</option>
            <option value={6}>Balanced BO (Max 6 Slots &bull; 100% Cash)</option>
            <option value={8}>Diversified BO (Max 8 Slots &bull; 100% Cash)</option>
            <option value={0}>Signal-Only Audit (No Cash Limit)</option>
          </select>
          <p className="text-[10px] text-slate-500 leading-tight">
            Enforces strict 100% non-margin BO cash &amp; prevents simultaneous duplicate holdings.
          </p>
        </div>

        {/* DSEX Broad-Market Regime Gate */}
        <div className="p-3 rounded-xl bg-[#070b13] border border-slate-800 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-emerald-300 font-medium" title="Skips new breakout buys during historical 00_DSEX downtrends (DSEX < EMA50 & EMA20 < EMA50)">
              00_DSEX Bear Regime Gate
            </span>
            <input
              type="checkbox"
              checked={enforceDsexRegimeGate}
              onChange={e => setEnforceDsexRegimeGate(e.target.checked)}
              className="h-4 w-4 accent-emerald-500 cursor-pointer rounded"
            />
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            {backtestResult.dsexGateActive
              ? 'Active: Uses loaded 00_DSEX index history to block entries during broad bear phases.'
              : '00_DSEX history not found in loaded dataset — regime gate standing by.'}
          </p>
        </div>
      </div>

      {/* Point-in-Time & DSE Microstructure Diagnostics Bar */}
      <div className="px-4 py-2.5 rounded-xl bg-[#070b13] border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono tabular-nums">
        <div className="flex items-center gap-2 text-emerald-400 font-bold">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          <span>
            PIT Engine ({backtestResult.entryTimingUsed === 'signal_close' ? 'Signal Close' : 'Next-Open'} &bull; {maxConcurrentPositions > 0 ? '100% BO Cash-Capped' : 'Uncapped'})
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3.5 text-slate-400">
          <span>
            Bars: <strong className="text-slate-200">{(backtestResult.barsEvaluatedCount ?? 0).toLocaleString()}</strong>
          </span>
          <span>
            Peak Exposure: <strong className="text-cyan-300">{backtestResult.peakConcurrentPositions ?? 0}/{maxConcurrentPositions > 0 ? maxConcurrentPositions : '∞'} slots ({backtestResult.peakCapitalDeployedPct ?? 0}%)</strong>
          </span>
          <span>
            Skipped: <strong className="text-amber-300">{backtestResult.cashCappedSkippedCount ?? 0}</strong> cash &bull; <strong className="text-amber-300">{backtestResult.gapSkippedCount ?? 0}</strong> gap &bull; <strong className="text-rose-300">{backtestResult.dsexRegimeSkippedCount ?? 0}</strong> bear
          </span>
          <span>
            T+2 Locks: <strong className="text-amber-300">{backtestResult.t2LockedExitsCount ?? 0}</strong> &bull; Freeze: <strong className="text-rose-300">{backtestResult.circuitBlockedBarsCount ?? 0}</strong> &bull; Fee: <strong className="text-cyan-300">-{backtestResult.avgFeeDragPct ?? 0}%</strong>
          </span>
        </div>
      </div>

      {/* KPI Cards: Backtest Scorecard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Win Rate */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Win Rate</div>
          <div className="text-2xl font-black text-emerald-400">
            {backtestResult.winRatePct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {backtestResult.winningTrades}W / {backtestResult.losingTrades}L
          </div>
        </div>

        {/* Profit Factor */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Profit Factor</div>
          <div className="text-2xl font-black text-cyan-400">
            {backtestResult.profitFactor}x
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Gains / Losses ratio
          </div>
        </div>

        {/* Total Strategy Return */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Net PnL Return</div>
          <div className={`text-2xl font-black tabular-nums ${backtestResult.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {backtestResult.totalReturnPct >= 0 ? '+' : ''}{backtestResult.totalReturnPct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1 tabular-nums">
            vs DSEX: {backtestResult.benchmarkReturnPct >= 0 ? '+' : ''}{backtestResult.benchmarkReturnPct}%
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Max Drawdown</div>
          <div className="text-2xl font-black text-amber-400">
            -{backtestResult.maxDrawdownPct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Peak-to-trough drop
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Sharpe Ratio</div>
          <div className="text-2xl font-black text-purple-400">
            {backtestResult.sharpeRatio}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Risk-adjusted return
          </div>
        </div>

        {/* Sortino Ratio */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Sortino Ratio</div>
          <div className="text-2xl font-black text-purple-300">
            {backtestResult.sortinoRatio}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Downside volatility
          </div>
        </div>

        {/* Payoff Ratio */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Avg Win/Loss</div>
          <div className="text-2xl font-black text-emerald-300">
            {backtestResult.payoffRatio}:1
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            +{backtestResult.avgGainPct}% / -{backtestResult.avgLossPct}%
          </div>
        </div>
      </div>

      {/* Equity Curve Chart vs Benchmark */}
      <div className="p-5 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>Cumulative Strategy Equity Curve (৳10,00,000 Portfolio)</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Quantitative strategy equity compounding vs DSEX benchmark buy-and-hold
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-sans">
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Strategy Equity
            </span>
            <span className="flex items-center gap-1.5 text-slate-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-slate-500" />
              Benchmark (DSEX)
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={backtestResult.equityCurve} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                domain={['auto', 'auto']}
                tickFormatter={val => `৳${(val / 100000).toFixed(1)}L`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#070b13', borderColor: '#334155', borderRadius: '12px' }}
                labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                formatter={(val: any, name: any) => [
                  `৳${Number(val).toLocaleString()}`,
                  name === 'portfolioEquity' ? 'Strategy Equity' : 'DSEX Benchmark'
                ]}
              />
              <Area
                type="monotone"
                dataKey="portfolioEquity"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#equityGrad)"
              />
              <Line
                type="monotone"
                dataKey="benchmarkEquity"
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trade Execution Log Table */}
      <div className="p-5 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span>Simulated Trade Execution Log ({filteredTrades.length} Trades)</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Individual simulated trade entries, exits, holding bars, and outcomes
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search Symbol */}
            <input
              type="text"
              placeholder="Search symbol..."
              value={searchSymbol}
              onChange={e => setSearchSymbol(e.target.value)}
              className="bg-[#070b13] border border-slate-700 text-white px-2.5 py-1.5 rounded-xl text-xs outline-none focus:border-cyan-400"
            />

            {/* Win/Loss filter */}
            <div className="flex items-center gap-1 bg-[#070b13] p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setTradeFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  tradeFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({backtestResult.trades.length})
              </button>
              <button
                onClick={() => setTradeFilter('win')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  tradeFilter === 'win' ? 'bg-emerald-600 text-slate-950' : 'text-emerald-400 hover:text-white'
                }`}
              >
                Wins ({backtestResult.winningTrades})
              </button>
              <button
                onClick={() => setTradeFilter('loss')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  tradeFilter === 'loss' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:text-white'
                }`}
              >
                Losses ({backtestResult.losingTrades})
              </button>
            </div>
          </div>
        </div>

        {/* Trades Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#070b13] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Trade ID</th>
                <th className="py-2.5 px-3 font-semibold">Symbol</th>
                <th className="py-2.5 px-3 font-semibold">Entry Date</th>
                <th className="py-2.5 px-3 font-semibold">Entry Price</th>
                <th className="py-2.5 px-3 font-semibold">Exit Date</th>
                <th className="py-2.5 px-3 font-semibold">Exit Price</th>
                <th className="py-2.5 px-3 font-semibold">Days</th>
                <th className="py-2.5 px-3 font-semibold">Outcome</th>
                <th className="py-2.5 px-3 font-semibold text-right">PnL %</th>
                <th className="py-2.5 px-3 font-semibold text-right">PnL (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredTrades.slice(0, 25).map(trade => {
                const stockObj = stocks.find(s => s.symbol === trade.symbol);
                return (
                  <tr
                    key={trade.id}
                    onClick={() => stockObj && onSelectStock(stockObj)}
                    className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3 text-slate-500">{trade.id}</td>
                    <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                      <span>{trade.symbol}</span>
                      <ArrowUpRight className="h-3 w-3 text-slate-500" />
                    </td>
                    <td className="py-2 px-3 text-slate-400">{trade.entryDate}</td>
                    <td className="py-2 px-3 text-slate-300">৳{trade.entryPrice.toFixed(1)}</td>
                    <td className="py-2 px-3 text-slate-400">{trade.exitDate}</td>
                    <td className="py-2 px-3 text-slate-300">৳{trade.exitPrice.toFixed(1)}</td>
                    <td className="py-2 px-3 text-slate-400">{trade.holdingBars}d</td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          trade.outcome === 'TP1'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : trade.outcome === 'TRAILING_STOP'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : trade.outcome === 'STOP_LOSS'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {trade.outcome}
                      </span>
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-bold ${
                        trade.pnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct}%
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-bold ${
                        trade.pnlAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {trade.pnlAmount >= 0 ? '+' : ''}৳{trade.pnlAmount.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {filteredTrades.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    No trades match the current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

export default StrategyBacktester;
