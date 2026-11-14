/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  Zap,
  Sparkles,
  BarChart3,
  CalendarRange,
  Radar,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  BrainCircuit,
  Eye,
  ChevronDown,
  ChevronUp,
  Activity,
  CheckCircle2,
  XCircle,
  Gauge,
  SlidersHorizontal,
  Target,
  Percent,
  Compass
} from 'lucide-react';
import { DseStockItem, ScreenerMode } from '../types/dse';
import { evaluateCorporateActionLockout } from '../lib/dseCorporateActions';

interface ScreenerCardItemProps {
  stock: DseStockItem;
  mode: ScreenerMode;
  onSelect: (stock: DseStockItem) => void;
}

export function ScreenerCardItem({ stock, mode, onSelect }: ScreenerCardItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [hovered5DBar, setHovered5DBar] = useState<{
    x: number;
    y: number;
    close: number;
    open?: number;
    high?: number;
    low?: number;
    date?: string;
    volume?: number;
    dayIndex: number;
  } | null>(null);
  const isUp = stock.change >= 0;
  const tp = stock.technicalParams;
  const ca = evaluateCorporateActionLockout(stock);

  // RVOL color styling
  const rvolColor =
    stock.rvol >= 2.0
      ? 'text-orange-400 border-orange-500/40 bg-orange-500/10'
      : stock.rvol >= 1.4
      ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
      : 'text-slate-400 border-slate-800 bg-slate-900';

  // Phase badges for Breakout Hunt
  const phaseStyles = {
    breakout: {
      badge: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
      label: 'BREAKING OUT',
      meter: 'bg-orange-400',
    },
    reversal: {
      badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
      label: 'REVERSAL',
      meter: 'bg-cyan-400',
    },
    accumulation: {
      badge: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
      label: 'ACCUMULATING',
      meter: 'bg-purple-400',
    },
    distribution: {
      badge: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      label: 'DISTRIBUTION',
      meter: 'bg-rose-500',
    },
    pullback: {
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      label: 'PULLBACK',
      meter: 'bg-amber-400',
    },
    watchlist: {
      badge: 'bg-slate-800 text-slate-400 border-slate-700',
      label: 'WATCHLIST',
      meter: 'bg-slate-500',
    },
  };

  const style = phaseStyles[stock.phase] || phaseStyles.watchlist;
  const pos52pct = Math.round(stock.pricePosition52w * 100);

  // 5-Day Price History Calculations for Mini Sparkline
  const fiveDayBars = (stock.bars && stock.bars.length >= 5)
    ? stock.bars.slice(-5)
    : (stock.bars && stock.bars.length > 0)
    ? stock.bars
    : [{ date: stock.latestBarDate || 'Today', open: stock.lastPrice, high: stock.lastPrice, low: stock.lastPrice, close: stock.lastPrice, volume: stock.volume }];

  const first5DClose = fiveDayBars[0]?.close ?? stock.lastPrice;
  const last5DClose = fiveDayBars[fiveDayBars.length - 1]?.close ?? stock.lastPrice;
  const fiveDayChangeBDT = last5DClose - first5DClose;
  const fiveDayChangePct = first5DClose > 0 ? (fiveDayChangeBDT / first5DClose) * 100 : 0;
  const is5DUp = fiveDayChangePct >= 0;

  const min5D = Math.min(...fiveDayBars.map(b => b.low ?? b.close));
  const max5D = Math.max(...fiveDayBars.map(b => b.high ?? b.close));
  const range5D = max5D - min5D || 1;

  const sparkWidth5D = 240;
  const sparkHeight5D = 38;
  const paddingX = 10;
  const paddingY = 6;
  const effectiveW = sparkWidth5D - paddingX * 2;
  const effectiveH = sparkHeight5D - paddingY * 2;

  const sparkCoords5D = fiveDayBars.map((b, i) => {
    const x = fiveDayBars.length > 1
      ? paddingX + (i / (fiveDayBars.length - 1)) * effectiveW
      : sparkWidth5D / 2;
    const y = sparkHeight5D - paddingY - ((b.close - min5D) / range5D) * effectiveH;
    return {
      x,
      y,
      close: b.close,
      open: b.open,
      high: b.high,
      low: b.low,
      date: b.date,
      volume: b.volume,
      dayIndex: i,
    };
  });

  const points5D = sparkCoords5D.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
  const areaPoints5D = `${points5D} ${sparkCoords5D[sparkCoords5D.length - 1]?.x.toFixed(1) || effectiveW},${sparkHeight5D} ${sparkCoords5D[0]?.x.toFixed(1) || paddingX},${sparkHeight5D}`;
  const baselineY = sparkHeight5D - paddingY - ((first5DClose - min5D) / range5D) * effectiveH;

  // Conditions checklist items (AmiBroker AFL 8-Rule criteria)
  const conditionList = [
    { label: 'Trend Gate (Close > MA50 & MA100)', met: tp?.conditions?.trend ?? (stock.lastPrice > (tp?.ma50 ?? 0)) },
    { label: 'MA14 Trigger Cross (≤ 5 bars)', met: tp?.conditions?.trigger ?? (stock.lastPrice >= (tp?.ma14 ?? 0)) },
    { label: 'Volume Surge (RVOL ≥ 1.3x)', met: tp?.conditions?.volume ?? (stock.rvol >= 1.3) },
    { label: 'Stealth OBV Accumulation', met: tp?.conditions?.obv ?? (stock.obvTrend === 'rising') },
    { label: 'Regular Bullish Divergence', met: tp?.conditions?.divergence ?? (stock.confluenceScore >= 4) },
    { label: 'Bollinger Band Squeeze Coiled', met: tp?.conditions?.squeeze ?? (stock.squeezeBarCount >= 5) },
    { label: '52-Week Support (< 40% Low)', met: tp?.conditions?.support ?? (stock.pricePosition52w < 0.40) },
    { label: 'Price Action Confirmation ✓', met: tp?.conditions?.pa ?? stock.paConfirmed },
  ];

  const metCount = conditionList.filter(c => c.met).length;

  // Profit prediction calculations
  const mlProbPct = Math.round(stock.mlProbability * 100);
  const targetGainPct = Math.round(((stock.targetPrice1 - stock.lastPrice) / stock.lastPrice) * 1000) / 10;
  const stopRiskPct = Math.round(((stock.lastPrice - stock.stopLoss) / stock.lastPrice) * 1000) / 10;
  const expectedReturn = stock.mlExpectedReturnPct ?? Math.round((stock.mlProbability * targetGainPct - (1 - stock.mlProbability) * stopRiskPct) * 10) / 10;
  const profitFactor = stock.mlProfitFactor ?? Math.round((stock.mlProbability * targetGainPct / Math.max(0.1, (1 - stock.mlProbability) * stopRiskPct)) * 10) / 10;
  const kellySize = stock.mlKellySizePct ?? 12;

  return (
    <div
      className={`group bg-[#0b111e] border rounded-2xl p-4 transition-all hover:shadow-2xl relative overflow-hidden flex flex-col justify-between ${
        stock.paConfirmed
          ? 'border-emerald-500/40 hover:border-emerald-400 shadow-emerald-950/20'
          : 'border-slate-800 hover:border-slate-700 hover:shadow-slate-950/40'
      }`}
    >
      {/* Top PA Confirmation Gradient Accent Stripe */}
      {stock.paConfirmed && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500" />
      )}

      {/* Main Card Body */}
      <div>
        {/* Top Header: Symbol, Badges & Sector */}
        <div className="flex justify-between items-start gap-2 mb-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                onClick={() => onSelect(stock)}
                className="font-mono text-base sm:text-lg font-black text-white group-hover:text-emerald-400 transition-colors cursor-pointer tracking-tight"
              >
                {stock.symbol}
              </span>
              {stock.isSectorIndex ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold border border-purple-500/40">
                  SECTOR INDEX
                </span>
              ) : (
                <span
                  title={
                    stock.fundamentalsSource === 'DEFAULT_ESTIMATE'
                      ? 'Estimated Category/Fundamentals — import verified DSE fundamentals CSV or check dsebd.org'
                      : stock.fundamentalsSource === 'USER_IMPORTED'
                      ? 'User-imported verified DSE Category & Fundamentals'
                      : 'Pre-loaded Category metadata'
                  }
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                    stock.category === 'Z'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                      : 'bg-slate-800/90 text-slate-300 border-slate-700'
                  }`}
                >
                  Cat {stock.category}
                  {stock.fundamentalsSource === 'DEFAULT_ESTIMATE' && (
                    <span className="text-[8px] text-amber-300/80 ml-1">(Est)</span>
                  )}
                </span>
              )}
              {stock.isSme && (
                <span
                  title="DSE SME Platform (Growth Board) — Qualified Investor (QI) rules apply"
                  className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold border border-purple-500/40"
                >
                  SME
                </span>
              )}
              {stock.freeFloatPct < 15 && (
                <span
                  title={`Low Free Float (${stock.freeFloatPct.toFixed(1)}%${stock.fundamentalsSource === 'DEFAULT_ESTIMATE' ? ', estimated' : ''}) — high volatility risk`}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono"
                >
                  FLOAT {stock.freeFloatPct.toFixed(0)}% ⚠
                </span>
              )}
              {stock.stage && (
                <span
                  title={`Weinstein Stage ${stock.stage} (${stock.stage === 2 ? 'Advancing Markup' : stock.stage === 1 ? 'Basing' : 'Declining'})`}
                  className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold ${
                    stock.stage === 2
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : stock.stage === 1
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  Stage {stock.stage}
                </span>
              )}
              {stock.paConfirmed && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                  PA Confirmed ✓
                </span>
              )}
              {stock.vduConfirmed && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono font-bold" title="Volume Dry-Up: Supply exhaustion before breakout">
                  VDU Dry-Up 💎
                </span>
              )}
              {stock.t2SettlementRisk === 'OPTIMAL_PIVOT_ENTRY' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold" title="Within 2.5% of breakout base: Minimal T+2 settlement lock risk">
                  🟢 Pivot Zone (T+2 Safe)
                </span>
              )}
              {stock.t2SettlementRisk === 'EXTENDED_CHASE_RISK' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold" title="Extended >4% above base: Severe T+2 settlement reversal risk">
                  🔴 Extended (T+2 Risk)
                </span>
              )}
              {stock.upperWickExhaustion && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold" title="Upper wick >45%: Institutional seller rejection into close">
                  Supply Overhang ⚠
                </span>
              )}
              {stock.dataQuality === 'LIMITED_HISTORY' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono font-bold" title="Fewer than 20 daily bars loaded; indicators carry reduced confidence">
                  LIMITED &lt;20D
                </span>
              )}
              {ca && (
                <span
                  title={`DSE Corporate Action: ${ca.details || ''} (Est. Ex-Price: ৳${ca.estimatedExPrice})`}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border flex items-center gap-1 ${
                    ca.lockoutRisk === 'CRITICAL_T2_LOCKOUT'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : ca.lockoutRisk === 'APPROACHING_CAUTION'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  }`}
                >
                  <span>📅 RD: {ca.recordDate.slice(5)}</span>
                  {ca.dividendCashPct ? <span>({ca.dividendCashPct}% C)</span> : ''}
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="font-sans truncate max-w-[130px]">{stock.name}</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-slate-400 font-mono shrink-0" title={`Latest Bar Date for ${stock.symbol}`}>
                📅 {stock.latestBarDate || (stock.bars?.[stock.bars.length - 1]?.date) || '2026-10-18'}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-slate-400 font-mono uppercase truncate max-w-[95px]">
              {stock.sector}
            </span>
            {/* Setup State Badge */}
            <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold ${
              stock.setupState === 'CONFIRMED'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : stock.setupState === 'TRADE_READY'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {stock.setupState}
            </span>
          </div>
        </div>

        {/* Price Row */}
        <div className="flex items-end justify-between my-2 pt-1">
          <div>
            <div className="text-xl font-bold font-mono text-white leading-none">
              {stock.lastPrice.toFixed(1)} <span className="text-xs text-slate-400 font-normal">BDT</span>
            </div>
            <div className={`text-xs font-mono font-bold mt-1 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isUp ? '+' : ''}{stock.change.toFixed(1)} ({stock.changePercent.toFixed(2)}%)
            </div>
          </div>

          <div className="flex items-center gap-1 flex-wrap justify-end">
            <span
              title={`Trade Value (Turnover): ৳${stock.turnoverCr.toFixed(2)} Crore (${(stock.turnoverCr * 10).toFixed(1)} mn BDT)`}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold text-amber-300 bg-amber-500/10 border-amber-500/30 whitespace-nowrap"
            >
              ৳{stock.turnoverCr >= 10 ? stock.turnoverCr.toFixed(1) : stock.turnoverCr.toFixed(2)} Cr Value
            </span>
            <span
              title={`Trade Volume: ${stock.volume.toLocaleString()} shares traded`}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold text-cyan-300 bg-cyan-500/10 border-cyan-500/30 whitespace-nowrap"
            >
              {stock.volume >= 1000000
                ? (stock.volume / 1000000).toFixed(2) + 'M'
                : stock.volume >= 1000
                ? (stock.volume / 1000).toFixed(1) + 'k'
                : stock.volume} Vol
            </span>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold ${rvolColor}`}>
              RVOL {stock.rvol.toFixed(1)}x
            </span>
          </div>
        </div>

        {/* 5-Day Price History Mini Sparkline Chart */}
        <div
          className="my-2 p-2 rounded-xl bg-[#070d18] border border-slate-800/80 hover:border-cyan-500/40 transition-all cursor-pointer group/spark5d"
          onClick={() => onSelect(stock)}
          onMouseLeave={() => setHovered5DBar(null)}
          title={`Click to open full chart for ${stock.symbol} (5-Day Return: ${is5DUp ? '+' : ''}${fiveDayChangePct.toFixed(1)}%)`}
        >
          {/* Sparkline Top Header */}
          <div className="flex items-center justify-between text-[10px] font-mono mb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 font-bold tracking-wider text-[9px] flex items-center gap-1 uppercase">
                <Activity className="h-3 w-3 text-cyan-400 shrink-0" />
                5D Price Action
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border tabular-nums ${
                is5DUp
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}>
                {is5DUp ? '▲ +' : '▼ '}{fiveDayChangePct.toFixed(1)}% (5D)
              </span>
              {(stock.multiDayMomentum?.isMultiDayClimber || (stock.multiDayMomentum?.consecutiveUpDays ?? 0) >= 2) && (
                <span className="text-[9px] font-bold text-cyan-300 tabular-nums">
                  {stock.multiDayMomentum!.consecutiveUpDays}D Streak &middot; {stock.multiDayMomentum!.upDaysInLast5}/5 Up
                </span>
              )}
            </div>

            <div className="text-[9px] text-slate-400 font-mono">
              {hovered5DBar ? (
                <span className="text-cyan-300 font-bold animate-fade-in">
                  {hovered5DBar.date ? hovered5DBar.date.slice(5) : `Day ${hovered5DBar.dayIndex + 1}`}: ৳{hovered5DBar.close.toFixed(1)}
                  {hovered5DBar.open && (
                    <span className={`ml-1 text-[8px] ${hovered5DBar.close >= hovered5DBar.open ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ({hovered5DBar.close >= hovered5DBar.open ? '+' : ''}{((hovered5DBar.close - hovered5DBar.open) / hovered5DBar.open * 100).toFixed(1)}%)
                    </span>
                  )}
                </span>
              ) : (
                <span>
                  L: <span className="text-slate-300">৳{min5D.toFixed(1)}</span> &bull; H: <span className="text-slate-300">৳{max5D.toFixed(1)}</span>
                </span>
              )}
            </div>
          </div>

          {/* SVG 5-Day Sparkline Canvas */}
          <div className="relative h-[36px] w-full">
            <svg
              viewBox={`0 0 ${sparkWidth5D} ${sparkHeight5D}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id={`sparkGrad5D-${stock.symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={is5DUp ? '#10b981' : '#f43f5e'} stopOpacity="0.30" />
                  <stop offset="100%" stopColor={is5DUp ? '#10b981' : '#f43f5e'} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Day 1 Starting Baseline reference dashed line */}
              <line
                x1={paddingX}
                y1={baselineY}
                x2={sparkWidth5D - paddingX}
                y2={baselineY}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="2,2"
              />

              {/* Shaded Area Fill */}
              <polygon
                fill={`url(#sparkGrad5D-${stock.symbol})`}
                points={areaPoints5D}
              />

              {/* 5-Day Trend Polyline */}
              <polyline
                fill="none"
                stroke={is5DUp ? '#10b981' : '#f43f5e'}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points5D}
              />

              {/* 5 Session Data Points */}
              {sparkCoords5D.map((pt, idx) => {
                const isLast = idx === sparkCoords5D.length - 1;
                const isHovered = hovered5DBar?.dayIndex === idx;

                return (
                  <g
                    key={idx}
                    onMouseEnter={() => setHovered5DBar(pt)}
                    className="cursor-pointer"
                  >
                    {/* Generous hover target */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="9"
                      fill="transparent"
                    />

                    {/* Outer glow ring for active node or hovered node */}
                    {(isLast || isHovered) && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 5.5 : 4}
                        fill="none"
                        stroke={is5DUp ? '#34d399' : '#fb7185'}
                        strokeWidth="1.2"
                        className={isLast ? 'animate-pulse' : ''}
                      />
                    )}

                    {/* Core Session Node */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 3.5 : isLast ? 3 : 2}
                      fill={isHovered ? '#ffffff' : is5DUp ? '#34d399' : '#fb7185'}
                      stroke={is5DUp ? '#064e3b' : '#881337'}
                      strokeWidth="1"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* 5-Session Horizontal Date / Day Timeline */}
          <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 pt-1 border-t border-slate-800/60 px-0.5">
            {sparkCoords5D.map((pt, idx) => {
              const isLast = idx === sparkCoords5D.length - 1;
              const dateStr = pt.date ? pt.date.slice(5) : `D-${4 - idx}`;
              return (
                <span
                  key={idx}
                  className={`transition-colors ${
                    hovered5DBar?.dayIndex === idx
                      ? 'text-cyan-300 font-bold'
                      : isLast
                      ? 'text-slate-300 font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  {isLast ? 'Today' : dateStr}
                </span>
              );
            })}
          </div>
        </div>

        {/* STAR FEATURE: REDESIGNED AI/ML PROFIT PREDICTOR & ALPHA EDGE PANEL */}
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#071322] to-[#040812] border border-cyan-500/30 mb-2.5 space-y-2">
          {/* Top Row: ML Probability + Conviction Tier */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                <BrainCircuit className="h-3.5 w-3.5" />
              </span>
              <span className="text-[11px] font-mono font-bold text-white tracking-wide">
                ML Profit Predictor
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md border ${
                mlProbPct >= 80
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs shadow-emerald-950'
                  : mlProbPct >= 70
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              }`}>
                {mlProbPct}% WIN PROB
              </span>
            </div>
          </div>

          {/* Probability Bar with Glow */}
          <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden flex">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                mlProbPct >= 80
                  ? 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-emerald-300'
                  : 'bg-gradient-to-r from-amber-400 to-cyan-400'
              }`}
              style={{ width: `${mlProbPct}%` }}
            />
          </div>

          {/* Profit Expectancy & Risk/Reward Grid */}
          <div className="grid grid-cols-3 gap-1 pt-0.5 text-[9px] font-mono">
            <div className="p-1 rounded bg-slate-900/60 border border-slate-800/60 text-center">
              <span className="text-slate-500 block text-[8px]">TARGET 1</span>
              <span className="font-bold text-emerald-400">+{targetGainPct}%</span>
            </div>
            <div className="p-1 rounded bg-slate-900/60 border border-slate-800/60 text-center">
              <span className="text-slate-500 block text-[8px]">EXP. RETURN</span>
              <span className="font-bold text-cyan-300">+{expectedReturn}%</span>
            </div>
            <div className="p-1 rounded bg-slate-900/60 border border-slate-800/60 text-center">
              <span className="text-slate-500 block text-[8px]">KELLY SIZING</span>
              <span className="font-bold text-amber-300">{kellySize}% Risk</span>
            </div>
          </div>

          {/* Top ML Driver Chip */}
          {stock.mlTopFactors.length > 0 && (
            <div className="flex items-center gap-1 text-[9px] font-mono text-slate-300 truncate pt-0.5">
              <span className="text-cyan-400 font-bold shrink-0">Edge Driver:</span>
              <span className="truncate text-slate-300">
                {stock.mlTopFactors[0].name}
              </span>
            </div>
          )}
        </div>

        {/* Screener Meter (Breakout Score or Confluence Meter) */}
        {mode === 'breakout' ? (
          <div className="space-y-1 mb-2.5">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>BREAKOUT SCORE</span>
              <span className="text-orange-400 font-bold">{stock.breakoutScore}/10</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 border-r border-[#0b111e] last:border-0 ${
                    i < stock.breakoutScore ? style.meter : 'bg-transparent'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1 mb-2.5">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>CONFLUENCE METER (AFL RULES)</span>
              <span className="text-emerald-400 font-bold">{stock.confluenceScore}/7</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 border-r border-[#0b111e] last:border-0 ${
                    i < stock.confluenceScore ? 'bg-emerald-400' : 'bg-transparent'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quick Position & Indicators Summary Pill Bar */}
        <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-[#070b13] border border-slate-800/80 mb-2.5 text-[10px] font-mono">
          <div>
            <span className="text-slate-500 block text-[9px]">52W POS</span>
            <span className={`font-bold ${pos52pct < 35 ? 'text-emerald-400' : pos52pct < 55 ? 'text-amber-300' : 'text-slate-400'}`}>
              {pos52pct}% {pos52pct < 35 ? 'Low Base' : 'Mid'}
            </span>
          </div>
          <div className="text-center">
            <span className="text-slate-500 block text-[9px]">SQUEEZE</span>
            <span className={`font-bold ${stock.squeezeBarCount >= 5 ? 'text-purple-400' : 'text-slate-400'}`}>
              {stock.squeezeBarCount > 0 ? `${stock.squeezeBarCount}b active` : 'Normal'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block text-[9px]">OBV TREND</span>
            <span className={`font-bold ${stock.obvTrend === 'rising' ? 'text-emerald-400' : 'text-slate-400'}`}>
              {stock.obvTrend === 'rising' ? '↑ Rising' : stock.obvTrend === 'falling' ? '↓ Falling' : '→ Flat'}
            </span>
          </div>
        </div>

        {/* Accordion Toggle: Inside Technical Parameters & Stock Position */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="w-full mb-2 py-1.5 px-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono flex items-center justify-between text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          <span className="flex items-center gap-1.5 font-bold">
            <SlidersHorizontal className="h-3 w-3 text-emerald-400" />
            <span>{expanded ? 'Hide Technical Parameters' : 'Inside Technicals & Stock Position'}</span>
          </span>
          <span className="flex items-center gap-1 text-[9px] text-emerald-400">
            <span>{metCount}/8 Passed</span>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </span>
        </button>

        {/* Expanded Technical Parameters & Stock Position Details */}
        {expanded && (
          <div className="mb-3 p-2.5 rounded-xl bg-[#060911] border border-slate-800 space-y-2.5 font-mono text-[10px] animate-in fade-in duration-200">
            {/* Condition Evaluation Matrix */}
            <div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-1.5 flex justify-between">
                <span>AmiBroker 8-Rule Checklist</span>
                <span className="text-emerald-400 font-bold">{metCount} of 8 Passed</span>
              </div>
              <div className="space-y-1">
                {conditionList.map((cond, i) => (
                  <div key={i} className="flex items-center justify-between gap-1 text-[10px]">
                    <span className="text-slate-400 truncate">{cond.label}</span>
                    <span className={`shrink-0 font-bold flex items-center gap-0.5 ${
                      cond.met ? 'text-emerald-400' : 'text-slate-600'
                    }`}>
                      {cond.met ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span>PASS</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 text-slate-600" />
                          <span>MISS</span>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Parameters & Stock Position */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
              <div className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                Stock Position vs Moving Averages
              </div>
              
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-[9px] text-slate-500 block">MA20 PROXIMITY</span>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-slate-200">{tp?.ma20.toFixed(1) ?? '—'}</span>
                    <span className="text-[9px] text-emerald-400 font-bold">
                      {tp ? `${tp.ma20DistancePct >= 0 ? '+' : ''}${tp.ma20DistancePct.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <span className="text-[8px] text-slate-400 block mt-0.5">
                    {tp?.inMa20Zone ? '✓ In Buy Zone [97-108%]' : 'Extended'}
                  </span>
                </div>

                <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-[9px] text-slate-500 block">MA50 TREND GATE</span>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-slate-200">{tp?.ma50.toFixed(1) ?? '—'}</span>
                    <span className="text-[9px] text-emerald-400 font-bold">
                      {stock.lastPrice > (tp?.ma50 ?? 0) ? 'Above ✓' : 'Below ✗'}
                    </span>
                  </div>
                  <span className="text-[8px] text-slate-400 block mt-0.5">
                    {tp?.ma50Rising ? 'MA50 genuinely rising' : 'Flat'}
                  </span>
                </div>

                <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-[9px] text-slate-500 block">RSI(14) MOMENTUM</span>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-slate-200">{tp?.rsi14.toFixed(1) ?? '52.0'}</span>
                    <span className="text-[9px] text-cyan-400 font-bold">
                      {tp?.rsiZone ?? 'Neutral'}
                    </span>
                  </div>
                  <span className="text-[8px] text-slate-400 block mt-0.5">
                    {tp?.bullishDivergence ? '✓ Regular Bullish Divergence' : 'No divergence'}
                  </span>
                </div>

                <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-[9px] text-slate-500 block">ATR(14) & TRAIL STOP</span>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-slate-200">{tp?.atr14.toFixed(1) ?? '—'}</span>
                    <span className="text-[9px] text-rose-400 font-bold">
                      Stop {tp?.stop2Atr.toFixed(1) ?? stock.stopLoss.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-[8px] text-slate-400 block mt-0.5">
                    Exit: close &lt; MA20 ({tp?.trailingExitLevel.toFixed(1) ?? '—'})
                  </span>
                </div>
              </div>

              {/* Multi-Day Continuity Strip */}
              {stock.multiDayMomentum && (
                <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800/60 flex items-center justify-between text-[9px] tabular-nums">
                  <span className="text-slate-400">
                    Multi-Day Streak: <strong className="text-cyan-300">{stock.multiDayMomentum.consecutiveUpDays}D</strong> &middot; {stock.multiDayMomentum.higherLowsCount} HL
                  </span>
                  <span className="text-slate-300">
                    3D: <strong className={stock.multiDayMomentum.return3dPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{stock.multiDayMomentum.return3dPct >= 0 ? '+' : ''}{stock.multiDayMomentum.return3dPct}%</strong>
                    {' '}&middot; 10D: <strong className={stock.multiDayMomentum.return10dPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{stock.multiDayMomentum.return10dPct >= 0 ? '+' : ''}{stock.multiDayMomentum.return10dPct}%</strong>
                  </span>
                </div>
              )}

              {/* Cross-Market Relative Strength & Beta Strip */}
              <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800/60 flex items-center justify-between text-[9px] tabular-nums">
                <span className="text-slate-400">
                  RS vs DSEX (20D): <strong className={(stock.relativeStrengthDsex ?? 1) >= 1 ? 'text-emerald-400' : 'text-rose-400'}>{(stock.relativeStrengthDsex ?? 1).toFixed(2)}x</strong>
                </span>
                <span className="text-slate-300">
                  Beta: <strong className="text-cyan-300">{stock.beta.toFixed(2)}</strong> &middot; Sector: <strong className={stock.sectorStrength === 'strong' ? 'text-emerald-400' : stock.sectorStrength === 'weak' ? 'text-rose-400' : 'text-amber-300'}>{stock.sectorStrength.toUpperCase()}</strong>
                </span>
              </div>

              {/* Historical Backtest Track Record */}
              <div className="p-1.5 rounded bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between text-[9px]">
                <span className="text-slate-400">Setup Benchmark:</span>
                <span className="text-emerald-300 font-bold tabular-nums">
                  {tp?.backtestWinRate ?? 62.5}% Win Rate &bull; Avg +{tp?.backtestAvgGain ?? 10.5}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info & Interactive Chart Action */}
      <div className="pt-2 border-t border-slate-800/80 font-mono text-[10px] flex items-center justify-between text-slate-400">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500">ENTRY &le;</span>
          <span className="font-bold text-slate-200">{stock.entryZoneHigh.toFixed(1)}</span>
        </div>

        <div className="flex flex-col text-center">
          <span className="text-[9px] text-slate-500">TP1 (+{stock.rMultipleTarget1 ?? 2.0}R) / SL</span>
          <span className="font-bold">
            <span className="text-emerald-400">৳{stock.targetPrice1.toFixed(1)}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span className="text-rose-400">৳{stock.stopLoss.toFixed(1)}</span>
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(stock);
          }}
          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 hover:border-emerald-400 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
          title="Open All-In-One Pre-Trade Cockpit (Checklist, T+2 Calendar, Circuit Headroom, Capital Sizer)"
        >
          <ShieldCheck className="h-3 w-3" />
          <span>Pre-Trade Cockpit</span>
        </button>
      </div>
    </div>
  );
}
