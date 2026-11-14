/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Compass,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowUpRight,
  PieChart,
  BarChart3,
  ShieldCheck,
  Zap,
  Info,
  X,
  Eye,
  Filter,
  CheckCircle2,
  Activity,
  Flame,
  ChevronRight,
  Award,
  Edit3,
  Search,
  AlertCircle,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Cell,
  ReferenceLine,
  BarChart,
  Bar,
  CartesianGrid
} from 'recharts';
import { DseStockItem, SectorRotationItem } from '../types/dse';
import { calculateSectorRotation } from '../lib/quantAnalyticsEngine';
import {
  resolveCompanySector,
  isSectorIndexSymbol,
  isBenchmarkSymbol,
  OFFICIAL_DSE_SECTORS,
  isUnclassifiedSector,
  setCustomSectorOverride,
  isSmeSymbol,
  normalizeSectorName
} from '../lib/sectorClassifier';
import { calculateDseTurnoverConcentration } from '../lib/dseExecutionSuite';

interface SectorRotationMatrixProps {
  stocks: DseStockItem[];
  onSelectSector: (sector: string) => void;
  onSelectStock: (stock: DseStockItem) => void;
  onUpdateStockSector?: (symbol: string, newSector: string) => void;
}

export function SectorRotationMatrix({
  stocks,
  onSelectSector,
  onSelectStock,
  onUpdateStockSector
}: SectorRotationMatrixProps) {
  const [activeTab, setActiveTab] = useState<'rrg' | 'turnover-flow' | 'momentum-rank'>('rrg');
  const [quadrantFilter, setQuadrantFilter] = useState<'All' | 'Leading' | 'Improving' | 'Weakening' | 'Lagging'>('All');
  const [inspectedSectorName, setInspectedSectorName] = useState<string | null>(null);

  // Remapping state
  const [showRemapModal, setShowRemapModal] = useState(false);
  const [remapSearch, setRemapSearch] = useState('');
  const [remapFilter, setRemapFilter] = useState<'all' | 'unmapped'>('unmapped');

  // Find any stocks that are truly unmapped
  const unclassifiedStocks = useMemo(() => {
    return stocks.filter(stk => {
      if (stk.isSectorIndex || isSectorIndexSymbol(stk.symbol) || isBenchmarkSymbol(stk.symbol) || stk.sector === 'Benchmark') return false;
      if (stk.isSme || isSmeSymbol(stk.symbol) || stk.sector === 'SME Platform') return false;
      return isUnclassifiedSector(stk.sector) && resolveCompanySector(stk.symbol, stk.name).sector === 'Unclassified Equities';
    });
  }, [stocks]);

  const handleRemapStock = (symbol: string, newSector: string) => {
    setCustomSectorOverride(symbol, newSector);
    if (onUpdateStockSector) {
      onUpdateStockSector(symbol, newSector);
    }
  };

  const sectors = useMemo(() => {
    return calculateSectorRotation(stocks);
  }, [stocks]);

  const turnoverStats = useMemo(() => {
    return calculateDseTurnoverConcentration(stocks);
  }, [stocks]);

  // Quadrant color mapping
  const getQuadrantColor = (quadrant: SectorRotationItem['quadrant']) => {
    switch (quadrant) {
      case 'Leading':
        return '#10b981'; // Emerald
      case 'Improving':
        return '#06b6d4'; // Cyan
      case 'Weakening':
        return '#f59e0b'; // Amber
      case 'Lagging':
        return '#ef4444'; // Red
    }
  };

  const leadingSectors = sectors.filter(s => s.quadrant === 'Leading');
  const improvingSectors = sectors.filter(s => s.quadrant === 'Improving');
  const weakeningSectors = sectors.filter(s => s.quadrant === 'Weakening');
  const laggingSectors = sectors.filter(s => s.quadrant === 'Lagging');

  // Filtered sectors for display
  const displaySectors = useMemo(() => {
    if (quadrantFilter === 'All') return sectors;
    return sectors.filter(s => s.quadrant === quadrantFilter);
  }, [sectors, quadrantFilter]);

  // Consistently sorted sectors for subtab bar charts to ensure cell colors align with data points
  const sortedTurnoverSectors = useMemo(() => {
    return [...displaySectors].sort((a, b) => b.turnoverCr - a.turnoverCr).slice(0, 15);
  }, [displaySectors]);

  const sortedMomentumSectors = useMemo(() => {
    return [...displaySectors].sort((a, b) => b.avgChangePct - a.avgChangePct);
  }, [displaySectors]);

  // Details for currently inspected sector drilldown
  const inspectedSectorData = useMemo(() => {
    if (!inspectedSectorName) return null;
    const sectorMeta = sectors.find(s => s.sector === inspectedSectorName);
    if (!sectorMeta) return null;

    // Get all stocks belonging to this sector
    const constituents = stocks.filter(stk => {
      if (stk.isSectorIndex || isSectorIndexSymbol(stk.symbol) || isBenchmarkSymbol(stk.symbol) || stk.sector === 'Benchmark') return false;
      let sSec = stk.sector;
      if (!sSec || isUnclassifiedSector(sSec)) {
        sSec = resolveCompanySector(stk.symbol, stk.name).sector;
      }
      sSec = normalizeSectorName(sSec);

      const isSme = Boolean(stk.isSme || isSmeSymbol(stk.symbol) || sSec === 'SME Platform');
      if (inspectedSectorName === 'SME Platform') {
        return isSme;
      }
      if (isSme) {
        return false; // Segregate SME growth scripts so Main Board sectors reflect only genuine Main Board equities
      }

      return sSec === inspectedSectorName;
    });

    const advancingCount = constituents.filter(s => s.changePercent > 0).length;
    const decliningCount = constituents.filter(s => s.changePercent < 0).length;
    const unchangedCount = constituents.filter(s => s.changePercent === 0).length;

    const sortedByTurnover = [...constituents].sort((a, b) => (b.turnoverCr || 0) - (a.turnoverCr || 0));

    return {
      meta: sectorMeta,
      constituents: sortedByTurnover,
      advancingCount,
      decliningCount,
      unchangedCount,
    };
  }, [inspectedSectorName, sectors, stocks]);

  if (stocks.length === 0) {
    return (
      <div className="text-center py-20 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-4 font-mono">
        <div className="p-3 w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
          <Compass className="h-7 w-7" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-white">Stock Database is Clean (0 Symbols Loaded)</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto font-sans">
          Upload your AmiBroker data, CSV, or ZIP archive to compute Relative Rotation Graphs (RRG) and track leading sectors.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#0b111e] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 text-slate-950 shadow-md shadow-cyan-950">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                DSE Sectoral Relative Strength &amp; Rotation Analysis
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                STAN WEINSTEIN METHODOLOGY
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Top-Down Analysis: Buy leading stocks in leading sectors &bull; Relative Strength (RS) vs DSEX Benchmark
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <button
            onClick={() => {
              setRemapFilter('all');
              setShowRemapModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer font-sans"
            title="Audit and customize sectoral scrip mapping"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Audit Scrip Sectors</span>
            {unclassifiedStocks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                {unclassifiedStocks.length}
              </span>
            )}
          </button>
          <span className="font-bold text-white bg-[#070b13] px-3 py-1.5 rounded-xl border border-slate-700">
            {sectors.length} DSE Industry Sectors
          </span>
        </div>
      </div>

      {/* Unclassified Equities Alert Banner */}
      {unclassifiedStocks.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-300">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <div className="font-bold text-amber-200">
                {unclassifiedStocks.length} Scrips Pending Official Sector Alignment
              </div>
              <div className="text-[11px] text-amber-300/80 font-sans">
                These stocks are currently not mapped into the 19 official DSE sectors and are excluded from RRG to maintain mathematical purity.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setRemapFilter('unmapped');
              setShowRemapModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-sans transition-all cursor-pointer shadow-md shadow-amber-950/50"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Map Scrips Now ({unclassifiedStocks.length})</span>
          </button>
        </div>
      )}

      {/* 4 Quadrants Summary Cards (Clickable to Filter) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Leading Quadrant */}
        <div
          onClick={() => setQuadrantFilter(quadrantFilter === 'Leading' ? 'All' : 'Leading')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            quadrantFilter === 'Leading'
              ? 'bg-emerald-950/40 border-emerald-400 shadow-lg shadow-emerald-950/30'
              : 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              1. Leading Quadrant
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono">
              {leadingSectors.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans mt-1">
            Strong relative strength &amp; positive momentum. Prime hunting ground for Stage 2 breakouts.
          </p>
          <div className="space-y-1 pt-2">
            {leadingSectors.slice(0, 3).map(s => (
              <div
                key={s.sector}
                onClick={(e) => {
                  e.stopPropagation();
                  setInspectedSectorName(s.sector);
                }}
                className="w-full text-left p-1.5 rounded-lg bg-[#070b13]/80 hover:bg-emerald-900/40 text-xs flex items-center justify-between text-slate-200 transition-colors"
              >
                <span className="truncate pr-2">{s.sector}</span>
                <span className="text-emerald-400 font-bold shrink-0">+{s.avgChangePct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Improving Quadrant */}
        <div
          onClick={() => setQuadrantFilter(quadrantFilter === 'Improving' ? 'All' : 'Improving')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            quadrantFilter === 'Improving'
              ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-950/30'
              : 'bg-cyan-950/20 border-cyan-500/30 hover:border-cyan-400/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              2. Improving Quadrant
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold font-mono">
              {improvingSectors.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans mt-1">
            Bottoming base with accelerating momentum. Early stage radar candidates before broad crowd recognition.
          </p>
          <div className="space-y-1 pt-2">
            {improvingSectors.slice(0, 3).map(s => (
              <div
                key={s.sector}
                onClick={(e) => {
                  e.stopPropagation();
                  setInspectedSectorName(s.sector);
                }}
                className="w-full text-left p-1.5 rounded-lg bg-[#070b13]/80 hover:bg-cyan-900/40 text-xs flex items-center justify-between text-slate-200 transition-colors"
              >
                <span className="truncate pr-2">{s.sector}</span>
                <span className="text-cyan-400 font-bold shrink-0">+{s.avgChangePct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weakening Quadrant */}
        <div
          onClick={() => setQuadrantFilter(quadrantFilter === 'Weakening' ? 'All' : 'Weakening')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            quadrantFilter === 'Weakening'
              ? 'bg-amber-950/40 border-amber-400 shadow-lg shadow-amber-950/30'
              : 'bg-amber-950/20 border-amber-500/30 hover:border-amber-400/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              3. Weakening Quadrant
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold font-mono">
              {weakeningSectors.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans mt-1">
            High past performance but decelerating momentum. Tighten trailing stops and take partial profits.
          </p>
          <div className="space-y-1 pt-2">
            {weakeningSectors.slice(0, 3).map(s => (
              <div
                key={s.sector}
                onClick={(e) => {
                  e.stopPropagation();
                  setInspectedSectorName(s.sector);
                }}
                className="w-full text-left p-1.5 rounded-lg bg-[#070b13]/80 hover:bg-amber-900/40 text-xs flex items-center justify-between text-slate-200 transition-colors"
              >
                <span className="truncate pr-2">{s.sector}</span>
                <span className="text-amber-400 font-bold shrink-0">{s.avgChangePct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lagging Quadrant */}
        <div
          onClick={() => setQuadrantFilter(quadrantFilter === 'Lagging' ? 'All' : 'Lagging')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            quadrantFilter === 'Lagging'
              ? 'bg-rose-950/40 border-rose-400 shadow-lg shadow-rose-950/30'
              : 'bg-rose-950/20 border-rose-500/30 hover:border-rose-400/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              4. Lagging Quadrant
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold font-mono">
              {laggingSectors.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans mt-1">
            Underperforming DSEX with negative momentum. Avoid new long capital exposure.
          </p>
          <div className="space-y-1 pt-2">
            {laggingSectors.slice(0, 3).map(s => (
              <div
                key={s.sector}
                onClick={(e) => {
                  e.stopPropagation();
                  setInspectedSectorName(s.sector);
                }}
                className="w-full text-left p-1.5 rounded-lg bg-[#070b13]/80 hover:bg-rose-900/40 text-xs flex items-center justify-between text-slate-200 transition-colors"
              >
                <span className="truncate pr-2">{s.sector}</span>
                <span className="text-rose-400 font-bold shrink-0">{s.avgChangePct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Analytics Selector Tabs */}
      <div className="p-5 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('rrg')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'rrg'
                  ? 'bg-cyan-600 text-slate-950 shadow-md shadow-cyan-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Relative Rotation Scatter Map (RRG)</span>
            </button>

            <button
              onClick={() => setActiveTab('turnover-flow')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'turnover-flow'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Turnover Concentration &amp; Flow (৳Cr)</span>
            </button>

            <button
              onClick={() => setActiveTab('momentum-rank')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'momentum-rank'
                  ? 'bg-emerald-600 text-slate-950 shadow-md shadow-emerald-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Sector Performance Ranking (%)</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-sans">
            <span className="flex items-center gap-1 text-emerald-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Leading
            </span>
            <span className="flex items-center gap-1 text-cyan-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              Improving
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Weakening
            </span>
            <span className="flex items-center gap-1 text-rose-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              Lagging
            </span>
          </div>
        </div>

        {/* Tab 1: Relative Rotation Scatter Chart */}
        {activeTab === 'rrg' && (
          <div>
            <div className="mb-2 text-xs text-slate-400 font-sans flex items-center justify-between">
              <span>Bubble size corresponds to daily turnover (Cr BDT). Click any bubble or sector to inspect constituent stocks.</span>
              <span className="text-slate-500">Center reference = DSEX Parity (100 RS)</span>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    type="number"
                    dataKey="relativeStrength"
                    name="Relative Strength"
                    stroke="#64748b"
                    fontSize={10}
                    domain={['auto', 'auto']}
                    tickFormatter={v => `${v}`}
                    label={{ value: 'Relative Strength vs DSEX (100 = Benchmark Parity)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 10 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="momentumScore"
                    name="Momentum Score"
                    stroke="#64748b"
                    fontSize={10}
                    domain={['auto', 'auto']}
                    label={{ value: 'RS-Momentum (Rate of Change)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }}
                  />
                  <ZAxis type="number" dataKey="turnoverCr" range={[80, 500]} name="Turnover (Cr)" />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3', stroke: '#38bdf8' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const s = payload[0].payload;
                        return (
                          <div className="bg-[#0b1220]/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl text-[11px] font-mono space-y-1.5 min-w-[210px]">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                              <span className="font-bold text-white text-xs">{s.sector}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                s.quadrant === 'Leading' ? 'bg-emerald-500/20 text-emerald-300'
                                : s.quadrant === 'Improving' ? 'bg-cyan-500/20 text-cyan-300'
                                : s.quadrant === 'Weakening' ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                              }`}>
                                {s.quadrant}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                              <span className="text-slate-400">RS vs DSEX:</span>
                              <span className="text-white font-bold text-right">{s.relativeStrength}</span>
                              <span className="text-slate-400">RS-Momentum:</span>
                              <span className={`font-bold text-right ${s.momentumScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {s.momentumScore >= 0 ? '+' : ''}{s.momentumScore}
                              </span>
                              <span className="text-slate-400">Turnover:</span>
                              <span className="text-amber-300 font-bold text-right">৳{s.turnoverCr} Cr</span>
                              <span className="text-slate-400">Market Share:</span>
                              <span className="text-slate-300 font-bold text-right">{s.turnoverSharePct}%</span>
                            </div>
                            {s.topStock && (
                              <div className="pt-1 border-t border-slate-800 text-[10px] flex justify-between items-center text-slate-300">
                                <span>Leader: <span className="font-bold text-cyan-300">{s.topStock}</span></span>
                                <span className={s.topStockGain >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                  {s.topStockGain >= 0 ? '+' : ''}{s.topStockGain}%
                                </span>
                              </div>
                            )}
                            <div className="text-[9px] text-cyan-400 text-center pt-0.5 font-sans">
                              Click to inspect constituent stocks &rarr;
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine x={100} stroke="#475569" strokeDasharray="4 4" />
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" />
                  <Scatter
                    data={displaySectors}
                    onClick={(entry: any) => {
                      const sec = entry?.payload?.sector || entry?.sector;
                      if (sec) setInspectedSectorName(sec);
                    }}
                    className="cursor-pointer"
                  >
                    {displaySectors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getQuadrantColor(entry.quadrant)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 2: Turnover Flow Bar Chart & Institutional Concentration Matrix */}
        {activeTab === 'turnover-flow' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400 font-sans">
                Institutional turnover volume (Cr BDT) and capital flow concentration by sector.
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Total Scanned Turnover:</span>
                <span className="text-xs font-bold text-amber-400 font-mono">৳{turnoverStats.totalMarketTurnoverCr} Cr</span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedTurnoverSectors} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="sector" stroke="#64748b" fontSize={10} angle={-35} textAnchor="end" height={60} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={v => `৳${v}Cr`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#070b13', borderColor: '#334155', borderRadius: '12px' }}
                    formatter={(val: any, name: any, item: any) => [
                      `৳${val} Cr (${item.payload.turnoverSharePct}% of market turnover)`,
                      'Turnover'
                    ]}
                  />
                  <Bar dataKey="turnoverCr" radius={[4, 4, 0, 0]} onClick={(data: any) => setInspectedSectorName(data.sector)}>
                    {sortedTurnoverSectors.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={getQuadrantColor(entry.quadrant)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Institutional Turnover Concentration & Smart Money Matrix Widget */}
            <div className="p-4 rounded-xl bg-[#070b13] border border-cyan-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-400" />
                  <span className="font-bold text-white text-xs">
                    Institutional Turnover Concentration &amp; Smart Money Absorption
                  </span>
                </div>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                  turnoverStats.regime === 'INSTITUTIONAL_HEAVY'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {turnoverStats.regime === 'INSTITUTIONAL_HEAVY' ? 'INSTITUTIONAL CONCENTRATION HIGH' : 'BALANCED MARKET TURNOVER'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#0b111e] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">TOP 5 EQUITIES CONCENTRATION</span>
                  <div className="text-xl font-bold text-amber-400">
                    {turnoverStats.top5ConcentrationPct}%
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                    ৳{turnoverStats.top5TurnoverCr} Cr of market turnover
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#0b111e] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">TOP 10 EQUITIES CONCENTRATION</span>
                  <div className="text-xl font-bold text-cyan-400">
                    {turnoverStats.top10ConcentrationPct}%
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                    ৳{turnoverStats.top10TurnoverCr} Cr of market turnover
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#0b111e] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">MARKET REGIME INSIGHT</span>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    {turnoverStats.analysis}
                  </p>
                </div>
              </div>

              {/* Top 5 Liquidity Magnet Equities Strip */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Top Institutional Liquidity Magnets Today:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {turnoverStats.topTurnoverStocks.slice(0, 5).map(s => (
                    <div
                      key={s.symbol}
                      onClick={() => {
                        const stockObj = stocks.find(stk => stk.symbol === s.symbol);
                        if (stockObj) onSelectStock(stockObj);
                      }}
                      className="p-2 rounded-lg bg-[#0b111e] border border-slate-800/80 hover:border-cyan-500/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white hover:text-cyan-400">{s.symbol}</span>
                        <span className={`text-[10px] font-bold ${s.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {s.changePct >= 0 ? '+' : ''}{s.changePct}%
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-300 font-mono mt-0.5">
                        ৳{s.turnoverCr} Cr ({s.sharePct}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Sector Performance Bar Chart */}
        {activeTab === 'momentum-rank' && (
          <div>
            <div className="mb-2 text-xs text-slate-400 font-sans">
              Average session change % across all constituents in each sector.
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedMomentumSectors} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="sector" stroke="#64748b" fontSize={10} angle={-35} textAnchor="end" height={60} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#070b13', borderColor: '#334155', borderRadius: '12px' }}
                    formatter={(val: any) => [`${val}% avg change`, 'Performance']}
                  />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <Bar dataKey="avgChangePct" radius={[4, 4, 0, 0]} onClick={(data: any) => setInspectedSectorName(data.sector)}>
                    {sortedMomentumSectors.map((entry, index) => (
                      <Cell key={`mom-${index}`} fill={entry.avgChangePct >= 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Sector Ranking Breakdown Table */}
      <div className="p-5 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Sector Rankings &amp; Constituent Breakdown
            </h3>
          </div>

          {/* Quadrant Quick Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 font-sans">Filter Quadrant:</span>
            {(['All', 'Leading', 'Improving', 'Weakening', 'Lagging'] as const).map(q => (
              <button
                key={q}
                onClick={() => setQuadrantFilter(q)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  quadrantFilter === q
                    ? 'bg-slate-700 text-white border border-slate-500'
                    : 'bg-[#070b13] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#070b13] text-slate-400 border-b border-slate-800 font-sans">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Sector</th>
                <th className="py-2.5 px-3 font-semibold">Quadrant</th>
                <th className="py-2.5 px-3 font-semibold">Scrips</th>
                <th className="py-2.5 px-3 font-semibold">Turnover (Cr)</th>
                <th className="py-2.5 px-3 font-semibold">Market Share</th>
                <th className="py-2.5 px-3 font-semibold">Avg Change %</th>
                <th className="py-2.5 px-3 font-semibold">Relative Strength</th>
                <th className="py-2.5 px-3 font-semibold">Top Performing Stock</th>
                <th className="py-2.5 px-3 font-semibold text-right">Drilldown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {displaySectors.map(s => {
                const topStockObj = stocks.find(stk => stk.symbol === s.topStock);
                return (
                  <tr
                    key={s.sector}
                    onClick={() => setInspectedSectorName(s.sector)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: getQuadrantColor(s.quadrant) }}
                      />
                      <span>{s.sector}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded font-bold"
                        style={{
                          backgroundColor: `${getQuadrantColor(s.quadrant)}20`,
                          color: getQuadrantColor(s.quadrant),
                          border: `1px solid ${getQuadrantColor(s.quadrant)}40`,
                        }}
                      >
                        {s.quadrant}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{s.stockCount}</td>
                    <td className="py-2.5 px-3 text-amber-400 font-bold">৳{s.turnoverCr} Cr</td>
                    <td className="py-2.5 px-3 text-slate-400">{s.turnoverSharePct}%</td>
                    <td className={`py-2.5 px-3 font-bold ${s.avgChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {s.avgChangePct >= 0 ? '+' : ''}{s.avgChangePct}%
                    </td>
                    <td className="py-2.5 px-3 text-cyan-400 font-bold">{s.relativeStrength}</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {topStockObj ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStock(topStockObj);
                          }}
                          className="hover:text-emerald-400 underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span>{s.topStock} (+{s.topStockGain}%)</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      ) : (
                        <span>{s.topStock} (+{s.topStockGain}%)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectedSectorName(s.sector);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-slate-950 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Inspect ({s.stockCount})
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTOR DEEP-DIVE DRILLDOWN MODAL */}
      {inspectedSectorData && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-[#0b111e] border border-cyan-500/40 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto font-mono">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-xl text-slate-950 shadow-md"
                  style={{ backgroundColor: getQuadrantColor(inspectedSectorData.meta.quadrant) }}
                >
                  <Layers className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      {inspectedSectorData.meta.sector}
                    </h3>
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full font-bold"
                      style={{
                        backgroundColor: `${getQuadrantColor(inspectedSectorData.meta.quadrant)}20`,
                        color: getQuadrantColor(inspectedSectorData.meta.quadrant),
                        border: `1px solid ${getQuadrantColor(inspectedSectorData.meta.quadrant)}50`,
                      }}
                    >
                      {inspectedSectorData.meta.quadrant} Quadrant
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Sector constituent analysis, market breadth, capital flow, and constituent stock setups
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectedSectorName(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#070b13] border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Total Turnover</span>
                <span className="text-base font-bold text-amber-400">
                  ৳{inspectedSectorData.meta.turnoverCr} Cr
                </span>
                <span className="text-[11px] text-slate-400 block font-sans">
                  {inspectedSectorData.meta.turnoverSharePct}% of DSE Market
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#070b13] border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Relative Strength</span>
                <span className="text-base font-bold text-cyan-400">
                  {inspectedSectorData.meta.relativeStrength}
                </span>
                <span className="text-[11px] text-slate-400 block font-sans">
                  {inspectedSectorData.meta.relativeStrength >= 100 ? 'Outperforming DSEX' : 'Underperforming DSEX'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#070b13] border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">RS-Momentum</span>
                <span className={`text-base font-bold ${inspectedSectorData.meta.momentumScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {inspectedSectorData.meta.momentumScore >= 0 ? '+' : ''}{inspectedSectorData.meta.momentumScore}
                </span>
                <span className="text-[11px] text-slate-400 block font-sans">
                  {inspectedSectorData.meta.momentumScore >= 0 ? 'Accelerating Velocity' : 'Decelerating Trend'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#070b13] border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Sector Breadth</span>
                <div className="text-xs font-bold pt-1 space-x-1.5">
                  <span className="text-emerald-400">↑ {inspectedSectorData.advancingCount} Adv</span>
                  <span className="text-rose-400">↓ {inspectedSectorData.decliningCount} Dec</span>
                  <span className="text-slate-400">→ {inspectedSectorData.unchangedCount}</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#070b13] border border-slate-800 text-xs">
              <span className="text-slate-300 font-sans">
                Want to scan setups exclusively within <strong className="text-white">{inspectedSectorData.meta.sector}</strong>?
              </span>

              <button
                onClick={() => {
                  onSelectSector(inspectedSectorData.meta.sector);
                  setInspectedSectorName(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Filter Main Screener for {inspectedSectorData.meta.sector}</span>
              </button>
            </div>

            {/* Constituent Stocks Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-cyan-400" />
                <span>Constituent Equities in {inspectedSectorData.meta.sector} ({inspectedSectorData.constituents.length})</span>
              </h4>

              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#070b13] text-slate-400 border-b border-slate-800 font-sans sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Symbol</th>
                      <th className="py-2 px-3 font-semibold">Price</th>
                      <th className="py-2 px-3 font-semibold">Change %</th>
                      <th className="py-2 px-3 font-semibold">Turnover (Cr)</th>
                      <th className="py-2 px-3 font-semibold">RVOL</th>
                      <th className="py-2 px-3 font-semibold">Stage</th>
                      <th className="py-2 px-3 font-semibold">ML Win %</th>
                      <th className="py-2 px-3 font-semibold">PA Setup</th>
                      <th className="py-2 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {inspectedSectorData.constituents.map(stk => (
                      <tr key={stk.symbol} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2 px-3 font-bold text-white">
                          <button
                            onClick={() => {
                              onSelectStock(stk);
                              setInspectedSectorName(null);
                            }}
                            className="hover:text-emerald-400 underline font-bold cursor-pointer"
                          >
                            {stk.symbol}
                          </button>
                        </td>
                        <td className="py-2 px-3 text-slate-200">৳{stk.lastPrice.toFixed(1)}</td>
                        <td className={`py-2 px-3 font-bold ${stk.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {stk.changePercent >= 0 ? '+' : ''}{stk.changePercent.toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-amber-400 font-bold">
                          ৳{stk.turnoverCr.toFixed(2)} Cr
                        </td>
                        <td className="py-2 px-3 text-slate-300">{stk.rvol.toFixed(1)}x</td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            stk.stage === 2 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            Stage {stk.stage}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-emerald-400 font-bold">
                          {Math.round((stk.mlProbability || 0.5) * 100)}%
                        </td>
                        <td className="py-2 px-3">
                          {stk.paConfirmed ? (
                            <span className="text-[10px] text-emerald-400 font-bold">PA Confirmed ✓</span>
                          ) : (
                            <span className="text-[10px] text-slate-500">Neutral</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => {
                              onSelectStock(stk);
                              setInspectedSectorName(null);
                            }}
                            className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-slate-950 font-bold text-[10px] transition-colors cursor-pointer"
                          >
                            Open Chart
                          </button>
                        </td>
                      </tr>
                    ))}
                    {inspectedSectorData.constituents.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-400 font-sans">
                          No company stocks uploaded for this sector yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setInspectedSectorName(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Close Drilldown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DSE Sector Alignment & Remapping Modal */}
      {showRemapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl max-h-[85vh] bg-[#0b111e] border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden font-mono text-xs">
            {/* Modal Header */}
            <div className="p-4 bg-[#070b13] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Edit3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">DSE Sectoral Scrip Mapping &amp; Alignment</h3>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Map individual ticker symbols to official Dhaka Stock Exchange (DSE) industry sectors.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRemapModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Controls Bar */}
            <div className="p-3 bg-[#070b13]/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ticker symbol or company name..."
                  value={remapSearch}
                  onChange={e => setRemapSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRemapFilter('unmapped')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    remapFilter === 'unmapped'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Unclassified Only ({unclassifiedStocks.length})
                </button>
                <button
                  onClick={() => setRemapFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    remapFilter === 'all'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Scrips ({stocks.filter(s => !s.isSectorIndex && !isSectorIndexSymbol(s.symbol) && !isBenchmarkSymbol(s.symbol)).length})
                </button>
              </div>
            </div>

            {/* Scrips Table / List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {stocks
                .filter(stk => {
                  if (stk.isSectorIndex || isSectorIndexSymbol(stk.symbol) || isBenchmarkSymbol(stk.symbol) || stk.sector === 'Benchmark') return false;
                  if (remapFilter === 'unmapped' && !isUnclassifiedSector(stk.sector)) return false;
                  if (remapSearch) {
                    const q = remapSearch.toUpperCase().trim();
                    return stk.symbol.includes(q) || (stk.name && stk.name.toUpperCase().includes(q));
                  }
                  return true;
                })
                .map(stk => (
                  <div
                    key={stk.symbol}
                    className="p-2.5 rounded-xl bg-[#070b13] border border-slate-800 flex flex-wrap items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{stk.symbol}</span>
                        <span className="text-[11px] text-slate-400">{stk.name}</span>
                        {isUnclassifiedSector(stk.sector) && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                            UNMAPPED
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Current Sector: <span className={isUnclassifiedSector(stk.sector) ? 'text-amber-400 font-bold' : 'text-slate-300'}>{stk.sector}</span> &bull; Price: ৳{stk.lastPrice.toFixed(1)} &bull; Turnover: ৳{(stk.turnoverCr || 0).toFixed(2)} Cr
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={stk.sector}
                        onChange={e => handleRemapStock(stk.symbol, e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-cyan-300 font-bold text-xs focus:outline-none cursor-pointer"
                      >
                        {isUnclassifiedSector(stk.sector) && (
                          <option value={stk.sector} disabled>-- Assign Sector --</option>
                        )}
                        {OFFICIAL_DSE_SECTORS.map(sec => (
                          <option key={sec} value={sec}>
                            {sec}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

              {stocks.filter(stk => {
                if (stk.isSectorIndex || isSectorIndexSymbol(stk.symbol) || isBenchmarkSymbol(stk.symbol) || stk.sector === 'Benchmark') return false;
                if (remapFilter === 'unmapped' && !isUnclassifiedSector(stk.sector)) return false;
                if (remapSearch) {
                  const q = remapSearch.toUpperCase().trim();
                  return stk.symbol.includes(q) || (stk.name && stk.name.toUpperCase().includes(q));
                }
                return true;
              }).length === 0 && (
                <div className="py-12 text-center text-slate-400 font-sans space-y-1">
                  <div className="text-emerald-400 font-bold text-sm">All Scrips Successfully Mapped!</div>
                  <div className="text-xs text-slate-500">Every loaded equity is accurately categorized into official DSE sectors.</div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#070b13] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Mappings persist permanently in local storage &amp; database.</span>
              <button
                onClick={() => setShowRemapModal(false)}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SectorRotationMatrix;
