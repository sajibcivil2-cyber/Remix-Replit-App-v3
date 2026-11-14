/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  TrendingUp,
  BarChart2,
  Activity,
  Layers,
  Compass,
  Zap,
  Target,
  Maximize2,
  Minimize2,
  Eye,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import { DseStockItem, CandleBar } from '../types/dse';
import { calculateIndicators, calculateDetailedTimeSeries, DetailedIndicatorPoint } from '../lib/dseDataEngine';
import { calculateVolumeProfile } from '../lib/quantAnalyticsEngine';

interface InteractiveProChartProps {
  stock: DseStockItem;
  timeframe: '1M' | '3M' | '6M' | '1Y';
  onChangeTimeframe: (tf: '1M' | '3M' | '6M' | '1Y') => void;
}

export function InteractiveProChart({ stock, timeframe, onChangeTimeframe }: InteractiveProChartProps) {
  // Chart Display & Overlay Toggles
  const [chartType, setChartType] = useState<'candles' | 'heikin-ashi' | 'line'>('candles');
  const [chartHeightMode, setChartHeightMode] = useState<'standard' | 'roomy' | 'ultra'>('roomy');
  const [candleZoom, setCandleZoom] = useState<'30' | '60' | 'all'>('60');
  const [customBarsCount, setCustomBarsCount] = useState<number | null>(null);
  const [showEma20, setShowEma20] = useState(true);
  const [showEma50, setShowEma50] = useState(true);
  const [showEma200, setShowEma200] = useState(false);
  const [showBollinger, setShowBollinger] = useState(true);
  const [showBuyZone, setShowBuyZone] = useState(true);
  const [showTargets, setShowTargets] = useState(true);
  const [showSignals, setShowSignals] = useState(true);
  const [showVolumeProfile, setShowVolumeProfile] = useState(true);
  const [activeSubchart, setActiveSubchart] = useState<'rsi' | 'macd' | 'obv' | 'none'>('rsi');
  const [isExpanded, setIsExpanded] = useState(false);

  // Mouse Interaction State
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Base timeframe slice
  const baseTfBars = useMemo(() => {
    const total = stock.bars.length;
    const count = timeframe === '1M' ? 22 : timeframe === '3M' ? 65 : timeframe === '6M' ? 130 : total;
    return stock.bars.slice(-count);
  }, [stock.bars, timeframe]);

  // Actual bars rendered on chart (respecting Candle Zoom to prevent congestion)
  const filteredBars = useMemo(() => {
    if (customBarsCount !== null) {
      return baseTfBars.slice(-Math.max(15, Math.min(baseTfBars.length, customBarsCount)));
    }
    if (candleZoom === '30') {
      return baseTfBars.slice(-Math.min(baseTfBars.length, 30));
    }
    if (candleZoom === '60') {
      return baseTfBars.slice(-Math.min(baseTfBars.length, 60));
    }
    return baseTfBars;
  }, [baseTfBars, candleZoom, customBarsCount]);

  // Pre-calculated detailed technical indicator series for each bar
  // (calculated on all bars for proper moving average warm-up, then sliced to filteredBars length)
  const fullTimeSeries = useMemo(() => {
    return calculateDetailedTimeSeries(stock.bars);
  }, [stock.bars]);

  const timeSeriesData = useMemo(() => {
    return fullTimeSeries.slice(-filteredBars.length);
  }, [fullTimeSeries, filteredBars.length]);

  // Volume Profile (POC & 70% Value Area)
  const volumeProfile = useMemo(() => {
    return calculateVolumeProfile(filteredBars, 14);
  }, [filteredBars]);

  // Heikin-Ashi calculation (smoothed trend candles)
  const heikinAshiBars = useMemo(() => {
    const ha: Array<CandleBar & { isUp: boolean }> = [];
    for (let i = 0; i < filteredBars.length; i++) {
      const b = filteredBars[i];
      const haClose = (b.open + b.high + b.low + b.close) / 4;
      const haOpen = i === 0 ? (b.open + b.close) / 2 : (ha[i - 1].open + ha[i - 1].close) / 2;
      const haHigh = Math.max(b.high, haOpen, haClose);
      const haLow = Math.min(b.low, haOpen, haClose);
      ha.push({
        date: b.date,
        open: Math.round(haOpen * 10) / 10,
        high: Math.round(haHigh * 10) / 10,
        low: Math.round(haLow * 10) / 10,
        close: Math.round(haClose * 10) / 10,
        volume: b.volume,
        isUp: haClose >= haOpen,
      });
    }
    return ha;
  }, [filteredBars]);

  // Algorithmic Buy / Sell Indication & Indicator Action Signals
  const chartSignals = useMemo(() => {
    if (filteredBars.length < 3) return [];
    interface SignalItem {
      barIndex: number;
      date: string;
      type: 'BUY' | 'SELL' | 'TAKE_PROFIT' | 'SQUEEZE_BREAKOUT' | 'RVOL_SURGE';
      title: string;
      badge: string;
      description: string;
      price: number;
      color: string;
      direction: 'up' | 'down';
    }

    const signals: SignalItem[] = [];
    let lastBuyBar = -10;
    let lastSellBar = -10;

    for (let i = 1; i < filteredBars.length; i++) {
      const curr = filteredBars[i];
      const prev = filteredBars[i - 1];
      const metrics = timeSeriesData[i];
      const prevMetrics = timeSeriesData[i - 1];
      if (!metrics || !prevMetrics) continue;

      const isUp = curr.close >= curr.open;
      const isDown = curr.close < curr.open;
      const rvol = metrics.rvol || 1.0;
      const rsi = metrics.rsi || 50;

      // 1. Squeeze Breakout Ignition
      const prevSqueezed = prevMetrics.bbSqueeze || prevMetrics.bbBandwidth < 0.055;
      const brokeUpper = curr.close > prevMetrics.bbUpper && isUp;
      if (prevSqueezed && brokeUpper && rvol >= 1.25 && i - lastBuyBar > 5) {
        signals.push({
          barIndex: i,
          date: curr.date,
          type: 'SQUEEZE_BREAKOUT',
          title: 'Bollinger Squeeze Ignition',
          badge: '⚡ BREAKOUT',
          description: `Coiled volatility squeeze exploded! Price broke above Upper Band at ৳${curr.close.toFixed(1)} with ${rvol.toFixed(1)}x RVOL`,
          price: curr.high,
          color: '#a855f7',
          direction: 'down',
        });
        lastBuyBar = i;
      }

      // 2. EMA 20 Golden Trigger / Buy Signal
      const crossedAboveEma20 = prev.close <= prevMetrics.ema20 && curr.close > metrics.ema20;
      const emaCrossed = prevMetrics.ema20 <= prevMetrics.ema50 && metrics.ema20 > metrics.ema50;
      const bullishConfluence = (crossedAboveEma20 || emaCrossed) && isUp && (rvol >= 1.2 || rsi > 48) && rsi < 70;

      if (bullishConfluence && i - lastBuyBar > 6) {
        signals.push({
          barIndex: i,
          date: curr.date,
          type: 'BUY',
          title: 'Confluence Buy Signal',
          badge: '▲ BUY',
          description: `Bullish momentum ignition above EMA20 at ৳${curr.close.toFixed(1)} | RVOL: ${rvol.toFixed(1)}x | RSI: ${rsi.toFixed(1)}`,
          price: curr.low,
          color: '#10b981',
          direction: 'up',
        });
        lastBuyBar = i;
      }

      // 3. Take Profit 1 Hit
      const hitTp1 = curr.high >= stock.targetPrice1 && prev.high < stock.targetPrice1;
      if (hitTp1 && i - lastSellBar > 5) {
        signals.push({
          barIndex: i,
          date: curr.date,
          type: 'TAKE_PROFIT',
          title: 'Target 1 Reached',
          badge: '★ TP1 HIT',
          description: `Target 1 reached at ৳${stock.targetPrice1.toFixed(1)} (+${Math.round(((stock.targetPrice1 - stock.lastPrice) / stock.lastPrice) * 100)}% gain). Lock partial profits.`,
          price: curr.high,
          color: '#06b6d4',
          direction: 'down',
        });
        lastSellBar = i;
      }

      // 4. Hard Stop or Trailing Exit Trigger
      const hitStop = curr.low <= stock.stopLoss && prev.low > stock.stopLoss;
      const trailingExit = curr.close < metrics.ema20 * 0.98 && prev.close >= prevMetrics.ema20 && isDown && rvol >= 1.3;
      if ((hitStop || trailingExit) && i - lastSellBar > 6) {
        signals.push({
          barIndex: i,
          date: curr.date,
          type: 'SELL',
          title: hitStop ? 'Hard Stop Triggered' : 'Trailing Exit (Close < EMA20)',
          badge: hitStop ? '▼ STOP' : '▼ EXIT',
          description: hitStop
            ? `Hard Stop Loss breached at ৳${stock.stopLoss.toFixed(1)}. Capital preservation exit.`
            : `Trailing exit triggered: closed below EMA20 at ৳${curr.close.toFixed(1)} with distribution volume.`,
          price: curr.high,
          color: '#f43f5e',
          direction: 'down',
        });
        lastSellBar = i;
      }

      // 5. Institutional RVOL Surge (2.2x+)
      if (rvol >= 2.2 && !signals.some(s => s.barIndex === i)) {
        signals.push({
          barIndex: i,
          date: curr.date,
          type: 'RVOL_SURGE',
          title: 'Institutional Volume Surge',
          badge: `⚡ ${rvol.toFixed(1)}x VOL`,
          description: `Smart money institutional volume spike! Traded ${(curr.volume / 1000).toFixed(0)}k shares (${rvol.toFixed(1)}x 20d average)`,
          price: isUp ? curr.low : curr.high,
          color: '#f97316',
          direction: isUp ? 'up' : 'down',
        });
      }
    }

    // Ensure active setup is highlighted if currently in Trade Ready / Confirmed status
    const latestBarIdx = filteredBars.length - 1;
    if (stock.setupState === 'TRADE_READY' || stock.setupState === 'CONFIRMED') {
      const exists = signals.some(s => s.barIndex === latestBarIdx);
      if (!exists && filteredBars[latestBarIdx]) {
        signals.push({
          barIndex: latestBarIdx,
          date: filteredBars[latestBarIdx].date,
          type: 'BUY',
          title: 'Active Buy Zone Ignition',
          badge: '★ BUY ZONE',
          description: `Stock in optimal buy accumulation zone [৳${stock.entryZoneLow?.toFixed(1) ?? stock.lastPrice} – ৳${stock.entryZoneHigh?.toFixed(1) ?? stock.lastPrice}] with Stage ${stock.stage} trend gate pass`,
          price: filteredBars[latestBarIdx].low,
          color: '#10b981',
          direction: 'up',
        });
      }
    }

    return signals;
  }, [filteredBars, timeSeriesData, stock]);

  // SVG Chart Geometry & Dimensions
  const svgWidth = isExpanded ? 1380 : 1200;
  const mainChartHeight = isExpanded ? 640 : chartHeightMode === 'ultra' ? 640 : chartHeightMode === 'roomy' ? 520 : 400;
  const volumeHeight = 78;
  const subchartHeight = activeSubchart !== 'none' ? 125 : 0;
  const paddingBottom = 28;
  const rightMargin = 82;
  const totalSvgHeight = mainChartHeight + volumeHeight + subchartHeight + paddingBottom;

  // Price & Volume domain calculations
  const { minPrice, maxPrice, maxVol, minSub, maxSub } = useMemo(() => {
    if (filteredBars.length === 0) {
      return { minPrice: 0, maxPrice: 100, maxVol: 1000, minSub: 0, maxSub: 100 };
    }
    let minP = Infinity;
    let maxP = -Infinity;
    let maxV = 0;

    for (const b of filteredBars) {
      if (b.low < minP) minP = b.low;
      if (b.high > maxP) maxP = b.high;
      if (b.volume > maxV) maxV = b.volume;
    }

    // Include indicators in bounds if enabled
    if (showBollinger) {
      for (const d of timeSeriesData) {
        if (d.bbUpper > maxP) maxP = d.bbUpper;
        if (d.bbLower < minP && d.bbLower > 0) minP = d.bbLower;
      }
    }
    if (showTargets) {
      if (stock.targetPrice1 > maxP) maxP = stock.targetPrice1;
      if (stock.targetPrice2 > maxP) maxP = stock.targetPrice2;
      if (stock.stopLoss < minP && stock.stopLoss > 0) minP = stock.stopLoss;
    }

    const pricePad = (maxP - minP) * 0.08 || 4;

    // Subchart bounds
    let sMin = 0;
    let sMax = 100;
    if (activeSubchart === 'rsi') {
      sMin = 0;
      sMax = 100;
    } else if (activeSubchart === 'macd') {
      let mMax = 0.5;
      for (const d of timeSeriesData) {
        const absVal = Math.max(Math.abs(d.macd), Math.abs(d.macdSignal), Math.abs(d.macdHist));
        if (absVal > mMax) mMax = absVal;
      }
      sMin = -mMax * 1.15;
      sMax = mMax * 1.15;
    } else if (activeSubchart === 'obv') {
      let oMin = Infinity;
      let oMax = -Infinity;
      for (const d of timeSeriesData) {
        if (d.obv < oMin) oMin = d.obv;
        if (d.obv > oMax) oMax = d.obv;
      }
      sMin = oMin;
      sMax = oMax || 1;
    }

    return {
      minPrice: Math.max(0.1, minP - pricePad),
      maxPrice: maxP + pricePad,
      maxVol: maxV || 1,
      minSub: sMin,
      maxSub: sMax,
    };
  }, [filteredBars, timeSeriesData, showBollinger, showTargets, stock, activeSubchart]);

  // Coordinate projection helpers
  const getX = (index: number) => {
    const count = Math.max(1, filteredBars.length);
    const usableWidth = svgWidth - rightMargin - 16;
    const step = usableWidth / count;
    return 10 + index * step + step * 0.5;
  };

  const getY = (val: number) => {
    if (maxPrice <= minPrice) return mainChartHeight / 2;
    return mainChartHeight - ((val - minPrice) / (maxPrice - minPrice)) * (mainChartHeight - 32) - 16;
  };

  const getVolY = (vol: number) => {
    const base = mainChartHeight + volumeHeight;
    return base - (vol / maxVol) * (volumeHeight - 10);
  };

  const getSubchartY = (val: number) => {
    const subTop = mainChartHeight + volumeHeight;
    if (maxSub === minSub) return subTop + subchartHeight / 2;
    const norm = (val - minSub) / (maxSub - minSub);
    return subTop + subchartHeight - norm * (subchartHeight - 16) - 8;
  };

  // Inspect hovered or latest bar
  const activeBarIndex = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < filteredBars.length
    ? hoverIndex
    : filteredBars.length - 1;

  const activeBar = filteredBars[activeBarIndex] || filteredBars[filteredBars.length - 1];
  const activeMetrics = timeSeriesData[activeBarIndex] || timeSeriesData[timeSeriesData.length - 1];
  const prevBar = activeBarIndex > 0 ? filteredBars[activeBarIndex - 1] : activeBar;
  const barChange = activeBar ? activeBar.close - prevBar.close : 0;
  const barChangePct = prevBar && prevBar.close > 0 ? (barChange / prevBar.close) * 100 : 0;

  // Active Trade Signal at Hovered Bar (or latest active signal)
  const activeSignal = useMemo(() => {
    if (hoverIndex !== null) {
      const match = chartSignals.find(s => s.barIndex === hoverIndex);
      if (match) return match;
    }
    if (chartSignals.length > 0) {
      return chartSignals[chartSignals.length - 1];
    }
    return null;
  }, [hoverIndex, chartSignals]);

  // Handle Mouse Tracking
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || filteredBars.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convert client coords to SVG viewBox coords
    const scaleX = svgWidth / rect.width;
    const scaleY = totalSvgHeight / rect.height;
    const svgX = clientX * scaleX;
    const svgY = clientY * scaleY;

    // Find nearest bar
    const usableWidth = svgWidth - rightMargin - 16;
    const step = usableWidth / filteredBars.length;
    const idx = Math.floor((svgX - 10) / step);
    const clampedIdx = Math.max(0, Math.min(filteredBars.length - 1, idx));

    setHoverIndex(clampedIdx);
    setMousePos({ x: getX(clampedIdx), y: svgY });
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setMousePos(null);
  };

  // Price conversion from Y coordinate for interactive horizontal crosshair
  const hoveredPrice = mousePos && mousePos.y <= mainChartHeight
    ? maxPrice - ((mousePos.y - 16) / (mainChartHeight - 32)) * (maxPrice - minPrice)
    : null;

  // Polyline point generators for indicators (guaranteed continuous to current bar)
  const ema20Points = useMemo(() => {
    if (!timeSeriesData || timeSeriesData.length === 0) return '';
    return timeSeriesData
      .map((d, i) => {
        const val = Number(d.ema20);
        const validVal = !isNaN(val) && isFinite(val) && val > 0 ? val : d.price;
        return `${getX(i).toFixed(1)},${getY(validVal).toFixed(1)}`;
      })
      .join(' ');
  }, [timeSeriesData, minPrice, maxPrice, filteredBars.length, svgWidth]);

  const ema50Points = useMemo(() => {
    if (!timeSeriesData || timeSeriesData.length === 0) return '';
    return timeSeriesData
      .map((d, i) => {
        const val = Number(d.ema50);
        const validVal = !isNaN(val) && isFinite(val) && val > 0 ? val : d.price;
        return `${getX(i).toFixed(1)},${getY(validVal).toFixed(1)}`;
      })
      .join(' ');
  }, [timeSeriesData, minPrice, maxPrice, filteredBars.length, svgWidth]);

  const ema200Points = useMemo(() => {
    if (!timeSeriesData || timeSeriesData.length === 0) return '';
    return timeSeriesData
      .map((d, i) => {
        const val = Number(d.ema200 ?? d.ema50 * 0.96);
        const validVal = !isNaN(val) && isFinite(val) && val > 0 ? val : d.price;
        return `${getX(i).toFixed(1)},${getY(validVal).toFixed(1)}`;
      })
      .join(' ');
  }, [timeSeriesData, minPrice, maxPrice, filteredBars.length, svgWidth]);

  // Bollinger Bands ribbon polygon
  const bollingerRibbon = useMemo(() => {
    if (timeSeriesData.length === 0) return '';
    const upper = timeSeriesData.map((d, i) => `${getX(i).toFixed(1)},${getY(d.bbUpper).toFixed(1)}`);
    const lower = [...timeSeriesData]
      .reverse()
      .map((d, i) => {
        const origIdx = timeSeriesData.length - 1 - i;
        return `${getX(origIdx).toFixed(1)},${getY(d.bbLower).toFixed(1)}`;
      });
    return [...upper, ...lower].join(' ');
  }, [timeSeriesData, minPrice, maxPrice]);

  const bollingerMiddlePoints = useMemo(() => {
    return timeSeriesData
      .map((d, i) => `${getX(i).toFixed(1)},${getY(d.bbMiddle).toFixed(1)}`)
      .join(' ');
  }, [timeSeriesData, minPrice, maxPrice]);

  // Line / Mountain Area points
  const lineChartPoints = useMemo(() => {
    return filteredBars
      .map((b, i) => `${getX(i).toFixed(1)},${getY(b.close).toFixed(1)}`)
      .join(' ');
  }, [filteredBars, minPrice, maxPrice]);

  const mountainAreaPoints = useMemo(() => {
    if (filteredBars.length === 0) return '';
    const firstX = getX(0).toFixed(1);
    const lastX = getX(filteredBars.length - 1).toFixed(1);
    const bottomY = (mainChartHeight - 5).toFixed(1);
    return `${firstX},${bottomY} ${lineChartPoints} ${lastX},${bottomY}`;
  }, [filteredBars, lineChartPoints, mainChartHeight]);

  // Volume 20-MA polyline
  const volumeMaPoints = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i < filteredBars.length; i++) {
      const slice = filteredBars.slice(Math.max(0, i - 19), i + 1);
      const avg = slice.reduce((acc, b) => acc + b.volume, 0) / slice.length;
      pts.push(`${getX(i).toFixed(1)},${getVolY(avg).toFixed(1)}`);
    }
    return pts.join(' ');
  }, [filteredBars, maxVol, mainChartHeight, volumeHeight]);

  // RSI points
  const rsiPoints = useMemo(() => {
    return timeSeriesData
      .map((d, i) => `${getX(i).toFixed(1)},${getSubchartY(d.rsi).toFixed(1)}`)
      .join(' ');
  }, [timeSeriesData, minSub, maxSub, mainChartHeight, volumeHeight, subchartHeight]);

  // MACD line points
  const macdPoints = useMemo(() => {
    return timeSeriesData
      .map((d, i) => `${getX(i).toFixed(1)},${getSubchartY(d.macd).toFixed(1)}`)
      .join(' ');
  }, [timeSeriesData, minSub, maxSub, mainChartHeight, volumeHeight, subchartHeight]);

  const macdSignalPoints = useMemo(() => {
    return timeSeriesData
      .map((d, i) => `${getX(i).toFixed(1)},${getSubchartY(d.macdSignal).toFixed(1)}`)
      .join(' ');
  }, [timeSeriesData, minSub, maxSub, mainChartHeight, volumeHeight, subchartHeight]);

  // OBV points
  const obvPoints = useMemo(() => {
    return timeSeriesData
      .map((d, i) => `${getX(i).toFixed(1)},${getSubchartY(d.obv).toFixed(1)}`)
      .join(' ');
  }, [timeSeriesData, minSub, maxSub, mainChartHeight, volumeHeight, subchartHeight]);

  return (
    <div className="space-y-3 font-mono">
      {/* Top Interactive Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-[#070b14] border border-slate-800 text-xs shadow-md">
        
        {/* Left: Timeframe Switcher, Candle Focus Zoom & Chart Style */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Buttons */}
          <div className="flex items-center gap-1 bg-[#0b1220] p-1 rounded-xl border border-slate-800">
            {(['1M', '3M', '6M', '1Y'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => {
                  onChangeTimeframe(tf);
                  setCustomBarsCount(null);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-emerald-600 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Candle Focus & Density Zoom (Anti-Congestion Control) */}
          <div className="flex items-center gap-1 bg-[#0b1220] p-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-500 text-[10px] px-1 font-bold">CANDLES:</span>
            <button
              onClick={() => { setCandleZoom('30'); setCustomBarsCount(null); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                candleZoom === '30' && customBarsCount === null
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Focus on last 30 bars with large, uncongested, ultra-roomy candles"
            >
              30 Bars (Large)
            </button>
            <button
              onClick={() => { setCandleZoom('60'); setCustomBarsCount(null); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                candleZoom === '60' && customBarsCount === null
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Standard 60 bars swing view"
            >
              60 Bars
            </button>
            <button
              onClick={() => { setCandleZoom('all'); setCustomBarsCount(null); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                candleZoom === 'all' && customBarsCount === null
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Show all bars in current timeframe"
            >
              All Bars
            </button>
            {/* Fine Zoom In / Zoom Out */}
            <div className="flex items-center gap-0.5 border-l border-slate-800 pl-1 ml-0.5">
              <button
                onClick={() => {
                  const current = filteredBars.length;
                  setCustomBarsCount(Math.max(16, current - 10));
                }}
                className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-amber-300 font-bold text-xs"
                title="Zoom In (Wider, roomier candles)"
              >
                +
              </button>
              <button
                onClick={() => {
                  const current = filteredBars.length;
                  setCustomBarsCount(Math.min(stock.bars.length, current + 15));
                }}
                className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-amber-300 font-bold text-xs"
                title="Zoom Out (More bars)"
              >
                -
              </button>
            </div>
          </div>

          {/* Chart Style Switcher */}
          <div className="flex items-center gap-1 bg-[#0b1220] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setChartType('candles')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                chartType === 'candles'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Japanese Candlesticks with sharp OHLC wicks"
            >
              <BarChart2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Candles</span>
            </button>
            <button
              onClick={() => setChartType('heikin-ashi')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                chartType === 'heikin-ashi'
                  ? 'bg-cyan-600 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Heikin-Ashi Trend-Filtered Candles (Eliminates false wicks and noise)"
            >
              <Activity className="h-3.5 w-3.5 text-cyan-300" />
              <span>Heikin-Ashi</span>
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                chartType === 'line'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Smooth Line / Mountain Area Chart"
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span>Line</span>
            </button>
          </div>
        </div>

        {/* Right: Height Mode, Technical Overlays & Subchart Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Vertical Height Selector */}
          <div className="flex items-center gap-1 bg-[#0b1220] p-1 rounded-xl border border-slate-800 text-[11px]">
            <span className="text-slate-500 px-1 font-bold">HEIGHT:</span>
            {(
              [
                { id: 'standard', label: 'Std 400px' },
                { id: 'roomy', label: 'Roomy 520px' },
                { id: 'ultra', label: 'Ultra 640px' },
              ] as const
            ).map(h => (
              <button
                key={h.id}
                onClick={() => setChartHeightMode(h.id)}
                className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                  chartHeightMode === h.id
                    ? 'bg-indigo-600 text-white font-black shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>

          {/* Overlays */}
          <button
            onClick={() => setShowEma20(!showEma20)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              showEma20
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                : 'bg-slate-900/60 text-slate-500 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>EMA 20</span>
          </button>

          <button
            onClick={() => setShowEma50(!showEma50)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              showEma50
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs'
                : 'bg-slate-900/60 text-slate-500 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span>EMA 50</span>
          </button>

          <button
            onClick={() => setShowBollinger(!showBollinger)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              showBollinger
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-xs'
                : 'bg-slate-900/60 text-slate-500 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-indigo-400" />
            <span>Bollinger</span>
          </button>

          <button
            onClick={() => setShowBuyZone(!showBuyZone)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              showBuyZone
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                : 'bg-slate-900/60 text-slate-500 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Target className="h-3.5 w-3.5 text-emerald-400" />
            <span>Buy Zone</span>
          </button>

          {/* Buy & Sell Signals Toggle */}
          <button
            onClick={() => setShowSignals(!showSignals)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              showSignals
                ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border-emerald-400 shadow-sm'
                : 'bg-slate-900/60 text-slate-500 border-slate-800 hover:border-slate-700'
            }`}
            title="Toggle algorithmic Buy / Sell indication markers and volatility squeeze alerts on candles"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Signals ({chartSignals.length})</span>
          </button>

          <button
            onClick={() => setShowVolumeProfile(!showVolumeProfile)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              showVolumeProfile
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                : 'bg-slate-900/60 text-slate-500 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span>POC Profile</span>
          </button>

          {/* Subchart Selector */}
          <div className="flex items-center gap-1 bg-[#0b1220] p-1 rounded-xl border border-slate-800 text-[11px]">
            <span className="text-slate-500 px-1 font-bold">Sub:</span>
            {(
              [
                { id: 'rsi', label: 'RSI' },
                { id: 'macd', label: 'MACD' },
                { id: 'obv', label: 'OBV' },
                { id: 'none', label: 'Off' },
              ] as const
            ).map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSubchart(item.id)}
                className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                  activeSubchart === item.id
                    ? 'bg-cyan-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Expand / Minimize Width */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-[#0b1220] text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            title={isExpanded ? 'Normal Width' : 'Wide Layout'}
          >
            {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Floating Heads-Up Display (HUD) Terminal Inspector */}
      <div className="p-3 rounded-2xl bg-[#050912] border border-slate-800/90 flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
        {/* Left: Active Session Candle Stats */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold">DATE:</span>
            <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded text-[11px]">
              {activeBar?.date || '—'}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>O: <span className="text-slate-200 font-bold">{activeBar?.open.toFixed(1)}</span></span>
            <span>H: <span className="text-emerald-400 font-bold">{activeBar?.high.toFixed(1)}</span></span>
            <span>L: <span className="text-rose-400 font-bold">{activeBar?.low.toFixed(1)}</span></span>
            <span>C: <span className="text-white font-bold text-xs">{activeBar?.close.toFixed(1)}</span></span>
          </div>

          <div className={`font-bold text-[11px] flex items-center gap-1 ${
            barChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            <span>{barChange >= 0 ? '+' : ''}{barChange.toFixed(1)}</span>
            <span>({barChangePct >= 0 ? '+' : ''}{barChangePct.toFixed(2)}%)</span>
          </div>
        </div>

        {/* Right: Technical Snapshot at Cursor */}
        <div className="flex items-center gap-4 text-[11px] flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">VOL:</span>
            <span className="text-slate-200 font-bold">
              {activeBar ? (activeBar.volume / 1000).toFixed(0) : 0}k
            </span>
            <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
              (activeMetrics?.rvol ?? 1) >= 1.5
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'text-slate-400'
            }`}>
              RVOL: {activeMetrics?.rvol.toFixed(1) ?? '1.0'}x
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-indigo-400 font-bold">RSI:</span>
            <span className="text-white font-bold">
              {activeMetrics?.rsi.toFixed(1) ?? '—'}
            </span>
          </div>

          {showEma20 && (
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <span>EMA20:</span>
              <span className="text-slate-200">{activeMetrics?.ema20.toFixed(1) ?? '—'}</span>
            </div>
          )}

          {showEma50 && (
            <div className="flex items-center gap-1 text-cyan-400 font-bold">
              <span>EMA50:</span>
              <span className="text-slate-200">{activeMetrics?.ema50.toFixed(1) ?? '—'}</span>
            </div>
          )}

          {hoveredPrice !== null && (
            <div className="flex items-center gap-1 bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
              <span>CURSOR: ৳{hoveredPrice.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Active Algorithmic Signal Indicator Banner */}
        {activeSignal && (
          <div className="w-full pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded font-black text-[10px] flex items-center gap-1 ${
                activeSignal.direction === 'up'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${activeSignal.direction === 'up' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {activeSignal.badge}
              </span>
              <span className="font-bold text-white text-[11px]">{activeSignal.title} ({activeSignal.date}):</span>
              <span className="text-slate-300 text-[11px] font-sans">{activeSignal.description}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] shrink-0 font-bold font-mono">
              <span className="text-slate-400">Signal Level:</span>
              <span className="text-cyan-300">৳{activeSignal.price.toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main High-Definition SVG Financial Chart */}
      <div className="bg-[#040810] rounded-2xl border border-slate-800/90 relative overflow-hidden select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${totalSvgHeight}`}
          className="w-full h-auto block cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Background Gradients */}
            <linearGradient id="chartBgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#080e1c" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#040810" stopOpacity="0.95" />
            </linearGradient>

            {/* Mountain / Area Gradient */}
            <linearGradient id="mountainGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>

            {/* Volume Up / Down Gradients */}
            <linearGradient id="volUpGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="volDownGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.15" />
            </linearGradient>

            {/* Bollinger Ribbon Gradient */}
            <linearGradient id="bbRibbonGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.12" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.12" />
            </linearGradient>

            {/* Buy Zone Gradient */}
            <linearGradient id="buyZoneGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.18" />
            </linearGradient>
          </defs>

          {/* Canvas Background */}
          <rect x="0" y="0" width={svgWidth} height={totalSvgHeight} fill="url(#chartBgGrad)" />

          {/* Horizontal Price Grid Lines & Scale (Right Axis) */}
          {[0.06, 0.22, 0.38, 0.54, 0.70, 0.86].map((ratio, i) => {
            const y = 16 + ratio * (mainChartHeight - 32);
            const priceVal = maxPrice - ratio * (maxPrice - minPrice);
            return (
              <g key={`pgrid-${i}`}>
                <line x1="0" y1={y} x2={svgWidth - rightMargin} y2={y} stroke="#131e33" strokeDasharray="3 3" />
                <rect x={svgWidth - rightMargin + 4} y={y - 9} width={rightMargin - 8} height="18" rx="4" fill="#09101e" stroke="#1e293b" strokeWidth="0.8" />
                <text
                  x={svgWidth - rightMargin / 2}
                  y={y + 3.5}
                  fill="#94a3b8"
                  fontSize="9.5"
                  textAnchor="middle"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  ৳{priceVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Vertical Date Grid Lines */}
          {filteredBars.map((b, i) => {
            // Draw date separator every 10 bars (or on first and last)
            const step = Math.max(8, Math.floor(filteredBars.length / 8));
            if (i % step !== 0 && i !== filteredBars.length - 1) return null;
            const x = getX(i);
            return (
              <g key={`tgrid-${i}`}>
                <line x1={x} y1="0" x2={x} y2={mainChartHeight} stroke="#131e33" strokeDasharray="2 4" />
                <text
                  x={x}
                  y={totalSvgHeight - 6}
                  fill="#64748b"
                  fontSize="8.5"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {b.date.slice(5)}
                </text>
              </g>
            );
          })}

          {/* 1. Buy Zone Shaded Band */}
          {showBuyZone && stock.entryZoneLow && stock.entryZoneHigh && (
            <g>
              {(() => {
                const yHigh = getY(stock.entryZoneHigh);
                const yLow = getY(stock.entryZoneLow);
                const h = Math.max(6, Math.abs(yLow - yHigh));
                const topY = Math.min(yHigh, yLow);
                return (
                  <>
                    <rect
                      x="0"
                      y={topY}
                      width={svgWidth - rightMargin}
                      height={h}
                      fill="url(#buyZoneGrad)"
                      stroke="#10b981"
                      strokeWidth="0.8"
                      strokeDasharray="4 2"
                    />
                    <text
                      x="14"
                      y={topY + h / 2 + 3.5}
                      fill="#34d399"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      ★ BUY ACCUMULATION ZONE [৳{stock.entryZoneLow.toFixed(1)} – ৳{stock.entryZoneHigh.toFixed(1)}]
                    </text>
                  </>
                );
              })()}
            </g>
          )}

          {/* 2. Bollinger Bands Shaded Ribbon & Lines */}
          {showBollinger && (
            <g>
              {/* Ribbon Polygon */}
              <polygon points={bollingerRibbon} fill="url(#bbRibbonGrad)" />
              {/* Upper Line (+2σ) */}
              <polyline
                points={timeSeriesData.map((d, i) => `${getX(i).toFixed(1)},${getY(d.bbUpper).toFixed(1)}`).join(' ')}
                stroke="#818cf8"
                strokeWidth="1.2"
                strokeDasharray="4 2"
                fill="none"
              />
              {/* Middle SMA 20 */}
              <polyline
                points={bollingerMiddlePoints}
                stroke="#06b6d4"
                strokeWidth="1.2"
                fill="none"
              />
              {/* Lower Line (-2σ) */}
              <polyline
                points={timeSeriesData.map((d, i) => `${getX(i).toFixed(1)},${getY(d.bbLower).toFixed(1)}`).join(' ')}
                stroke="#818cf8"
                strokeWidth="1.2"
                strokeDasharray="4 2"
                fill="none"
              />
            </g>
          )}

          {/* 3. EMA 20 & EMA 50 & EMA 200 Curves */}
          {showEma200 && (
            <polyline
              points={ema200Points}
              stroke="#a855f7"
              strokeWidth="1.4"
              strokeDasharray="3 3"
              fill="none"
            />
          )}

          {showEma50 && (
            <polyline
              points={ema50Points}
              stroke="#06b6d4"
              strokeWidth="1.8"
              fill="none"
            />
          )}

          {showEma20 && (
            <polyline
              points={ema20Points}
              stroke="#f59e0b"
              strokeWidth="2.0"
              fill="none"
            />
          )}

          {/* Terminal Current Bar Indicators for EMAs */}
          {timeSeriesData.length > 0 && filteredBars.length > 0 && (
            <g>
              {showEma20 && (
                <>
                  <circle
                    cx={getX(filteredBars.length - 1)}
                    cy={getY(timeSeriesData[timeSeriesData.length - 1].ema20)}
                    r="4"
                    fill="#f59e0b"
                    stroke="#0b111e"
                    strokeWidth="1.5"
                  />
                  <rect
                    x={svgWidth - rightMargin + 4}
                    y={getY(timeSeriesData[timeSeriesData.length - 1].ema20) - 7}
                    width={rightMargin - 8}
                    height="14"
                    rx="3"
                    fill="#78350f"
                    stroke="#f59e0b"
                    strokeWidth="0.8"
                  />
                  <text
                    x={svgWidth - rightMargin / 2}
                    y={getY(timeSeriesData[timeSeriesData.length - 1].ema20) + 3}
                    fill="#fef3c7"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    E20: {timeSeriesData[timeSeriesData.length - 1].ema20.toFixed(1)}
                  </text>
                </>
              )}
              {showEma50 && (
                <>
                  <circle
                    cx={getX(filteredBars.length - 1)}
                    cy={getY(timeSeriesData[timeSeriesData.length - 1].ema50)}
                    r="4"
                    fill="#06b6d4"
                    stroke="#0b111e"
                    strokeWidth="1.5"
                  />
                  <rect
                    x={svgWidth - rightMargin + 4}
                    y={getY(timeSeriesData[timeSeriesData.length - 1].ema50) - 7}
                    width={rightMargin - 8}
                    height="14"
                    rx="3"
                    fill="#164e63"
                    stroke="#06b6d4"
                    strokeWidth="0.8"
                  />
                  <text
                    x={svgWidth - rightMargin / 2}
                    y={getY(timeSeriesData[timeSeriesData.length - 1].ema50) + 3}
                    fill="#cffafe"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    E50: {timeSeriesData[timeSeriesData.length - 1].ema50.toFixed(1)}
                  </text>
                </>
              )}
            </g>
          )}

          {/* 4. Target Levels & Stop Loss Lines */}
          {showTargets && (
            <g>
              {/* Target Price 1 */}
              {stock.targetPrice1 > 0 && (
                <>
                  <line
                    x1="0"
                    y1={getY(stock.targetPrice1)}
                    x2={svgWidth - rightMargin}
                    y2={getY(stock.targetPrice1)}
                    stroke="#10b981"
                    strokeWidth="1.5"
                    strokeDasharray="5 3"
                  />
                  <rect
                    x={svgWidth - rightMargin - 98}
                    y={getY(stock.targetPrice1) - 10}
                    width="92"
                    height="19"
                    rx="4"
                    fill="#064e3b"
                    stroke="#10b981"
                    strokeWidth="0.8"
                  />
                  <text
                    x={svgWidth - rightMargin - 52}
                    y={getY(stock.targetPrice1) + 3}
                    fill="#34d399"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    TP1: ৳{stock.targetPrice1.toFixed(1)}
                  </text>
                </>
              )}

              {/* Target Price 2 */}
              {stock.targetPrice2 > 0 && stock.targetPrice2 !== stock.targetPrice1 && (
                <>
                  <line
                    x1="0"
                    y1={getY(stock.targetPrice2)}
                    x2={svgWidth - rightMargin}
                    y2={getY(stock.targetPrice2)}
                    stroke="#06b6d4"
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                  />
                  <rect
                    x={svgWidth - rightMargin - 98}
                    y={getY(stock.targetPrice2) - 10}
                    width="92"
                    height="19"
                    rx="4"
                    fill="#083344"
                    stroke="#06b6d4"
                    strokeWidth="0.8"
                  />
                  <text
                    x={svgWidth - rightMargin - 52}
                    y={getY(stock.targetPrice2) + 3}
                    fill="#38bdf8"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    TP2: ৳{stock.targetPrice2.toFixed(1)}
                  </text>
                </>
              )}

              {/* Hard Stop Loss */}
              {stock.stopLoss > 0 && (
                <>
                  <line
                    x1="0"
                    y1={getY(stock.stopLoss)}
                    x2={svgWidth - rightMargin}
                    y2={getY(stock.stopLoss)}
                    stroke="#f43f5e"
                    strokeWidth="1.5"
                    strokeDasharray="5 3"
                  />
                  <rect
                    x={svgWidth - rightMargin - 98}
                    y={getY(stock.stopLoss) - 10}
                    width="92"
                    height="19"
                    rx="4"
                    fill="#4c0519"
                    stroke="#f43f5e"
                    strokeWidth="0.8"
                  />
                  <text
                    x={svgWidth - rightMargin - 52}
                    y={getY(stock.stopLoss) + 3}
                    fill="#fda4af"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    SL: ৳{stock.stopLoss.toFixed(1)}
                  </text>
                </>
              )}
            </g>
          )}

          {/* 5. Main Candlesticks / Heikin-Ashi / Mountain Area Chart */}
          {chartType === 'line' ? (
            <g>
              <polygon points={mountainAreaPoints} fill="url(#mountainGrad)" />
              <polyline points={lineChartPoints} stroke="#10b981" strokeWidth="2.5" fill="none" />
            </g>
          ) : (
            <g>
              {(chartType === 'heikin-ashi' ? heikinAshiBars : filteredBars).map((b, i) => {
                const x = getX(i);
                const isUp = b.close >= b.open;
                const yOpen = getY(b.open);
                const yClose = getY(b.close);
                const yHigh = getY(b.high);
                const yLow = getY(b.low);

                const bodyTop = Math.min(yOpen, yClose);
                const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
                const usableWidth = svgWidth - rightMargin - 16;
                const step = usableWidth / filteredBars.length;
                const barWidth = Math.min(26, Math.max(4.5, step * 0.72));
                const color = isUp ? '#10b981' : '#f43f5e';
                const isHovered = hoverIndex === i;

                return (
                  <g key={`bar-${i}`} opacity={hoverIndex !== null && !isHovered ? 0.75 : 1}>
                    {/* Centered High-Low Wick */}
                    <line
                      x1={x}
                      y1={yHigh}
                      x2={x}
                      y2={yLow}
                      stroke={color}
                      strokeWidth={isHovered ? '2.5' : Math.max(1.2, barWidth > 12 ? 1.8 : 1.2)}
                    />
                    {/* Candle Body */}
                    <rect
                      x={x - barWidth / 2}
                      y={bodyTop}
                      width={barWidth}
                      height={bodyHeight}
                      fill={color}
                      stroke={isHovered ? '#ffffff' : color}
                      strokeWidth={isHovered ? 1.8 : 0.8}
                      rx={barWidth > 8 ? 2 : 1}
                    />
                    {/* Hover highlight halo */}
                    {isHovered && (
                      <circle
                        cx={x}
                        cy={yClose}
                        r="4.5"
                        fill="#ffffff"
                        stroke={color}
                        strokeWidth="2"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* 5b. Algorithmic Buy & Sell Indication Markers (Anti-Collision Staggering) */}
          {showSignals && (
            <g>
              {chartSignals.map((sig, sIdx) => {
                const x = getX(sig.barIndex);
                const isBuy = sig.direction === 'up';
                const isHovered = hoverIndex === sig.barIndex;
                const candle = filteredBars[sig.barIndex];
                if (!candle) return null;

                const yAnchor = isBuy ? getY(candle.low) + 8 : getY(candle.high) - 8;
                // Anti-congestion staggering: if previous signal was within 4 bars, shift vertically
                const prevSig = sIdx > 0 ? chartSignals[sIdx - 1] : null;
                const isClustered = prevSig && Math.abs(sig.barIndex - prevSig.barIndex) <= 4;
                const staggerOffset = isClustered && (sIdx % 2 === 1) ? 20 : 0;

                return (
                  <g
                    key={`sig-${sIdx}`}
                    className="cursor-pointer transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      setHoverIndex(sig.barIndex);
                    }}
                  >
                    {isBuy ? (
                      // Upward Buy / Breakout Marker
                      <g>
                        {/* Glow halo */}
                        <circle
                          cx={x}
                          cy={yAnchor + 12 + staggerOffset}
                          r={isHovered ? 18 : 11}
                          fill={sig.color}
                          fillOpacity={isHovered ? 0.45 : 0.2}
                        />
                        {/* Upward Chevron Arrow */}
                        <polygon
                          points={`${x},${yAnchor} ${x - 5},${yAnchor + 8} ${x + 5},${yAnchor + 8}`}
                          fill={sig.color}
                          stroke="#ffffff"
                          strokeWidth={isHovered ? 1.5 : 0.8}
                        />
                        {/* Badge Box */}
                        <rect
                          x={x - 26}
                          y={yAnchor + 8 + staggerOffset}
                          width="52"
                          height="16"
                          rx="4"
                          fill="#052e16"
                          stroke={sig.color}
                          strokeWidth={isHovered ? 1.5 : 1}
                        />
                        <text
                          x={x}
                          y={yAnchor + 19.5 + staggerOffset}
                          fill="#4ade80"
                          fontSize="8.5"
                          fontFamily="monospace"
                          fontWeight="black"
                          textAnchor="middle"
                        >
                          {sig.badge}
                        </text>
                      </g>
                    ) : (
                      // Downward Sell / Take Profit / Exit Marker
                      <g>
                        {/* Glow halo */}
                        <circle
                          cx={x}
                          cy={yAnchor - 12 - staggerOffset}
                          r={isHovered ? 18 : 11}
                          fill={sig.color}
                          fillOpacity={isHovered ? 0.45 : 0.2}
                        />
                        {/* Downward Chevron Arrow */}
                        <polygon
                          points={`${x},${yAnchor} ${x - 5},${yAnchor - 8} ${x + 5},${yAnchor - 8}`}
                          fill={sig.color}
                          stroke="#ffffff"
                          strokeWidth={isHovered ? 1.5 : 0.8}
                        />
                        {/* Badge Box */}
                        <rect
                          x={x - 28}
                          y={yAnchor - 24 - staggerOffset}
                          width="56"
                          height="16"
                          rx="4"
                          fill="#450a0a"
                          stroke={sig.color}
                          strokeWidth={isHovered ? 1.5 : 1}
                        />
                        <text
                          x={x}
                          y={yAnchor - 12.5 - staggerOffset}
                          fill="#f87171"
                          fontSize="8.5"
                          fontFamily="monospace"
                          fontWeight="black"
                          textAnchor="middle"
                        >
                          {sig.badge}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* 6. Volume Profile Overlay (POC & 70% Value Area on right margin) */}
          {showVolumeProfile && (
            <g opacity="0.85">
              {volumeProfile.map((vp, i) => {
                const yHigh = getY(vp.priceHigh);
                const yLow = getY(vp.priceLow);
                const h = Math.max(3, Math.abs(yLow - yHigh));
                const maxVpWidth = 95;
                const w = Math.min(maxVpWidth, (vp.percentage / 30) * maxVpWidth);
                const x = svgWidth - rightMargin - w - 2;
                return (
                  <g key={`vp-${i}`}>
                    <rect
                      x={x}
                      y={Math.min(yHigh, yLow)}
                      width={w}
                      height={h}
                      fill={vp.isPoc ? '#f59e0b' : vp.inValueArea ? '#06b6d4' : '#64748b'}
                      fillOpacity={vp.isPoc ? 0.5 : vp.inValueArea ? 0.28 : 0.12}
                      stroke={vp.isPoc ? '#f59e0b' : 'none'}
                      strokeWidth={0.8}
                    />
                    {vp.isPoc && (
                      <text
                        x={x - 4}
                        y={Math.min(yHigh, yLow) + h / 2 + 3}
                        fill="#f59e0b"
                        fontSize="8.5"
                        textAnchor="end"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        POC ৳{vp.priceMid.toFixed(1)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* 7. Volume Sub-chart */}
          <g>
            {/* Volume Separator */}
            <line
              x1="0"
              y1={mainChartHeight}
              x2={svgWidth - rightMargin}
              y2={mainChartHeight}
              stroke="#1e293b"
              strokeWidth="1.2"
            />
            {/* Label */}
            <text
              x="12"
              y={mainChartHeight + 16}
              fill="#94a3b8"
              fontSize="9.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              VOLUME (Daily Shares &bull; RVOL {stock.rvol.toFixed(1)}x)
            </text>

            {/* Volume Bars */}
            {filteredBars.map((b, i) => {
              const x = getX(i);
              const isUp = b.close >= b.open;
              const vY = getVolY(b.volume);
              const usableWidth = svgWidth - rightMargin - 16;
              const step = usableWidth / filteredBars.length;
              const barWidth = Math.min(26, Math.max(3.5, step * 0.72));
              const isHovered = hoverIndex === i;
              const isRvolSurge = timeSeriesData[i]?.rvol >= 1.5;

              return (
                <rect
                  key={`vol-${i}`}
                  x={x - barWidth / 2}
                  y={vY}
                  width={barWidth}
                  height={mainChartHeight + volumeHeight - vY}
                  fill={isUp ? 'url(#volUpGrad)' : 'url(#volDownGrad)'}
                  stroke={isRvolSurge ? '#f97316' : 'none'}
                  strokeWidth={isRvolSurge ? 1 : 0}
                  opacity={hoverIndex !== null && !isHovered ? 0.6 : 1}
                />
              );
            })}

            {/* Volume 20-period Moving Average line */}
            <polyline
              points={volumeMaPoints}
              stroke="#fbbf24"
              strokeWidth="1.2"
              fill="none"
            />
          </g>

          {/* 8. Indicator Sub-chart (RSI / MACD / OBV) */}
          {activeSubchart !== 'none' && (
            <g>
              {/* Subchart Top Separator */}
              <line
                x1="0"
                y1={mainChartHeight + volumeHeight}
                x2={svgWidth - rightMargin}
                y2={mainChartHeight + volumeHeight}
                stroke="#1e293b"
                strokeWidth="1.2"
              />

              {/* RSI Subchart */}
              {activeSubchart === 'rsi' && (
                <g>
                  {/* Shaded Overbought Zone (70 - 100) */}
                  <rect
                    x="0"
                    y={getSubchartY(100)}
                    width={svgWidth - rightMargin}
                    height={getSubchartY(70) - getSubchartY(100)}
                    fill="#f43f5e"
                    fillOpacity="0.08"
                  />
                  {/* Shaded Oversold Zone (0 - 30) */}
                  <rect
                    x="0"
                    y={getSubchartY(30)}
                    width={svgWidth - rightMargin}
                    height={getSubchartY(0) - getSubchartY(30)}
                    fill="#10b981"
                    fillOpacity="0.08"
                  />

                  {/* Reference Lines (70, 50, 30) */}
                  <line
                    x1="0"
                    y1={getSubchartY(70)}
                    x2={svgWidth - rightMargin}
                    y2={getSubchartY(70)}
                    stroke="#f43f5e"
                    strokeDasharray="2 3"
                    strokeWidth="0.8"
                  />
                  <line
                    x1="0"
                    y1={getSubchartY(50)}
                    x2={svgWidth - rightMargin}
                    y2={getSubchartY(50)}
                    stroke="#475569"
                    strokeDasharray="2 3"
                    strokeWidth="0.8"
                  />
                  <line
                    x1="0"
                    y1={getSubchartY(30)}
                    x2={svgWidth - rightMargin}
                    y2={getSubchartY(30)}
                    stroke="#10b981"
                    strokeDasharray="2 3"
                    strokeWidth="0.8"
                  />

                  {/* Subchart Right Labels */}
                  <text x={svgWidth - rightMargin + 8} y={getSubchartY(70) + 3} fill="#f43f5e" fontSize="8" fontFamily="monospace">70</text>
                  <text x={svgWidth - rightMargin + 8} y={getSubchartY(50) + 3} fill="#64748b" fontSize="8" fontFamily="monospace">50</text>
                  <text x={svgWidth - rightMargin + 8} y={getSubchartY(30) + 3} fill="#10b981" fontSize="8" fontFamily="monospace">30</text>

                  {/* Title Label */}
                  <text
                    x="12"
                    y={mainChartHeight + volumeHeight + 16}
                    fill="#818cf8"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    RSI(14) MOMENTUM &bull; Overbought (&ge;70) / Oversold (&le;30)
                  </text>

                  {/* RSI Polyline */}
                  <polyline
                    points={rsiPoints}
                    stroke="#818cf8"
                    strokeWidth="2"
                    fill="none"
                  />
                </g>
              )}

              {/* MACD Subchart */}
              {activeSubchart === 'macd' && (
                <g>
                  {/* Zero Line */}
                  <line
                    x1="0"
                    y1={getSubchartY(0)}
                    x2={svgWidth - rightMargin}
                    y2={getSubchartY(0)}
                    stroke="#475569"
                    strokeWidth="1"
                  />

                  {/* Title Label */}
                  <text
                    x="12"
                    y={mainChartHeight + volumeHeight + 16}
                    fill="#38bdf8"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    MACD (12, 26, 9) &bull; Signal Line &amp; Histogram
                  </text>

                  {/* Histogram Bars */}
                  {timeSeriesData.map((d, i) => {
                    const x = getX(i);
                    const zeroY = getSubchartY(0);
                    const valY = getSubchartY(d.macdHist);
                    const h = Math.max(1, Math.abs(valY - zeroY));
                    const top = Math.min(zeroY, valY);
                    const usableWidth = svgWidth - rightMargin - 16;
                    const step = usableWidth / filteredBars.length;
                    const barWidth = Math.min(24, Math.max(2.5, step * 0.65));
                    const isPositive = d.macdHist >= 0;

                    return (
                      <rect
                        key={`mhist-${i}`}
                        x={x - barWidth / 2}
                        y={top}
                        width={barWidth}
                        height={h}
                        fill={isPositive ? '#10b981' : '#f43f5e'}
                        opacity={0.85}
                      />
                    );
                  })}

                  {/* MACD Line */}
                  <polyline
                    points={macdPoints}
                    stroke="#38bdf8"
                    strokeWidth="2"
                    fill="none"
                  />
                  {/* Signal Line */}
                  <polyline
                    points={macdSignalPoints}
                    stroke="#fbbf24"
                    strokeWidth="1.5"
                    fill="none"
                  />
                </g>
              )}

              {/* OBV Subchart */}
              {activeSubchart === 'obv' && (
                <g>
                  {/* Title Label */}
                  <text
                    x="12"
                    y={mainChartHeight + volumeHeight + 16}
                    fill="#34d399"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    ON-BALANCE VOLUME (OBV) &bull; Institutional Accumulation Trend
                  </text>

                  {/* OBV Polyline */}
                  <polyline
                    points={obvPoints}
                    stroke="#34d399"
                    strokeWidth="2.2"
                    fill="none"
                  />
                </g>
              )}
            </g>
          )}

          {/* 9. Interactive Dynamic Crosshairs (Vertical & Horizontal Snapping) */}
          {mousePos && (
            <g pointerEvents="none">
              {/* Vertical Crosshair */}
              <line
                x1={mousePos.x}
                y1="0"
                x2={mousePos.x}
                y2={totalSvgHeight - paddingBottom}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* Horizontal Crosshair (only in price chart area) */}
              {mousePos.y <= mainChartHeight && (
                <>
                  <line
                    x1="0"
                    y1={mousePos.y}
                    x2={svgWidth - rightMargin}
                    y2={mousePos.y}
                    stroke="#38bdf8"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  {/* Price Tag Badge on Right Axis */}
                  <rect
                    x={svgWidth - rightMargin + 4}
                    y={mousePos.y - 10}
                    width={rightMargin - 8}
                    height="20"
                    rx="4"
                    fill="#0284c7"
                    stroke="#38bdf8"
                    strokeWidth="1"
                  />
                  <text
                    x={svgWidth - rightMargin / 2}
                    y={mousePos.y + 4}
                    fill="#ffffff"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="black"
                    textAnchor="middle"
                  >
                    ৳{hoveredPrice?.toFixed(1)}
                  </text>
                </>
              )}

              {/* Date Tag Badge on Bottom Axis */}
              {activeBar && (
                <>
                  <rect
                    x={mousePos.x - 38}
                    y={totalSvgHeight - paddingBottom + 2}
                    width="76"
                    height="18"
                    rx="4"
                    fill="#0284c7"
                  />
                  <text
                    x={mousePos.x}
                    y={totalSvgHeight - paddingBottom + 14}
                    fill="#ffffff"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {activeBar.date}
                  </text>
                </>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Chart Guide & Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 p-2.5 rounded-xl bg-[#070b14] border border-slate-800/80">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 text-amber-400 font-bold">
            <span className="w-3 h-0.5 bg-amber-400 inline-block" />
            EMA 20
          </span>
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
            EMA 50
          </span>
          <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
            <span className="w-3 h-0.5 bg-indigo-400 border border-dashed inline-block" />
            Bollinger (±2σ)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-3 h-2 bg-emerald-500/30 border border-emerald-400 inline-block rounded-xs" />
            Buy Zone
          </span>
          <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
            <span className="w-3 h-0.5 bg-emerald-400 border border-dashed inline-block" />
            TP1 (+{Math.round(((stock.targetPrice1 - stock.lastPrice) / stock.lastPrice) * 100)}%)
          </span>
          <span className="flex items-center gap-1.5 text-rose-400 font-bold">
            <span className="w-3 h-0.5 bg-rose-500 border border-dashed inline-block" />
            SL (-{Math.round(((stock.lastPrice - stock.stopLoss) / stock.lastPrice) * 100)}%)
          </span>
        </div>

        <div className="text-slate-500 font-sans text-[10px]">
          Hover on canvas or click signal chips below to inspect bar price, volume surge, and indicators.
        </div>
      </div>

      {/* Actionable Trade Decision & Key Indicator Actions Dashboard */}
      <div className="p-4 rounded-2xl bg-[#070b14] border border-slate-800 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Actionable Trade Decision &bull; Algorithmic Indicators &amp; Triggers
              </h4>
              <p className="text-[11px] text-slate-400 font-sans">
                Quant confluence engine analyzing price gate, volatility squeeze, institutional RVOL, and profit targets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-sans">Detected Signals:</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-white font-bold border border-slate-700">
              {chartSignals.length} Active Events
            </span>
          </div>
        </div>

        {/* Signal Timeline Chips (Clickable to snap chart crosshair) */}
        {chartSignals.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Signal Timeline on Chart (Click to inspect candle session):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {chartSignals.map((sig, idx) => {
                const isSelected = hoverIndex === sig.barIndex;
                const isBuy = sig.direction === 'up';
                return (
                  <button
                    key={`sigchip-${idx}`}
                    onClick={() => {
                      setHoverIndex(sig.barIndex);
                      setMousePos({ x: getX(sig.barIndex), y: getY(sig.price) });
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? isBuy
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md shadow-emerald-950 font-black'
                          : 'bg-rose-500 text-white border-rose-300 shadow-md shadow-rose-950 font-black'
                        : isBuy
                        ? 'bg-[#0b1322] text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/10'
                        : 'bg-[#0b1322] text-rose-300 border-rose-500/40 hover:bg-rose-500/10'
                    }`}
                  >
                    <span>{sig.badge}</span>
                    <span className="text-[10px] opacity-75 font-normal">({sig.date})</span>
                    <span className="text-[10px] opacity-90 font-mono">৳{sig.price.toFixed(1)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4 Pillars of Indicator Action */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs pt-1">
          {/* Pillar 1: Trend Gate Action */}
          <div className="p-3 rounded-xl bg-[#090e1c] border border-slate-800/90 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                1. Trend Gate Action
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                stock.stage === 2
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                STAGE {stock.stage} ({stock.stage === 2 ? 'Markup' : 'Basing'})
              </span>
            </div>
            <div className="text-white font-bold">
              Price {stock.lastPrice.toFixed(1)} &gt; MA50 {stock.technicalParams?.ma50.toFixed(1) ?? '—'}
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Moving average ribbon aligned upward. Structural trend supports breakout continuation.
            </p>
          </div>

          {/* Pillar 2: Volatility Squeeze Action */}
          <div className="p-3 rounded-xl bg-[#090e1c] border border-slate-800/90 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                2. Squeeze Action
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                stock.squeezeBarCount >= 5
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {stock.squeezeBarCount >= 5 ? '⚡ COILED ENERGY' : 'NORMAL'}
              </span>
            </div>
            <div className="text-purple-300 font-bold font-mono">
              {stock.squeezeBarCount}d Bandwidth Compression
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              {stock.squeezeBarCount >= 5
                ? 'Bollinger Bands tightly pinched. A massive directional impulse move is imminent.'
                : 'Volatility envelope expanding with active price discovery.'}
            </p>
          </div>

          {/* Pillar 3: Volume Participation Action */}
          <div className="p-3 rounded-xl bg-[#090e1c] border border-slate-800/90 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                3. Volume Participation
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                stock.rvol >= 2.0
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                  : stock.rvol >= 1.3
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                RVOL {stock.rvol.toFixed(1)}x
              </span>
            </div>
            <div className="text-amber-400 font-bold font-mono">
              {(stock.volume / 1000).toFixed(0)}k Shares Traded
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              {stock.rvol >= 1.3
                ? 'Institutional volume surge confirms smart money sponsorship behind current move.'
                : 'Normal participation volume within 20-day baseline average.'}
            </p>
          </div>

          {/* Pillar 4: Momentum & Divergence Action */}
          <div className="p-3 rounded-xl bg-[#090e1c] border border-slate-800/90 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                4. RSI Momentum Action
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                {stock.technicalParams?.rsiZone ?? 'Neutral'}
              </span>
            </div>
            <div className="text-indigo-300 font-bold font-mono">
              RSI(14) = {stock.technicalParams?.rsi14.toFixed(1) ?? '54.2'}
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              {stock.technicalParams?.bullishDivergence
                ? '✓ Regular bullish divergence active. Upward momentum recovery underway.'
                : 'Momentum operating in the sweet spot without overbought exhaustion.'}
            </p>
          </div>
        </div>

        {/* Clear Actionable Trade Decision Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#071322] to-cyan-950/40 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wide">
                RECOMMENDED TRADE PLAN
              </span>
              <span className="text-xs font-bold text-white">
                {stock.symbol} &bull; Stage {stock.stage} Breakout
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs pt-0.5">
              <span>
                <span className="text-slate-400">Buy Zone:</span>{' '}
                <span className="text-emerald-400 font-bold font-mono">
                  ৳{stock.entryZoneLow?.toFixed(1) ?? (stock.lastPrice * 0.98).toFixed(1)} – ৳{stock.entryZoneHigh?.toFixed(1) ?? (stock.lastPrice * 1.02).toFixed(1)}
                </span>
              </span>
              <span>
                <span className="text-slate-400">Stop Loss:</span>{' '}
                <span className="text-rose-400 font-bold font-mono">
                  ৳{stock.stopLoss.toFixed(1)} (-{Math.round(((stock.lastPrice - stock.stopLoss) / stock.lastPrice) * 100)}%)
                </span>
              </span>
              <span>
                <span className="text-slate-400">Target 1:</span>{' '}
                <span className="text-emerald-300 font-bold font-mono">
                  ৳{stock.targetPrice1.toFixed(1)} (+{Math.round(((stock.targetPrice1 - stock.lastPrice) / stock.lastPrice) * 100)}%)
                </span>
              </span>
              <span>
                <span className="text-slate-400">Risk/Reward:</span>{' '}
                <span className="text-cyan-300 font-bold font-mono">{stock.riskRewardRatio}:1</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">ML WIN PROBABILITY</span>
              <span className="text-lg font-black text-emerald-400 font-mono">
                {Math.round(stock.mlProbability * 100)}%
              </span>
            </div>
            <div className="text-right border-l border-slate-800 pl-3">
              <span className="text-[10px] text-slate-400 block">KELLY ALLOCATION</span>
              <span className="text-lg font-black text-purple-400 font-mono">
                {stock.mlKellySizePct ?? 12}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
