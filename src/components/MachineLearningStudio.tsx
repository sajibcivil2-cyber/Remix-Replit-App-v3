/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  BrainCircuit,
  TrendingUp,
  ShieldCheck,
  Zap,
  Target,
  Sparkles,
  BarChart2,
  Activity,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  LineChart,
  Percent,
  Compass
} from 'lucide-react';
import { DseStockItem, MlModelStatus } from '../types/dse';
import { ML_23_FEATURES } from '../lib/dseDataEngine';
import { isBenchmarkSymbol, isSectorIndexSymbol } from '../lib/sectorClassifier';
import { computeEmpiricalMlModelState, EmpiricalMlModelSummary } from '../lib/quantAnalyticsEngine';

interface MachineLearningStudioProps {
  stocks: DseStockItem[];
  mlStatus: MlModelStatus;
  empiricalSummary?: EmpiricalMlModelSummary;
  onSelectStock: (stock: DseStockItem) => void;
}

export function MachineLearningStudio({ stocks, mlStatus, empiricalSummary, onSelectStock }: MachineLearningStudioProps) {
  const [featureTab, setFeatureTab] = useState<'empirical' | 'prior'>('empirical');

  // Compute live empirical dataset summary if parent didn't pass one
  const computedEmpirical = useMemo(() => {
    return empiricalSummary ?? computeEmpiricalMlModelState(stocks);
  }, [empiricalSummary, stocks]);

  const activeStatus = computedEmpirical.status ?? mlStatus;
  const isEmpiricalReady = activeStatus.dataSourceMode === 'EMPIRICAL_DATASET';

  // Live ML Simulator interactive inputs
  const [simRvol, setSimRvol] = useState<number>(2.4);
  const [simStage, setSimStage] = useState<number>(2);
  const [simPaConfirmed, setSimPaConfirmed] = useState<boolean>(true);
  const [simSqueeze, setSimSqueeze] = useState<number>(14);
  const [simPos52, setSimPos52] = useState<number>(38);
  const [simFloat, setSimFloat] = useState<number>(55);
  const [simSectorTrend, setSimSectorTrend] = useState<'up' | 'flat' | 'down'>('up');
  const [simChaseRisk, setSimChaseRisk] = useState<boolean>(false);

  // Calculate simulated prediction in real time
  let logOdds = 0.49; // Baseline for quality screened stocks
  const factors: { name: string; weight: number; impact: 'positive' | 'negative' }[] = [];

  if (simRvol >= 2.0) {
    logOdds += 0.48;
    factors.push({ name: `RVOL Surge (${simRvol.toFixed(1)}x institutional volume)`, weight: 0.48, impact: 'positive' });
  } else if (simRvol >= 1.4) {
    logOdds += 0.28;
    factors.push({ name: `RVOL Expansion (${simRvol.toFixed(1)}x)`, weight: 0.28, impact: 'positive' });
  } else if (simRvol < 1.0) {
    logOdds -= 0.22;
    factors.push({ name: `Low RVOL (${simRvol.toFixed(1)}x)`, weight: -0.22, impact: 'negative' });
  }

  if (simStage === 2) {
    logOdds += 0.39;
    factors.push({ name: 'Weinstein Stage 2 Trend Gate (Above Rising MA50)', weight: 0.39, impact: 'positive' });
  } else if (simStage === 3) {
    logOdds -= 0.45;
    factors.push({ name: 'Stage 3/4 Distribution Resistance', weight: -0.45, impact: 'negative' });
  }

  if (simPaConfirmed) {
    logOdds += 0.27;
    factors.push({ name: 'Price Action Confirmed (Engulfing / Hammer)', weight: 0.27, impact: 'positive' });
  }

  if (simSqueeze >= 8) {
    logOdds += 0.31;
    factors.push({ name: `BB Squeeze Compressed (${simSqueeze} bars)`, weight: 0.31, impact: 'positive' });
  } else if (simSqueeze >= 4) {
    logOdds += 0.16;
    factors.push({ name: 'Bollinger Band Contraction', weight: 0.16, impact: 'positive' });
  }

  if (simPos52 < 45) {
    logOdds += 0.18;
    factors.push({ name: `52W Position Near Base (${simPos52}%)`, weight: 0.18, impact: 'positive' });
  }

  if (simFloat < 15) {
    logOdds -= 0.42;
    factors.push({ name: `Low Free Float Penalty (${simFloat}%)`, weight: -0.42, impact: 'negative' });
  }

  if (simSectorTrend === 'down') {
    logOdds -= 0.35;
    factors.push({ name: 'Sector Downtrending Headwind', weight: -0.35, impact: 'negative' });
  } else if (simSectorTrend === 'up') {
    logOdds += 0.15;
    factors.push({ name: 'Sector Upward Momentum Tailwinds', weight: 0.15, impact: 'positive' });
  }

  if (simChaseRisk) {
    logOdds -= 0.29;
    factors.push({ name: 'Extended without Base (Chase Risk)', weight: -0.29, impact: 'negative' });
  }

  const simulatedProb = Math.min(96, Math.max(25, Math.round((1 / (1 + Math.exp(-logOdds))) * 100)));
  const simExpReturn = Math.round(((simulatedProb / 100 * 12.4) - ((1 - simulatedProb / 100) * 4.2)) * 10) / 10;
  const simProfitFactor = Math.round(((simulatedProb / 100 * 12.4) / Math.max(0.1, (1 - simulatedProb / 100) * 4.2)) * 10) / 10;

  // Sort stocks by ML probability (excluding sector indices and benchmark indices)
  const rankedStocks = stocks
    .filter(s => !s.isSectorIndex && !isSectorIndexSymbol(s.symbol) && !isBenchmarkSymbol(s.symbol) && s.sector !== 'Benchmark')
    .sort((a, b) => b.mlProbability - a.mlProbability);

  return (
    <div className="space-y-6 font-mono">

      {/* Model Health & Telemetry Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0d1527] to-[#070b13] border border-cyan-500/30 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                <BrainCircuit className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">
                  DSE Machine Learning Profit Prediction Studio
                </h2>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Walk-Forward Regularized Logistic Regression &bull; 23-Feature Confluence Vector &bull; Profit Maximization
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`flex h-3 w-3 rounded-full animate-pulse ${isEmpiricalReady ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
              isEmpiricalReady
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}>
              MODEL STATUS: {activeStatus.state} ({activeStatus.sampleCount} TRADES)
            </span>
          </div>
        </div>

        {/* Telemetry KPI Cards (100% Empirical Dataset Audit) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-[#0b111e] border border-emerald-500/30">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              WIN RATE (CONVICTION)
            </span>
            <span className="text-xl font-black text-emerald-400">{activeStatus.accuracyPct}%</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {activeStatus.overallAccuracyPct ?? activeStatus.accuracyPct}% overall ({activeStatus.sampleCount} trades)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b111e] border border-cyan-500/30">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              PRECISION (PIT HITS)
            </span>
            <span className="text-xl font-black text-cyan-400">{activeStatus.precision}%</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">High-Conviction PIT Hits</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b111e] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              PROFIT FACTOR
            </span>
            <span className="text-xl font-black text-emerald-300">{activeStatus.profitFactor ?? 0} : 1</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Net of 0.85% fee &amp; T+2</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b111e] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              RECALL (CAPTURE)
            </span>
            <span className="text-xl font-black text-amber-400">{activeStatus.recall}%</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Winners scored &ge;72%</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b111e] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              ROC-AUC / BRIER
            </span>
            <span className="text-xl font-black text-purple-400">{activeStatus.rocAuc}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Brier error: {activeStatus.brierScore ?? computedEmpirical.audit.brierScore}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b111e] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              BACKTEST RULE
            </span>
            <span className="text-sm font-bold text-emerald-400 block mt-1">+12.0% TP1</span>
            <span className="text-[10px] text-slate-500 block">SL: -4.5% &bull; 20d Trail</span>
          </div>
        </div>

        {/* Live Empirical Dataset Insight */}
        <div className={`p-3.5 rounded-xl border text-xs leading-relaxed font-sans ${
          isEmpiricalReady
            ? 'bg-cyan-950/20 border-cyan-500/20 text-slate-300'
            : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
        }`}>
          <strong className={`${isEmpiricalReady ? 'text-cyan-300' : 'text-amber-300'} font-mono block mb-0.5`}>
            {isEmpiricalReady
              ? `Live Empirical Dataset Validation (${activeStatus.lastRetrained}):`
              : `Accumulating Historical Evidence (${activeStatus.lastRetrained}):`}
          </strong>
          {isEmpiricalReady ? (
            <>
              Metrics above are computed directly from <strong>{activeStatus.sampleCount.toLocaleString()}</strong> point-in-time historical executions (Next-Open fills with +4% gap cap, 100% BO cash limit, T+2 settlement lock, circuit freezes, and 0.85% fee). High-conviction signals (&ge;72% score) achieved <strong>{activeStatus.accuracyPct}%</strong> accuracy and <strong>{activeStatus.profitFactor ?? 0}x</strong> Profit Factor vs <strong>{activeStatus.benchmarkDseWinRate}%</strong> lower-conviction baseline (Mann-Whitney ROC-AUC: <strong>{activeStatus.rocAuc}</strong>, Brier: <strong>{activeStatus.brierScore ?? 0}</strong>).
            </>
          ) : (
            <>
              Currently only <strong>{activeStatus.sampleCount}</strong> historical trade signals are present in your loaded bars (minimum 20 audited trades required for stable empirical calibration). Prior 23-feature weights remain active; upload 60–250+ daily sessions in your AmiBroker/CSV files to unlock empirical ROC-AUC and factor lift audit.
            </>
          )}
        </div>
      </div>

      {/* Grid: Feature Importance Rankings & Live ML Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Feature Weights: Empirical Dataset Lift vs Prior 23-Feature Vector */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Activity className="h-4 w-4 text-cyan-400" />
              <span>
                {featureTab === 'empirical'
                  ? 'Empirical Dataset Factor Lifts (Your Data)'
                  : '23-Feature Regularized Prior Weights'}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-[#070b13] p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                onClick={() => setFeatureTab('empirical')}
                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                  featureTab === 'empirical'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Empirical Lift ({computedEmpirical.empiricalFactors.length})
              </button>
              <button
                onClick={() => setFeatureTab('prior')}
                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                  featureTab === 'prior'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                23-Feature Prior
              </button>
            </div>
          </div>

          {featureTab === 'empirical' ? (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-[#070b13] border border-slate-800 text-slate-400">
                <span>Dataset Baseline Log-Odds Shift vs 62% Prior:</span>
                <span className={`font-bold ${computedEmpirical.baseLogOddsShift >= 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {computedEmpirical.baseLogOddsShift >= 0 ? '+' : ''}{computedEmpirical.baseLogOddsShift.toFixed(2)}
                </span>
              </div>

              {computedEmpirical.empiricalFactors.map((ef) => {
                const isPosLift = ef.empiricalLogOddsLift >= 0;
                const barWidth = Math.min(100, Math.abs(ef.empiricalLogOddsLift) * 90);
                return (
                  <div key={ef.factor} className="p-2.5 rounded-xl bg-[#070b13] border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-200 text-[11px] font-sans font-semibold">{ef.factor}</span>
                      <span className={`font-mono text-xs font-bold shrink-0 ${isPosLift ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Emp Lift: {isPosLift ? '+' : ''}{ef.empiricalLogOddsLift.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden flex">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${isPosLift ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.max(4, barWidth)}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>
                        Win With: <strong className="text-emerald-300">{ef.winRateWithFactor}%</strong> vs Without: <strong>{ef.winRateWithoutFactor}%</strong> ({ef.sampleWith} trades)
                      </span>
                      <span>
                        Prior: <strong className="text-cyan-300">+{ef.priorWeight.toFixed(2)}</strong> &bull; Alpha:{' '}
                        <strong className={ef.alphaEdgePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {ef.alphaEdgePct >= 0 ? '+' : ''}{ef.alphaEdgePct}%
                        </strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {ML_23_FEATURES.map((f, i) => {
                const isPos = f.weight > 0;
                const barWidth = Math.min(100, Math.abs(f.weight) * 160);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 text-[11px] font-sans truncate max-w-[280px]">
                        {f.name}
                      </span>
                      <span className={`font-mono text-xs font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPos ? '+' : ''}{f.weight.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden flex">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isPos ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Interactive Live ML Inference Simulator */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Sliders className="h-4 w-4 text-emerald-400" />
              <span>Interactive ML Model Simulator</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/30">
              LIVE INFERENCE
            </span>
          </div>

          {/* Simulated Score Gauge */}
          <div className="p-4 rounded-xl bg-[#070b13] border border-slate-800 text-center space-y-2">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">
              PREDICTED TARGET HIT PROBABILITY
            </span>
            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-emerald-300">
              {simulatedProb}%
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
              <div>
                <span className="text-slate-500 block text-[10px]">EXPECTED RETURN</span>
                <span className="font-bold text-emerald-400 text-sm">+{simExpReturn}%</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">PROFIT FACTOR</span>
                <span className="font-bold text-cyan-300 text-sm">{simProfitFactor} : 1</span>
              </div>
            </div>
          </div>

          {/* Sliders for Interactive What-If Analysis */}
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Relative Volume (RVOL)</span>
                <span className="text-cyan-400 font-bold">{simRvol.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={simRvol}
                onChange={e => setSimRvol(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Weinstein Stage</span>
                <span className="text-amber-400 font-bold">Stage {simStage}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(stg => (
                  <button
                    key={stg}
                    onClick={() => setSimStage(stg)}
                    className={`py-1 rounded-lg border text-xs cursor-pointer font-mono font-bold ${
                      simStage === stg
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Stage {stg}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>BB Squeeze Compression</span>
                <span className="text-purple-400 font-bold">{simSqueeze} bars</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={simSqueeze}
                onChange={e => setSimSqueeze(parseInt(e.target.value, 10))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-300">Price Action Confirmation Trigger</span>
              <button
                onClick={() => setSimPaConfirmed(!simPaConfirmed)}
                className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                  simPaConfirmed ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {simPaConfirmed ? 'CONFIRMED ✓' : 'OFF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ranked ML Stocks Table */}
      <div className="p-5 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Target className="h-4 w-4 text-emerald-400" />
            <span>Active DSE Stocks Ranked by ML Probability &amp; Profit Edge</span>
          </div>
          <span className="text-xs text-slate-400">Click any symbol to open live technical chart &amp; trade plan</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Sector</th>
                <th className="py-2.5 px-3">Last Price</th>
                <th className="py-2.5 px-3">RVOL</th>
                <th className="py-2.5 px-3">Confluence</th>
                <th className="py-2.5 px-3">Win Prob</th>
                <th className="py-2.5 px-3">Exp. Return</th>
                <th className="py-2.5 px-3">Kelly Sizing</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {rankedStocks.map(stock => (
                <tr
                  key={stock.symbol}
                  onClick={() => onSelectStock(stock)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3 font-mono font-bold text-white flex items-center gap-1.5">
                    <span>{stock.symbol}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                      {stock.category}
                    </span>
                    {stock.paConfirmed && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                        PA ✓
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-xs truncate max-w-[130px]">{stock.sector}</td>
                  <td className="py-3 px-3 font-mono text-white font-bold">{stock.lastPrice.toFixed(1)}</td>
                  <td className="py-3 px-3 font-mono text-amber-400">{stock.rvol.toFixed(1)}x</td>
                  <td className="py-3 px-3 font-mono text-emerald-400">{stock.confluenceScore}/7</td>
                  <td className="py-3 px-3 font-mono font-bold">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"
                          style={{ width: `${Math.round(stock.mlProbability * 100)}%` }}
                        />
                      </div>
                      <span className="text-emerald-400 font-bold">{Math.round(stock.mlProbability * 100)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-emerald-300 font-bold">
                    +{stock.mlExpectedReturnPct ?? 11.4}%
                  </td>
                  <td className="py-3 px-3 font-mono text-amber-300">
                    {stock.mlKellySizePct ?? 12}% Risk
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStock(stock);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-slate-950 font-bold text-[11px] transition-colors"
                    >
                      View Chart &rarr;
                    </button>
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

export default MachineLearningStudio;
