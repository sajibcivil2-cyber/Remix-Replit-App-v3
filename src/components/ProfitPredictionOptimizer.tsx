/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Percent,
  ShieldAlert,
  Target,
  Sparkles,
  Sliders,
  DollarSign,
  BarChart3,
  Activity,
  Layers,
  ArrowUpRight,
  TrendingDown,
  Info,
  CheckCircle2,
  AlertTriangle,
  Compass
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  BarChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  Cell
} from 'recharts';
import { DseStockItem } from '../types/dse';
import { runMonteCarloSimulation, calculateKellyAndCapitalAllocation } from '../lib/quantAnalyticsEngine';

interface ProfitPredictionOptimizerProps {
  stocks: DseStockItem[];
  selectedStockSymbol?: string;
  onSelectStock: (stock: DseStockItem) => void;
}

export function ProfitPredictionOptimizer({
  stocks,
  selectedStockSymbol,
  onSelectStock
}: ProfitPredictionOptimizerProps) {
  const [activeSymbol, setActiveSymbol] = useState<string>(
    selectedStockSymbol || (stocks.length > 0 ? stocks[0].symbol : 'SQURPHARMA')
  );

  const currentStock = useMemo(() => {
    return stocks.find(s => s.symbol === activeSymbol) || stocks[0];
  }, [stocks, activeSymbol]);

  // Simulation parameters
  const [forwardDays, setForwardDays] = useState<number>(20);
  const [iterations] = useState<number>(1000);
  const [capital, setCapital] = useState<number>(500000); // 500,000 BDT
  const [riskPreference, setRiskPreference] = useState<'quarter' | 'half' | 'full'>('half');

  // Compute Monte Carlo Simulation
  const mcResult = useMemo(() => {
    if (!currentStock) return null;
    return runMonteCarloSimulation(currentStock, iterations, forwardDays);
  }, [currentStock, iterations, forwardDays]);

  // Compute Kelly Sizing
  const kellyResult = useMemo(() => {
    if (!currentStock) return null;
    return calculateKellyAndCapitalAllocation(currentStock, capital, riskPreference);
  }, [currentStock, capital, riskPreference]);

  if (stocks.length === 0 || !currentStock || !mcResult || !kellyResult) {
    return (
      <div className="text-center py-20 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-4 font-mono">
        <div className="p-3 w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
          <Activity className="h-7 w-7" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-white">Stock Database is Clean (0 Symbols Loaded)</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto font-sans">
          Upload your AmiBroker data, CSV, or ZIP archive to run 1,000-path Monte Carlo simulations, Expected Value calculations, and Kelly Criterion sizing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono">
      {/* Header & Stock Selector */}
      <div className="p-5 rounded-2xl bg-[#0b111e] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Quantitative Profit Expectancy & Monte Carlo Engine
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                1,000-run Geometric Brownian Motion return cone &bull; Mathematical Expected Value (EV) &bull; Kelly Criterion capital sizing
              </p>
            </div>
          </div>
        </div>

        {/* Stock Selector Pill */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400">Select Symbol:</label>
          <select
            value={activeSymbol}
            onChange={e => setActiveSymbol(e.target.value)}
            className="bg-[#070b13] border border-slate-700 text-white font-bold text-xs px-3 py-2 rounded-xl focus:border-cyan-400 outline-none cursor-pointer"
          >
            {stocks.map(s => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol} (৳{s.lastPrice.toFixed(1)} &bull; {s.mlProbability ? `${Math.round(s.mlProbability * 100)}% Win P` : ''})
              </option>
            ))}
          </select>

          <button
            onClick={() => onSelectStock(currentStock)}
            className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Inspect Technicals</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Grid: Quant Profit Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Win Probability */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800/90 relative overflow-hidden">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
            P(Positive Gain)
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {mcResult.winProbability}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            1,000 forward paths
          </div>
        </div>

        {/* Expected Value (EV) */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800/90 relative overflow-hidden">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Expected Value (EV)
          </div>
          <div className={`text-2xl font-black ${mcResult.expectedValuePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {mcResult.expectedValuePct >= 0 ? '+' : ''}{mcResult.expectedValuePct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Net edge per trade
          </div>
        </div>

        {/* Median Expected Return (50th percentile) */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800/90 relative overflow-hidden">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Median Return (P50)
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {mcResult.medianReturnPct >= 0 ? '+' : ''}{mcResult.medianReturnPct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Over {forwardDays} sessions
          </div>
        </div>

        {/* 90th Percentile Bull Case */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800/90 relative overflow-hidden">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Bull Case (P90)
          </div>
          <div className="text-2xl font-black text-emerald-300">
            +{mcResult.p90ReturnPct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Top 10% upside
          </div>
        </div>

        {/* 95% Value at Risk (VaR) */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800/90 relative overflow-hidden">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
            95% VaR (Tail Risk)
          </div>
          <div className="text-2xl font-black text-amber-400">
            -{mcResult.var95Pct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            CVaR: -{mcResult.cvar95Pct}%
          </div>
        </div>

        {/* Half Kelly Position Size */}
        <div className="p-4 rounded-xl bg-[#0b111e] border border-slate-800/90 relative overflow-hidden">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Optimal Kelly Size
          </div>
          <div className="text-2xl font-black text-purple-400">
            {kellyResult.recommendedPositionPct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Risk: {kellyResult.recommendedRiskPct}% of capital
          </div>
        </div>
      </div>

      {/* Main Visuals: Monte Carlo Percentile Cone & Profit Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 20-Day Forward Price Cone */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Monte Carlo Price Projection Cone</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  {currentStock.symbol} (৳{currentStock.lastPrice})
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Quantiles (10th, 25th, 50th median, 75th, 90th) across {forwardDays} forward sessions
              </p>
            </div>

            {/* Time horizon toggle */}
            <div className="flex items-center gap-1 bg-[#070b13] p-1 rounded-xl border border-slate-800 text-xs">
              {[10, 15, 20, 30].map(days => (
                <button
                  key={days}
                  onClick={() => setForwardDays(days)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    forwardDays === days
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mcResult.percentilePaths} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="coneGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={d => `Day ${d}`}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  domain={['auto', 'auto']}
                  tickFormatter={val => `৳${Math.round(val)}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as any;
                      const entryPrice = currentStock.lastPrice;
                      const calcGain = (val: number) => {
                        const pct = ((val - entryPrice) / entryPrice) * 100;
                        return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
                      };

                      return (
                        <div className="bg-[#0b1220]/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl text-[11px] font-mono space-y-1.5 min-w-[210px]">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                            <span className="font-bold text-white text-xs">Day {label} Forward</span>
                            <span className="text-[10px] text-slate-400">Entry: ৳{entryPrice.toFixed(1)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                            <span className="text-emerald-400 font-bold">90th Bull (P90):</span>
                            <span className="text-emerald-300 font-bold text-right">
                              ৳{data.p90.toFixed(1)} ({calcGain(data.p90)})
                            </span>
                            <span className="text-cyan-400">75th Percentile:</span>
                            <span className="text-cyan-300 font-bold text-right">
                              ৳{data.p75.toFixed(1)} ({calcGain(data.p75)})
                            </span>
                            <span className="text-amber-400 font-bold">50th Median (P50):</span>
                            <span className="text-amber-300 font-bold text-right">
                              ৳{data.p50.toFixed(1)} ({calcGain(data.p50)})
                            </span>
                            <span className="text-orange-400">25th Percentile:</span>
                            <span className="text-orange-300 font-bold text-right">
                              ৳{data.p25.toFixed(1)} ({calcGain(data.p25)})
                            </span>
                            <span className="text-rose-400 font-bold">10th Bear (P10):</span>
                            <span className="text-rose-300 font-bold text-right">
                              ৳{data.p10.toFixed(1)} ({calcGain(data.p10)})
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="p90" stroke="#10b981" strokeWidth={1.5} fillOpacity={0.15} fill="#10b981" />
                <Area type="monotone" dataKey="p75" stroke="#06b6d4" strokeWidth={1.2} fillOpacity={0.2} fill="#06b6d4" />
                <Line type="monotone" dataKey="p50" stroke="#f59e0b" strokeWidth={2.2} dot={false} />
                <Area type="monotone" dataKey="p25" stroke="#f97316" strokeWidth={1.2} fillOpacity={0.15} fill="#f97316" />
                <Area type="monotone" dataKey="p10" stroke="#ef4444" strokeWidth={1.5} fillOpacity={0.1} fill="#ef4444" />
                <ReferenceLine
                  y={currentStock.lastPrice}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  label={{ value: `Entry ৳${currentStock.lastPrice}`, fill: '#94a3b8', fontSize: 10, position: 'right' }}
                />
                <ReferenceLine
                  y={currentStock.targetPrice1}
                  stroke="#10b981"
                  strokeDasharray="2 2"
                  label={{ value: `TP1 ৳${currentStock.targetPrice1}`, fill: '#10b981', fontSize: 10, position: 'right' }}
                />
                <ReferenceLine
                  y={currentStock.stopLoss}
                  stroke="#ef4444"
                  strokeDasharray="2 2"
                  label={{ value: `SL ৳${currentStock.stopLoss}`, fill: '#ef4444', fontSize: 10, position: 'right' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Cone Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] pt-1 border-t border-slate-800/80">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              90th %ile (+{mcResult.p90ReturnPct}%)
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Median Path ({mcResult.medianReturnPct >= 0 ? '+' : ''}{mcResult.medianReturnPct}%)
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              10th %ile ({mcResult.p10ReturnPct}%)
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              Current Price (৳{currentStock.lastPrice})
            </span>
          </div>
        </div>

        {/* Right: Profit Probability Distribution Histogram */}
        <div className="p-5 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              <span>Profit Return Distribution</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Probability mass across return brackets
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={mcResult.distributionBins}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={9} tickFormatter={v => `${v}%`} />
                <YAxis dataKey="range" type="category" stroke="#64748b" fontSize={9} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#070b13', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                  formatter={(val: any) => [`${val}% of simulations`, 'Frequency']}
                />
                <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                  {mcResult.distributionBins.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isPositive ? '#10b981' : '#f43f5e'}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 rounded-xl bg-[#070b13] border border-slate-800 text-xs text-slate-300 space-y-1 font-sans">
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">Positive Out-turns:</span>
              <span className="text-emerald-400 font-bold">{mcResult.winProbability}%</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">Risk-Neutral Expected Return:</span>
              <span className="text-cyan-400 font-bold">+{mcResult.expectedValuePct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Kelly Criterion & Capital Sizing Blueprint */}
      <div className="p-5 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Kelly Criterion & Capital Allocation Optimizer
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Mathematically optimal bet sizing to maximize capital compound growth without risk of ruin
              </p>
            </div>
          </div>

          {/* Risk Preference Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-sans">Kelly Fraction:</span>
            <div className="flex items-center gap-1 bg-[#070b13] p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setRiskPreference('quarter')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  riskPreference === 'quarter'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1/4 Kelly (Conservative)
              </button>
              <button
                onClick={() => setRiskPreference('half')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  riskPreference === 'half'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1/2 Kelly (Recommended)
              </button>
              <button
                onClick={() => setRiskPreference('full')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  riskPreference === 'full'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Full Kelly (Max Edge)
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Capital Input & Calculations */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Portfolio Capital Input */}
          <div className="p-4 rounded-xl bg-[#070b13] border border-slate-800 space-y-2">
            <label className="text-xs text-slate-400 font-sans block">Total Trading Portfolio (BDT):</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-bold">৳</span>
              <input
                type="number"
                step="50000"
                value={capital}
                onChange={e => setCapital(Math.max(10000, Number(e.target.value)))}
                className="w-full bg-[#0b111e] border border-slate-700 text-white font-bold text-sm pl-7 pr-3 py-2 rounded-xl focus:border-purple-400 outline-none"
              />
            </div>
            <div className="flex gap-1 pt-1">
              {[200000, 500000, 1000000, 2500000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setCapital(amt)}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                >
                  {(amt / 100000).toFixed(0)}L
                </button>
              ))}
            </div>
          </div>

          {/* Shares Sizing */}
          <div className="p-4 rounded-xl bg-[#070b13] border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Recommended Shares</span>
            <div className="text-2xl font-black text-white">
              {kellyResult.maxShares.toLocaleString()} <span className="text-xs font-normal text-slate-400">shares</span>
            </div>
            <div className="text-xs text-purple-400 font-bold">
              ৳{kellyResult.totalCommitmentBdt.toLocaleString()} ({kellyResult.recommendedPositionPct}% portfolio)
            </div>
          </div>

          {/* Capital at Risk */}
          <div className="p-4 rounded-xl bg-[#070b13] border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Max Capital At Risk</span>
            <div className="text-2xl font-black text-rose-400">
              ৳{Math.round((capital * kellyResult.recommendedRiskPct) / 100).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">
              {kellyResult.recommendedRiskPct}% max stop-loss risk
            </div>
          </div>

          {/* Risk of Ruin & Edge */}
          <div className="p-4 rounded-xl bg-[#070b13] border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Mathematical Edge & Ruin</span>
            <div className="text-2xl font-black text-emerald-400">
              &lt; {kellyResult.riskOfRuinPct}% <span className="text-xs font-normal text-slate-400">ruin risk</span>
            </div>
            <div className="text-xs text-slate-400">
              Payoff ratio b = {kellyResult.payoffRatio}:1
            </div>
          </div>
        </div>

        {/* Execution Ladder & Staged Exit Blueprint */}
        <div className="p-4 rounded-xl bg-[#070b13] border border-slate-800 space-y-3 font-sans">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-400" />
            Asymmetric Execution Blueprint for {currentStock.symbol}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Step 1: Entry Ladder */}
            <div className="p-3 rounded-lg bg-[#0b111e] border border-slate-800 space-y-1">
              <span className="text-cyan-400 font-bold font-mono">1. Entry Zone</span>
              <div className="text-white font-mono font-bold">৳{currentStock.entryZoneLow} - ৳{currentStock.entryZoneHigh}</div>
              <p className="text-[11px] text-slate-400">
                Limit buy on consolidation test. Avoid chasing above ৳{(currentStock.entryZoneHigh * 1.025).toFixed(1)}.
              </p>
            </div>

            {/* Step 2: Target 1 Partial Scale Out */}
            <div className="p-3 rounded-lg bg-[#0b111e] border border-slate-800 space-y-1">
              <span className="text-emerald-400 font-bold font-mono">2. TP1 Scale-Out (50%)</span>
              <div className="text-white font-mono font-bold">৳{currentStock.targetPrice1} (+{Math.round(((currentStock.targetPrice1 - currentStock.lastPrice) / currentStock.lastPrice) * 100)}%)</div>
              <p className="text-[11px] text-slate-400">
                Lock in ৳{Math.round((kellyResult.maxShares * 0.5 * (currentStock.targetPrice1 - currentStock.lastPrice))).toLocaleString()}. Move SL to Breakeven (৳{currentStock.lastPrice}).
              </p>
            </div>

            {/* Step 3: Target 2 Runner */}
            <div className="p-3 rounded-lg bg-[#0b111e] border border-slate-800 space-y-1">
              <span className="text-purple-400 font-bold font-mono">3. TP2 Runner (50%)</span>
              <div className="text-white font-mono font-bold">৳{currentStock.targetPrice2} (+{Math.round(((currentStock.targetPrice2 - currentStock.lastPrice) / currentStock.lastPrice) * 100)}%)</div>
              <p className="text-[11px] text-slate-400">
                Trail remaining 50% shares with 14-period ATR or rising 20 EMA to capture full markup trend.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfitPredictionOptimizer;
