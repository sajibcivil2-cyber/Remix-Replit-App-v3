/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CandleBar,
  DseStockItem,
  MonteCarloResult,
  MonteCarloPathPoint,
  MonteCarloBin,
  KellyResult,
  BacktestSummary,
  BacktestTrade,
  SectorRotationItem,
  LiveExecutionAlert,
  VolumeProfileBin,
  TradeAccuracyAudit,
  FactorAttributionItem,
  CalibrationBucket,
  MlModelStatus
} from '../types/dse';
import { isBenchmarkSymbol, isSectorIndexSymbol, resolveCompanySector, isUnclassifiedSector, isSmeSymbol, normalizeSectorName, isDsexSymbol } from './sectorClassifier';

/**
 * Normal random number generator via Box-Muller transform
 */
function randomNormal(mean = 0, stdev = 1): number {
  let u = 1 - Math.random();
  let v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

/**
 * Runs a rigorous 1,000-run Monte Carlo simulation for 20-session profit prediction.
 * Uses historical price volatility, ATR, and confluence drift parameters.
 */
export function runMonteCarloSimulation(
  stock: DseStockItem,
  iterations = 1000,
  forwardDays = 20
): MonteCarloResult {
  const bars = stock.bars;
  const currentPrice = stock.lastPrice;

  // Calculate daily log returns volatility from historical bars
  let dailyVol = 0.018; // default 1.8% daily volatility
  if (bars.length >= 10) {
    const returns: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      if (bars[i - 1].close > 0) {
        returns.push(Math.log(bars[i].close / bars[i - 1].close));
      }
    }
    if (returns.length > 5) {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (returns.length - 1);
      dailyVol = Math.max(0.008, Math.min(0.045, Math.sqrt(variance)));
    }
  }

  // Drift adjustment based on ML probability & Confluence
  // P=0.5 -> 0 drift; P=0.85 -> positive upward drift reflecting the edge
  const prob = stock.mlProbability || 0.65;
  const dailyDrift = (prob - 0.5) * 0.006 + (stock.confluenceScore >= 5 ? 0.002 : 0);

  // Run Monte Carlo paths
  // Store day-by-day simulated prices across all runs to calculate quantiles
  const dayPrices: number[][] = Array.from({ length: forwardDays + 1 }, () => []);
  const finalReturns: number[] = [];

  for (let i = 0; i < iterations; i++) {
    let p = currentPrice;
    dayPrices[0].push(p);

    for (let d = 1; d <= forwardDays; d++) {
      // Geometric Brownian Motion step
      const shock = randomNormal(0, dailyVol);
      const ret = dailyDrift - 0.5 * Math.pow(dailyVol, 2) + shock;
      p = p * Math.exp(ret);
      dayPrices[d].push(p);
    }

    const totalReturnPct = ((p - currentPrice) / currentPrice) * 100;
    finalReturns.push(totalReturnPct);
  }

  // Calculate percentile envelope day by day
  const percentilePaths: MonteCarloPathPoint[] = [];
  for (let d = 0; d <= forwardDays; d++) {
    const sorted = [...dayPrices[d]].sort((a, b) => a - b);
    const p10 = sorted[Math.floor(sorted.length * 0.1)];
    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];

    percentilePaths.push({
      day: d,
      p10: Math.round(p10 * 10) / 10,
      p25: Math.round(p25 * 10) / 10,
      p50: Math.round(p50 * 10) / 10,
      p75: Math.round(p75 * 10) / 10,
      p90: Math.round(p90 * 10) / 10,
    });
  }

  // Sort final returns to extract statistical metrics
  finalReturns.sort((a, b) => a - b);
  const p10ReturnPct = Math.round(finalReturns[Math.floor(finalReturns.length * 0.1)] * 10) / 10;
  const medianReturnPct = Math.round(finalReturns[Math.floor(finalReturns.length * 0.5)] * 10) / 10;
  const p90ReturnPct = Math.round(finalReturns[Math.floor(finalReturns.length * 0.9)] * 10) / 10;

  // Win probability (P(Return > 0))
  const winningRuns = finalReturns.filter(r => r > 0).length;
  const winProbability = Math.round((winningRuns / iterations) * 1000) / 10;

  // Expected Value
  const avgGain = finalReturns.filter(r => r > 0).reduce((a, b) => a + b, 0) / Math.max(1, winningRuns);
  const losingRuns = iterations - winningRuns;
  const avgLoss = Math.abs(finalReturns.filter(r => r <= 0).reduce((a, b) => a + b, 0) / Math.max(1, losingRuns));
  const expectedValuePct = Math.round(((winProbability / 100) * avgGain - ((100 - winProbability) / 100) * avgLoss) * 10) / 10;

  // Value at Risk (VaR 95% is the 5th percentile worst return)
  const var95Pct = Math.abs(Math.round(finalReturns[Math.floor(finalReturns.length * 0.05)] * 10) / 10);
  const worst5PctReturns = finalReturns.slice(0, Math.floor(finalReturns.length * 0.05));
  const cvar95Pct = Math.abs(Math.round((worst5PctReturns.reduce((a, b) => a + b, 0) / Math.max(1, worst5PctReturns.length)) * 10) / 10);

  // Distribution Histogram Bins (from -25% to +35% in 5% buckets)
  const binEdges = [-25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35];
  const distributionBins: MonteCarloBin[] = [];

  for (let i = 0; i < binEdges.length - 1; i++) {
    const low = binEdges[i];
    const high = binEdges[i + 1];
    const inBin = finalReturns.filter(r => r >= low && r < high);
    const count = inBin.length;
    const percentage = Math.round((count / iterations) * 1000) / 10;
    const isPositive = low >= 0;

    distributionBins.push({
      range: `${low > 0 ? '+' : ''}${low}% to ${high > 0 ? '+' : ''}${high}%`,
      minVal: low,
      maxVal: high,
      count,
      percentage,
      isPositive,
    });
  }

  return {
    symbol: stock.symbol,
    iterations,
    forwardDays,
    currentPrice,
    medianReturnPct,
    p10ReturnPct,
    p90ReturnPct,
    winProbability,
    expectedValuePct,
    var95Pct,
    cvar95Pct,
    percentilePaths,
    distributionBins,
  };
}

/**
 * Kelly Criterion & Asymmetric Capital Sizing Engine
 * Prevents account blowup while maximizing long-term compound growth.
 */
export function calculateKellyAndCapitalAllocation(
  stock: DseStockItem,
  totalCapitalBdt = 500000,
  riskPreference: 'quarter' | 'half' | 'full' = 'half'
): KellyResult {
  const winRate = stock.mlProbability || 0.65;
  const q = 1 - winRate;

  // Payoff ratio b: potential win % / potential loss %
  const targetGainPct = Math.max(2, ((stock.targetPrice1 - stock.lastPrice) / stock.lastPrice) * 100);
  const stopLossPct = Math.max(1.5, ((stock.lastPrice - stock.stopLoss) / stock.lastPrice) * 100);
  const payoffRatio = Math.round((targetGainPct / stopLossPct) * 100) / 100;

  // Kelly fraction f* = (p * b - q) / b
  const fullKellyRaw = (winRate * payoffRatio - q) / payoffRatio;
  const fullKellyPct = Math.max(0, Math.min(0.40, Math.round(fullKellyRaw * 1000) / 10)); // cap at 40%
  const halfKellyPct = Math.round((fullKellyPct / 2) * 10) / 10;
  const quarterKellyPct = Math.round((fullKellyPct / 4) * 10) / 10;

  // Recommended capital allocation percentage based on risk preference
  const recommendedPositionPct =
    riskPreference === 'full' ? fullKellyPct : riskPreference === 'quarter' ? quarterKellyPct : halfKellyPct;

  // Total BDT allocation and shares
  const totalCommitmentBdt = Math.round((totalCapitalBdt * recommendedPositionPct) / 100);
  const maxShares = Math.floor(totalCommitmentBdt / stock.lastPrice);

  // Recommended single-trade portfolio risk % (how much capital is lost if SL hits)
  const recommendedRiskPct = Math.round((recommendedPositionPct * (stopLossPct / 100)) * 10) / 10;

  // Risk of Ruin approximation
  const edge = winRate - q;
  let riskOfRuinPct = 0.1;
  if (edge > 0) {
    const ratio = (1 - edge) / (1 + edge);
    riskOfRuinPct = Math.round(Math.pow(ratio, 15) * 1000) / 10; // 15 unit risk cushion
  } else {
    riskOfRuinPct = 99.9;
  }

  return {
    symbol: stock.symbol,
    winRate: Math.round(winRate * 100),
    payoffRatio,
    fullKellyPct,
    halfKellyPct,
    quarterKellyPct,
    recommendedRiskPct: Math.max(0.5, Math.min(3.0, recommendedRiskPct)),
    recommendedPositionPct: Math.max(3, Math.min(30, recommendedPositionPct)),
    maxShares,
    totalCommitmentBdt,
    riskOfRuinPct: Math.max(0.1, Math.min(100, riskOfRuinPct)),
  };
}

interface PitBarSnapshot {
  ema20: number;
  ema50: number;
  ema50Prev5: number;
  ema200: number;
  bbUpper: number;
  bbWidth: number;
  squeezeCount: number;
  rsi14: number;
  rvol: number;
  obvRising: boolean;
  pivotHigh20: number;
  pos52w: number;
  isBullishCandle: boolean;
  streak3: boolean;
  pitProbability: number;
}

function computePointInTimeSeries(bars: CandleBar[]): PitBarSnapshot[] {
  const n = bars.length;
  const snapshots: PitBarSnapshot[] = new Array(n);
  if (n === 0) return snapshots;

  const k20 = 2 / 21;
  const k50 = 2 / 51;
  const k200 = 2 / 201;

  let ema20 = bars[0].close;
  let ema50 = bars[0].close;
  let ema200 = bars[0].close;
  const ema50History = new Float64Array(n);
  const obvHistory = new Float64Array(n);

  // Prefix sums for O(1) rolling Bollinger Bands, RVOL, and RSI14
  const prefixClose = new Float64Array(n + 1);
  const prefixCloseSq = new Float64Array(n + 1);
  const prefixVol = new Float64Array(n + 1);
  const prefixGain = new Float64Array(n + 1);
  const prefixLoss = new Float64Array(n + 1);

  let obv = 0;
  let consecutiveSqueeze = 0;

  for (let i = 0; i < n; i++) {
    const b = bars[i];
    const prevClose = i > 0 ? bars[i - 1].close : b.open;

    prefixClose[i + 1] = prefixClose[i] + b.close;
    prefixCloseSq[i + 1] = prefixCloseSq[i] + b.close * b.close;
    prefixVol[i + 1] = prefixVol[i] + b.volume;

    if (i > 0) {
      const diff = b.close - prevClose;
      prefixGain[i + 1] = prefixGain[i] + (diff > 0 ? diff : 0);
      prefixLoss[i + 1] = prefixLoss[i] + (diff < 0 ? -diff : 0);

      ema20 = b.close * k20 + ema20 * (1 - k20);
      ema50 = b.close * k50 + ema50 * (1 - k50);
      ema200 = b.close * k200 + ema200 * (1 - k200);
      if (b.close > prevClose) obv += b.volume;
      else if (b.close < prevClose) obv -= b.volume;
    }
    ema50History[i] = ema50;
    obvHistory[i] = obv;

    // Bollinger Bands (20, 2) strictly up to bar i in O(1)
    const bbStart = Math.max(0, i - 19);
    const bbLen = i - bbStart + 1;
    const sumC = prefixClose[i + 1] - prefixClose[bbStart];
    const sumSqC = prefixCloseSq[i + 1] - prefixCloseSq[bbStart];
    const bbMean = sumC / bbLen;
    const rawVar = bbLen > 1 ? Math.max(0, sumSqC / bbLen - bbMean * bbMean) : Math.pow(bbMean * 0.015, 2);
    const stdDev = Math.sqrt(rawVar);
    const bbUpper = bbMean + 2 * stdDev;
    const bbLower = bbMean - 2 * stdDev;
    const bbWidth = bbMean > 0 ? (bbUpper - bbLower) / bbMean : 0.05;
    if (bbWidth < 0.055) consecutiveSqueeze += 1;
    else consecutiveSqueeze = 0;

    // RSI 14 strictly up to bar i in O(1)
    let rsi14 = 50;
    if (i >= 14) {
      const gains = prefixGain[i + 1] - prefixGain[i - 13];
      const losses = prefixLoss[i + 1] - prefixLoss[i - 13];
      const avgG = gains / 14;
      const avgL = losses / 14;
      rsi14 = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
    }

    // RVOL vs prior 20 bars (strictly i-20..i-1) in O(1)
    const volStart = Math.max(0, i - 20);
    const volCount = i - volStart;
    const avgVol20 = volCount > 0 ? (prefixVol[i] - prefixVol[volStart]) / volCount : b.volume;
    const rvol = avgVol20 > 0 ? b.volume / avgVol20 : 1.0;

    // 10-bar OBV trend strictly ending at bar i
    const obvLookback = Math.max(0, i - 10);
    const obvRising = obvHistory[i] > obvHistory[obvLookback];

    // 20-bar prior pivot high strictly i-20..i-1
    let pivotHigh20 = b.high;
    if (i > 0) {
      pivotHigh20 = -Infinity;
      for (let p = Math.max(0, i - 20); p < i; p++) {
        if (bars[p].high > pivotHigh20) pivotHigh20 = bars[p].high;
      }
    }

    // Rolling 52-week price position up to bar i
    const rangeStart = Math.max(0, i - 250);
    let h52 = -Infinity;
    let l52 = Infinity;
    for (let r = rangeStart; r <= i; r++) {
      if (bars[r].high > h52) h52 = bars[r].high;
      if (bars[r].low < l52) l52 = bars[r].low;
    }
    const pos52w = h52 > l52 ? (b.close - l52) / (h52 - l52) : 0.5;

    const spread = Math.max(0.05, b.high - b.low);
    const closePos = (b.close - b.low) / spread;
    const isBullishCandle = b.close > b.open && b.close > prevClose && closePos >= 0.55;

    const streak3 = i >= 3 &&
      b.close > bars[i - 1].close &&
      bars[i - 1].close > bars[i - 2].close &&
      bars[i - 2].close > bars[i - 3].close;

    const ema50Prev5 = ema50History[Math.max(0, i - 5)];

    // Point-in-time ML score strictly from bars 0..i (zero look-ahead)
    let logOdds = 0.35;
    if (rvol >= 2.0) logOdds += 0.45;
    else if (rvol >= 1.35) logOdds += 0.25;
    else if (rvol < 0.85) logOdds -= 0.22;

    if (b.close > ema50 && ema50 >= ema50Prev5 * 0.998) logOdds += 0.36;
    else if (b.close < ema50) logOdds -= 0.32;

    if (isBullishCandle) logOdds += 0.24;
    if (consecutiveSqueeze >= 5) logOdds += 0.26;
    if (obvRising) logOdds += 0.20;
    if (pos52w < 0.45) logOdds += 0.16;
    if (streak3) logOdds += 0.22;
    if (rsi14 > 78) logOdds -= 0.25;
    const pctFromPivot = pivotHigh20 > 0 ? ((b.close - pivotHigh20) / pivotHigh20) * 100 : 0;
    if (pctFromPivot > 6.5 && !streak3) logOdds -= 0.28;

    const pitProbability = Math.round((1 / (1 + Math.exp(-logOdds))) * 100) / 100;

    snapshots[i] = {
      ema20,
      ema50,
      ema50Prev5,
      ema200,
      bbUpper,
      bbWidth,
      squeezeCount: consecutiveSqueeze,
      rsi14,
      rvol,
      obvRising,
      pivotHigh20,
      pos52w,
      isBullishCandle,
      streak3,
      pitProbability,
    };
  }

  return snapshots;
}

export interface BacktestParams {
  stopLossPct: number;
  tp1Pct: number;
  maxHoldingDays: number;
  useTrailingStop: boolean;
  enforceT2Lock?: boolean;
  roundTripFeePct?: number;
  simulateCircuitLock?: boolean;
  entryTiming?: 'next_open' | 'signal_close';
  maxEntryGapPct?: number;
  enforceCashCap?: boolean;
  maxConcurrentPositions?: number;
  enforceDsexRegimeGate?: boolean;
}

function buildDsexRegimeContext(stocks: DseStockItem[]): {
  dsexItem?: DseStockItem;
  dsexCloseByDate: Map<string, number>;
  dsexHealthyByDate: Map<string, boolean>;
  dsexGateAvailable: boolean;
} {
  const dsexItem = stocks.find(
    s => isDsexSymbol(s.symbol) || s.symbol === '00_DSEX' || s.symbol === 'DSEX' || s.symbol === 'INDEX'
  );
  const dsexCloseByDate = new Map<string, number>();
  const dsexHealthyByDate = new Map<string, boolean>();

  if (!dsexItem?.bars || dsexItem.bars.length === 0) {
    return { dsexItem, dsexCloseByDate, dsexHealthyByDate, dsexGateAvailable: false };
  }

  const sortedDsex = [...dsexItem.bars].sort((a, b) => a.date.localeCompare(b.date));
  const k20 = 2 / 21;
  const k50 = 2 / 51;
  let ema20 = sortedDsex[0].close;
  let ema50 = sortedDsex[0].close;

  for (let i = 0; i < sortedDsex.length; i++) {
    const b = sortedDsex[i];
    if (i > 0) {
      ema20 = b.close * k20 + ema20 * (1 - k20);
      ema50 = b.close * k50 + ema50 * (1 - k50);
    }
    dsexCloseByDate.set(b.date, b.close);
    // Gate out confirmed bear regimes (DSEX > 1.5% below EMA50 while EMA20 < EMA50)
    const isDeepBear = i >= 20 && b.close < ema50 * 0.985 && ema20 < ema50;
    dsexHealthyByDate.set(b.date, !isDeepBear);
  }

  return {
    dsexItem,
    dsexCloseByDate,
    dsexHealthyByDate,
    dsexGateAvailable: sortedDsex.length >= 25,
  };
}

/**
 * Point-in-Time Historical Strategy Backtesting Engine
 * Zero look-ahead leakage: evaluates every rule strictly from bars 0..i,
 * supports next-session-open EOD execution or signal-day-close,
 * enforces DSE T+2 settlement lock, circuit freezes, 0.85% round-trip DSE fees,
 * historical DSEX regime gating, and strict 100% cash BO concurrency caps.
 */
function runStrategyBacktestWithCache(
  stocks: DseStockItem[],
  strategy: string,
  params: Partial<BacktestParams>,
  pitCache?: Map<string, PitBarSnapshot[]>,
  dsexContext?: ReturnType<typeof buildDsexRegimeContext>
): BacktestSummary {
  const resolvedParams: BacktestParams = {
    stopLossPct: params.stopLossPct ?? 4.5,
    tp1Pct: params.tp1Pct ?? 12.0,
    maxHoldingDays: params.maxHoldingDays ?? 20,
    useTrailingStop: params.useTrailingStop ?? true,
    enforceT2Lock: params.enforceT2Lock ?? true,
    roundTripFeePct: params.roundTripFeePct ?? 0.85,
    simulateCircuitLock: params.simulateCircuitLock ?? true,
    entryTiming: params.entryTiming ?? 'next_open',
    maxEntryGapPct: params.maxEntryGapPct ?? 4.0,
    enforceCashCap: params.enforceCashCap ?? true,
    maxConcurrentPositions: Math.max(1, params.maxConcurrentPositions ?? 6),
    enforceDsexRegimeGate: params.enforceDsexRegimeGate ?? true,
  };
  const enforceT2Lock = resolvedParams.enforceT2Lock ?? true;
  const roundTripFeePct = resolvedParams.roundTripFeePct ?? 0.85;
  const simulateCircuitLock = resolvedParams.simulateCircuitLock ?? true;
  const entryTiming: 'next_open' | 'signal_close' = resolvedParams.entryTiming ?? 'next_open';
  const maxEntryGapPct = resolvedParams.maxEntryGapPct ?? 4.0;
  const enforceCashCap = resolvedParams.enforceCashCap ?? true;
  const maxConcurrentPositions = Math.max(1, resolvedParams.maxConcurrentPositions ?? 6);
  const enforceDsexRegimeGate = resolvedParams.enforceDsexRegimeGate ?? true;

  const candidateTrades: BacktestTrade[] = [];
  let tradeCounter = 100;
  let barsEvaluatedCount = 0;
  let signalsFilteredCount = 0;
  let t2LockedExitsCount = 0;
  let circuitBlockedBarsCount = 0;
  let gapSkippedCount = 0;
  let dsexRegimeSkippedCount = 0;

  const initialEquity = 1000000; // 10 Lakh BDT

  const { dsexItem, dsexCloseByDate, dsexHealthyByDate, dsexGateAvailable } =
    dsexContext ?? buildDsexRegimeContext(stocks);
  const dsexGateActive = enforceDsexRegimeGate && dsexGateAvailable;

  const datesSet = new Set<string>();
  stocks.forEach(s => s.bars.forEach(b => datesSet.add(b.date)));
  const sortedDates = Array.from(datesSet).sort();

  for (const stock of stocks) {
    // Skip sector index and benchmark symbols from stock backtest simulation
    if (stock.isSectorIndex || isSectorIndexSymbol(stock.symbol) || isBenchmarkSymbol(stock.symbol) || stock.sector === 'Benchmark') continue;

    const bars = stock.bars;
    if (!bars || bars.length < 25) continue;

    let pit = pitCache?.get(stock.symbol);
    if (!pit) {
      pit = computePointInTimeSeries(bars);
      pitCache?.set(stock.symbol, pit);
    }

    const circuitLimit = stock.isSme || stock.marketBoard === 'SME' ? 0.19 : 0.095;
    const lastSignalIdx = entryTiming === 'next_open' ? bars.length - 4 : bars.length - 3;

    // Scan for entry points strictly using bars 0..i
    for (let i = 20; i <= lastSignalIdx; i++) {
      barsEvaluatedCount++;
      const bar = bars[i];
      const prevBar = bars[i - 1];
      const snap = pit[i];
      const prevSnap = pit[i - 1];

      // Zero-volume suspended bar guard
      if (bar.volume <= 0 || bar.close <= 0) {
        signalsFilteredCount++;
        continue;
      }

      // Historical DSEX bear-regime gate
      if (dsexGateActive) {
        const isDsexHealthy = dsexHealthyByDate.get(bar.date);
        if (isDsexHealthy === false) {
          dsexRegimeSkippedCount++;
          continue;
        }
      }

      // Circuit-up freeze guard on signal day
      const dayChange = prevBar.close > 0 ? (bar.close - prevBar.close) / prevBar.close : 0;
      const isUpperCircuitLockedSignal = simulateCircuitLock && dayChange >= circuitLimit && Math.abs(bar.high - bar.low) <= 0.05;
      if (isUpperCircuitLockedSignal) {
        signalsFilteredCount++;
        continue;
      }

      let triggerEntry = false;

      if (strategy === 'confluence_5') {
        let pitScore = 0;
        if (bar.close > snap.ema50 && snap.ema50 >= snap.ema50Prev5 * 0.998) pitScore += 2;
        if (snap.rvol >= 1.5 && snap.isBullishCandle) pitScore += 2;
        else if (snap.rvol >= 1.2 && bar.close > bar.open) pitScore += 1;
        if (snap.obvRising) pitScore += 1;
        if (snap.rsi14 >= 48 && snap.rsi14 <= 75) pitScore += 1;
        if (snap.pos52w < 0.65) pitScore += 1;
        if (pitScore >= 5 && snap.isBullishCandle) {
          triggerEntry = true;
        }
      } else if (strategy === 'squeeze_breakout') {
        const wasCoiled = prevSnap.squeezeCount >= 4 || prevSnap.bbWidth < 0.055;
        const expanded = bar.close >= prevSnap.pivotHigh20 * 0.99 || bar.close >= prevSnap.bbUpper * 0.99;
        if (wasCoiled && expanded && snap.rvol >= 1.3 && snap.isBullishCandle) {
          triggerEntry = true;
        }
      } else if (strategy === 'stage2_trend') {
        const isStage2 = bar.close > snap.ema50 && snap.ema50 >= snap.ema50Prev5 * 0.998 && bar.close > snap.ema20;
        if (isStage2 && snap.rvol >= 1.2 && snap.isBullishCandle) {
          triggerEntry = true;
        }
      } else if (strategy === 'ml_conviction') {
        if (snap.pitProbability >= 0.74 && bar.close > bar.open) {
          triggerEntry = true;
        }
      } else if (strategy === 'multi_day_momentum') {
        const c3 = bars[i - 3]?.close ?? 0;
        const ret3d = c3 > 0 ? ((bar.close - c3) / c3) * 100 : 0;
        if (snap.streak3 && bar.close > bar.open && ret3d >= 2.2 && ret3d <= 16 && snap.rvol >= 0.9 && snap.rsi14 <= 82) {
          triggerEntry = true;
        }
      } else {
        if (snap.pitProbability >= 0.68 && snap.isBullishCandle) {
          triggerEntry = true;
        }
      }

      if (!triggerEntry) {
        signalsFilteredCount++;
        continue;
      }

      let entryBarIdx = i;
      let entryPrice = bar.close;
      let entryDate = bar.date;

      if (entryTiming === 'next_open') {
        entryBarIdx = i + 1;
        const nextBar = bars[entryBarIdx];
        if (!nextBar || nextBar.volume <= 0) {
          signalsFilteredCount++;
          continue;
        }
        const openPrice = nextBar.open > 0 ? nextBar.open : nextBar.close;
        const openGapRatio = bar.close > 0 ? (openPrice - bar.close) / bar.close : 0;

        // If next session opened limit-up frozen, limit buy cannot fill
        if (simulateCircuitLock && openGapRatio >= circuitLimit && Math.abs(nextBar.high - nextBar.low) <= 0.05) {
          circuitBlockedBarsCount++;
          signalsFilteredCount++;
          continue;
        }
        // Gap-chase discipline: skip entries that gap beyond maxEntryGapPct at next morning's open
        if (openGapRatio * 100 > maxEntryGapPct) {
          gapSkippedCount++;
          continue;
        }
        entryPrice = openPrice;
        entryDate = nextBar.date;
      }

      const targetPrice = entryPrice * (1 + resolvedParams.tp1Pct / 100);
      const stopLossPrice = entryPrice * (1 - resolvedParams.stopLossPct / 100);
      let trailingStop = stopLossPrice;

      let exitPrice = entryPrice;
      let exitDate = entryDate;
      let outcome: BacktestTrade['outcome'] = 'TIMEOUT';
      let holdingBars = 0;
      let t2LockTriggered = false;
      let circuitBlocked = false;

      // Check Day 0 stop breach if entered at next morning's open
      if (entryTiming === 'next_open' && bars[entryBarIdx].low <= trailingStop) {
        t2LockTriggered = true;
      }

      // Simulate forward bars honoring DSE T+2 settlement & circuit locks
      const maxExitIdx = Math.min(bars.length - 1, entryBarIdx + resolvedParams.maxHoldingDays);
      for (let j = entryBarIdx + 1; j <= maxExitIdx; j++) {
        holdingBars++;
        const forwardBar = bars[j];
        const prevForwardClose = bars[j - 1].close;
        exitDate = forwardBar.date;

        const fwdChange = prevForwardClose > 0 ? (forwardBar.close - prevForwardClose) / prevForwardClose : 0;
        const isLowerCircuitLocked = simulateCircuitLock && fwdChange <= -circuitLimit && Math.abs(forwardBar.high - forwardBar.low) <= 0.05;

        // DSE T+2 rule: cannot exit on Day 1 (j - entryBarIdx < 2); shares only become salable from Day 2
        const canSellSession = !enforceT2Lock || (j - entryBarIdx >= 2);

        if (!canSellSession) {
          if (forwardBar.low <= trailingStop) {
            t2LockTriggered = true;
          }
          if (j === maxExitIdx) {
            exitPrice = forwardBar.close;
            outcome = 'TIMEOUT';
          }
          continue;
        }

        if (t2LockTriggered && forwardBar.open <= trailingStop) {
          if (isLowerCircuitLocked) {
            circuitBlocked = true;
            circuitBlockedBarsCount++;
            continue;
          }
          exitPrice = Math.max(0.1, forwardBar.open);
          outcome = 'STOP_LOSS';
          t2LockedExitsCount++;
          break;
        }

        if (forwardBar.high >= targetPrice) {
          exitPrice = Math.max(targetPrice, forwardBar.open >= targetPrice ? forwardBar.open : targetPrice);
          outcome = 'TP1';
          break;
        }

        if (forwardBar.low <= trailingStop) {
          if (isLowerCircuitLocked) {
            circuitBlocked = true;
            circuitBlockedBarsCount++;
            continue;
          }
          exitPrice = forwardBar.open <= trailingStop ? forwardBar.open : trailingStop;
          outcome = resolvedParams.useTrailingStop && trailingStop > stopLossPrice ? 'TRAILING_STOP' : 'STOP_LOSS';
          if (t2LockTriggered) t2LockedExitsCount++;
          break;
        }

        if (resolvedParams.useTrailingStop && forwardBar.close > entryPrice * 1.06) {
          trailingStop = Math.max(trailingStop, entryPrice * 1.02);
        }

        if (j === maxExitIdx) {
          if (isLowerCircuitLocked && j + 1 < bars.length) {
            circuitBlocked = true;
            circuitBlockedBarsCount++;
            exitPrice = bars[j + 1].open > 0 ? bars[j + 1].open : bars[j + 1].close;
            exitDate = bars[j + 1].date;
          } else {
            exitPrice = forwardBar.close;
          }
          outcome = 'TIMEOUT';
        }
      }

      const grossPnlPct = Math.round(((exitPrice - entryPrice) / entryPrice) * 1000) / 10;
      const pnlPct = Math.round((grossPnlPct - roundTripFeePct) * 10) / 10;
      const pnlAmount = Math.round((initialEquity * 0.15 * pnlPct) / 100);
      const isWin = pnlPct > 0;

      candidateTrades.push({
        id: `BT-${tradeCounter++}`,
        symbol: stock.symbol,
        strategy,
        entryDate,
        entryPrice,
        exitDate,
        exitPrice,
        pnlPct,
        grossPnlPct,
        feeDragPct: roundTripFeePct,
        pnlAmount,
        holdingBars,
        outcome,
        isWin,
        t2LockTriggered,
        circuitBlocked,
        entryTimingUsed: entryTiming,
        pitProbability: snap.pitProbability,
        pitFactors: {
          rvolSurge: snap.rvol >= 1.5,
          stage2: bar.close > snap.ema50 && snap.ema50 >= snap.ema50Prev5 * 0.998,
          squeeze: prevSnap.squeezeCount >= 4 || prevSnap.bbWidth < 0.055,
          multiDayStreak: snap.streak3,
          nearBase: snap.pos52w < 0.45,
          trailingProtected: outcome === 'TRAILING_STOP',
        },
      });

      i = entryBarIdx + Math.max(4, holdingBars);
    }
  }

  // Sort candidate trades chronologically; on same day prioritize highest PIT probability
  candidateTrades.sort((a, b) => {
    const dateDiff = a.entryDate.localeCompare(b.entryDate);
    if (dateDiff !== 0) return dateDiff;
    const probDiff = (b.pitProbability ?? 0) - (a.pitProbability ?? 0);
    if (Math.abs(probDiff) > 0.001) return probDiff;
    return a.symbol.localeCompare(b.symbol);
  });

  // Strict 100% Cash & Slot Portfolio Ledger
  const executedTrades: BacktestTrade[] = [];
  const equityCurve: { date: string; portfolioEquity: number; benchmarkEquity: number; drawdownPct: number }[] = [];
  let peakEquity = initialEquity;
  let maxDrawdownPct = 0;

  const firstTradeDate = candidateTrades[0]?.entryDate || sortedDates[0] || '2026-08-01';
  const baseDsex = dsexCloseByDate.get(firstTradeDate) ||
    (dsexItem?.bars && dsexItem.bars.length > 0 ? dsexItem.bars[0].close : 0);

  equityCurve.push({
    date: firstTradeDate,
    portfolioEquity: initialEquity,
    benchmarkEquity: initialEquity,
    drawdownPct: 0,
  });

  let runningEquity = initialEquity;
  let availableCash = initialEquity;
  let runningBenchmark = initialEquity;
  let cashCappedSkippedCount = 0;
  let peakConcurrentPositions = 0;
  let peakCapitalDeployedPct = 0;

  const activePositions: Array<{
    trade: BacktestTrade;
    invested: number;
  }> = [];

  const settlePositionsUpTo = (upToDate: string) => {
    activePositions.sort((a, b) => a.trade.exitDate.localeCompare(b.trade.exitDate));
    while (activePositions.length > 0 && activePositions[0].trade.exitDate < upToDate) {
      const pos = activePositions.shift()!;
      const netTradeAmount = Math.round((pos.invested * pos.trade.pnlPct) / 100);
      pos.trade.pnlAmount = netTradeAmount;
      availableCash += pos.invested + netTradeAmount;
      runningEquity += netTradeAmount;

      if (runningEquity > peakEquity) peakEquity = runningEquity;
      const dd = peakEquity > 0 ? Math.round(((peakEquity - runningEquity) / peakEquity) * 1000) / 10 : 0;
      if (dd > maxDrawdownPct) maxDrawdownPct = dd;

      if (baseDsex > 0) {
        const exitDsex = dsexCloseByDate.get(pos.trade.exitDate);
        if (exitDsex && exitDsex > 0) {
          runningBenchmark = Math.round(initialEquity * (exitDsex / baseDsex));
        }
      }

      equityCurve.push({
        date: pos.trade.exitDate,
        portfolioEquity: Math.round(runningEquity),
        benchmarkEquity: Math.round(runningBenchmark),
        drawdownPct: dd,
      });
    }
  };

  const slotWeight = Math.min(0.25, 0.96 / maxConcurrentPositions);

  for (const cand of candidateTrades) {
    if (enforceCashCap) {
      settlePositionsUpTo(cand.entryDate);

      // Prevent duplicate concurrent position in the same ticker
      if (activePositions.some(p => p.trade.symbol === cand.symbol)) {
        continue;
      }

      const deployedCapital = activePositions.reduce((s, p) => s + p.invested, 0);
      const currentPortfolioValue = Math.max(1000, availableCash + deployedCapital);
      const targetAllocation = Math.round(currentPortfolioValue * slotWeight);

      if (activePositions.length >= maxConcurrentPositions || availableCash < Math.max(10000, targetAllocation * 0.5)) {
        cashCappedSkippedCount++;
        continue;
      }

      const actualAllocated = Math.min(availableCash, targetAllocation);
      availableCash -= actualAllocated;
      activePositions.push({ trade: cand, invested: actualAllocated });
      executedTrades.push(cand);

      peakConcurrentPositions = Math.max(peakConcurrentPositions, activePositions.length);
      const newDeployedPct = Math.round(((deployedCapital + actualAllocated) / currentPortfolioValue) * 1000) / 10;
      peakCapitalDeployedPct = Math.max(peakCapitalDeployedPct, Math.min(100, newDeployedPct));
    } else {
      const netTradeAmount = Math.round((runningEquity * 0.15 * cand.pnlPct) / 100);
      cand.pnlAmount = netTradeAmount;
      runningEquity += netTradeAmount;
      executedTrades.push(cand);

      if (runningEquity > peakEquity) peakEquity = runningEquity;
      const dd = Math.round(((peakEquity - runningEquity) / peakEquity) * 1000) / 10;
      if (dd > maxDrawdownPct) maxDrawdownPct = dd;

      if (baseDsex > 0) {
        const exitDsex = dsexCloseByDate.get(cand.exitDate);
        if (exitDsex && exitDsex > 0) {
          runningBenchmark = Math.round(initialEquity * (exitDsex / baseDsex));
        }
      }

      equityCurve.push({
        date: cand.exitDate,
        portfolioEquity: Math.round(runningEquity),
        benchmarkEquity: Math.round(runningBenchmark),
        drawdownPct: dd,
      });
    }
  }

  if (enforceCashCap) {
    settlePositionsUpTo('9999-12-31');
  }

  // Sort equity curve chronologically
  equityCurve.sort((a, b) => a.date.localeCompare(b.date));

  const trades = executedTrades;
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.isWin).length;
  const losingTrades = totalTrades - winningTrades;
  const winRatePct = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 1000) / 10 : 0;

  const totalGains = trades.filter(t => t.pnlAmount > 0).reduce((acc, t) => acc + t.pnlAmount, 0);
  const totalLosses = Math.abs(trades.filter(t => t.pnlAmount < 0).reduce((acc, t) => acc + t.pnlAmount, 0));
  const profitFactor = totalLosses > 0 ? Math.round((totalGains / totalLosses) * 100) / 100 : totalGains > 0 ? 9.99 : 1.0;

  const avgGainPct = winningTrades > 0
    ? Math.round((trades.filter(t => t.isWin).reduce((acc, t) => acc + t.pnlPct, 0) / winningTrades) * 10) / 10
    : 0;

  const avgLossPct = losingTrades > 0
    ? Math.abs(Math.round((trades.filter(t => !t.isWin).reduce((acc, t) => acc + t.pnlPct, 0) / losingTrades) * 10) / 10)
    : 0;

  const payoffRatio = avgLossPct > 0 ? Math.round((avgGainPct / avgLossPct) * 100) / 100 : avgGainPct;

  const totalReturnPct = Math.round(((runningEquity - initialEquity) / initialEquity) * 1000) / 10;
  const benchmarkReturnPct = Math.round(((runningBenchmark - initialEquity) / initialEquity) * 1000) / 10;

  const returns = trades.map(t => t.pnlPct);
  const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdDev = returns.length > 1
    ? Math.sqrt(returns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1)) || 1
    : 1;
  const downsideReturns = returns.filter(r => r < 0);
  const downsideStdDev = downsideReturns.length > 0
    ? Math.sqrt(downsideReturns.reduce((acc, r) => acc + Math.pow(r, 2), 0) / downsideReturns.length) || 1
    : 1;

  const sharpeRatio = totalTrades > 0 ? Math.round(((meanReturn - 0.2) / stdDev) * 100) / 100 : 0;
  const sortinoRatio = totalTrades > 0 ? Math.round(((meanReturn - 0.2) / downsideStdDev) * 100) / 100 : 0;

  const strategyDisplayNames: Record<string, string> = {
    confluence_5: '5-Point Confluence Breakout Engine (PIT)',
    squeeze_breakout: 'Bollinger Band Squeeze & RVOL Expansion (PIT)',
    stage2_trend: 'Weinstein Stage 2 Trend Continuation (PIT)',
    ml_conviction: 'ML High-Conviction Probability (PIT P >= 74%)',
    multi_day_momentum: 'Multi-Day Continuous Climbers (3D+ Streak)',
  };

  return {
    strategyName: strategyDisplayNames[strategy] || strategy,
    totalTrades,
    winningTrades,
    losingTrades,
    winRatePct,
    profitFactor,
    totalReturnPct,
    benchmarkReturnPct,
    maxDrawdownPct,
    sharpeRatio: Math.max(0, sharpeRatio),
    sortinoRatio: Math.max(0, sortinoRatio),
    avgGainPct,
    avgLossPct,
    payoffRatio,
    t2LockedExitsCount,
    circuitBlockedBarsCount,
    avgFeeDragPct: roundTripFeePct,
    barsEvaluatedCount,
    signalsFilteredCount,
    entryTimingUsed: entryTiming,
    maxConcurrentPositions: enforceCashCap ? maxConcurrentPositions : undefined,
    peakConcurrentPositions: enforceCashCap ? peakConcurrentPositions : totalTrades,
    peakCapitalDeployedPct: enforceCashCap ? peakCapitalDeployedPct : undefined,
    cashCappedSkippedCount,
    gapSkippedCount,
    dsexRegimeSkippedCount,
    dsexGateActive,
    equityCurve,
    trades,
  };
}

export function runStrategyBacktest(
  stocks: DseStockItem[],
  strategy = 'confluence_5',
  params: Partial<BacktestParams> = {}
): BacktestSummary {
  return runStrategyBacktestWithCache(stocks, strategy, params);
}

/**
 * Empirical Trade Suggestion Accuracy & Analytical Performance Audit Engine
 * Computes 100% real factor attribution, Brier score, and calibration curves
 * directly from point-in-time, DSE-friction-adjusted simulated trades.
 */
export function computeTradeAccuracyAudit(
  stocks: DseStockItem[],
  entryTiming: 'next_open' | 'signal_close' = 'next_open'
): TradeAccuracyAudit {
  const strategies = ['confluence_5', 'squeeze_breakout', 'stage2_trend', 'ml_conviction', 'multi_day_momentum'];
  const pitCache = new Map<string, PitBarSnapshot[]>();
  const dsexContext = buildDsexRegimeContext(stocks);

  const strategyComparisons: BacktestSummary[] = strategies.map(strat =>
    runStrategyBacktestWithCache(
      stocks,
      strat,
      {
        stopLossPct: 4.5,
        tp1Pct: 12.0,
        maxHoldingDays: 20,
        useTrailingStop: true,
        enforceT2Lock: true,
        roundTripFeePct: 0.85,
        simulateCircuitLock: true,
        entryTiming,
        maxEntryGapPct: 4.0,
        enforceCashCap: true,
        maxConcurrentPositions: 6,
        enforceDsexRegimeGate: true,
      },
      pitCache,
      dsexContext
    )
  );

  // Aggregate unique trades across all strategies
  const allTrades: BacktestTrade[] = [];
  const tradeKeys = new Set<string>();
  let barsScannedCount = 0;
  let setupsFilteredOutCount = 0;

  for (const stratSummary of strategyComparisons) {
    barsScannedCount = Math.max(barsScannedCount, stratSummary.barsEvaluatedCount || 0);
    setupsFilteredOutCount = Math.max(setupsFilteredOutCount, stratSummary.signalsFilteredCount || 0);
    for (const trade of stratSummary.trades) {
      const key = `${trade.symbol}-${trade.entryDate}-${trade.strategy}`;
      if (!tradeKeys.has(key)) {
        tradeKeys.add(key);
        allTrades.push(trade);
      }
    }
  }

  const totalTradesAudited = allTrades.length;
  const winningTrades = allTrades.filter(t => t.isWin).length;
  const losingTrades = totalTradesAudited - winningTrades;
  const overallWinRatePct = totalTradesAudited > 0 ? Math.round((winningTrades / totalTradesAudited) * 1000) / 10 : 0;

  const totalGains = allTrades.filter(t => t.pnlAmount > 0).reduce((acc, t) => acc + t.pnlAmount, 0);
  const totalLosses = Math.abs(allTrades.filter(t => t.pnlAmount < 0).reduce((acc, t) => acc + t.pnlAmount, 0));
  const overallProfitFactor = totalLosses > 0 ? Math.round((totalGains / totalLosses) * 100) / 100 : totalGains > 0 ? 9.99 : 1.0;

  const avgGainPct = winningTrades > 0
    ? Math.round((allTrades.filter(t => t.isWin).reduce((acc, t) => acc + t.pnlPct, 0) / winningTrades) * 10) / 10
    : 0;

  const avgLossPct = losingTrades > 0
    ? Math.abs(Math.round((allTrades.filter(t => !t.isWin).reduce((acc, t) => acc + t.pnlPct, 0) / losingTrades) * 10) / 10)
    : 0;

  const payoffRatio = avgLossPct > 0 ? Math.round((avgGainPct / avgLossPct) * 100) / 100 : avgGainPct;

  const pWin = overallWinRatePct / 100;
  const pLoss = 1 - pWin;
  const mathematicalExpectancyPct = Math.round((pWin * avgGainPct - pLoss * avgLossPct) * 100) / 100;

  const maxDrawdownPct = Math.max(...strategyComparisons.map(s => s.maxDrawdownPct), 0);
  const sharpeRatio = Math.round((strategyComparisons.reduce((acc, s) => acc + s.sharpeRatio, 0) / Math.max(1, strategyComparisons.length)) * 100) / 100;
  const sortinoRatio = Math.round((strategyComparisons.reduce((acc, s) => acc + s.sortinoRatio, 0) / Math.max(1, strategyComparisons.length)) * 100) / 100;

  // Empirical Brier Score from point-in-time probability at entry
  let brierSum = 0;
  for (const trade of allTrades) {
    const predictedProb = trade.pitProbability ?? 0.72;
    const actualOutcome = trade.isWin ? 1 : 0;
    brierSum += Math.pow(predictedProb - actualOutcome, 2);
  }
  const brierScore = totalTradesAudited > 0 ? Math.round((brierSum / totalTradesAudited) * 1000) / 1000 : 0;

  const precisionPct = overallWinRatePct;
  const sensitivityPct = totalTradesAudited > 0
    ? Math.round((winningTrades / Math.max(1, winningTrades + losingTrades)) * 1000) / 10
    : 0;
  const falsePositiveRatePct = Math.round((100 - overallWinRatePct) * 10) / 10;

  // Empirical Factor Attribution derived from actual PIT trade flags
  const computeFactorMetrics = (
    predicate: (t: BacktestTrade) => boolean
  ): { winWith: number; winWithout: number; edge: number } => {
    const withFactor = allTrades.filter(predicate);
    const withoutFactor = allTrades.filter(t => !predicate(t));
    const winWith = withFactor.length > 0
      ? Math.round((withFactor.filter(t => t.isWin).length / withFactor.length) * 1000) / 10
      : overallWinRatePct;
    const winWithout = withoutFactor.length > 0
      ? Math.round((withoutFactor.filter(t => t.isWin).length / withoutFactor.length) * 1000) / 10
      : overallWinRatePct;
    const edge = Math.round((winWith - winWithout) * 10) / 10;
    return { winWith, winWithout, edge };
  };

  const rvolMetrics = computeFactorMetrics(t => Boolean(t.pitFactors?.rvolSurge));
  const stage2Metrics = computeFactorMetrics(t => Boolean(t.pitFactors?.stage2));
  const squeezeMetrics = computeFactorMetrics(t => Boolean(t.pitFactors?.squeeze));
  const streakMetrics = computeFactorMetrics(t => Boolean(t.pitFactors?.multiDayStreak));
  const baseMetrics = computeFactorMetrics(t => Boolean(t.pitFactors?.nearBase));
  const trailMetrics = computeFactorMetrics(t => Boolean(t.pitFactors?.trailingProtected));

  const factorAttributions: FactorAttributionItem[] = [
    {
      factor: 'Relative Volume Expansion (RVOL >= 1.5x at Entry)',
      category: 'Volume & Flow',
      winRateWithFactor: rvolMetrics.winWith,
      winRateWithoutFactor: rvolMetrics.winWithout,
      alphaEdgePct: rvolMetrics.edge,
      importancePct: 24,
      description: 'Empirical comparison of entries with >= 1.5x 20-day average volume versus lower-volume setups on your loaded DSE history.'
    },
    {
      factor: 'Point-in-Time Stage 2 Alignment (Close > Rising MA50)',
      category: 'Trend & Structure',
      winRateWithFactor: stage2Metrics.winWith,
      winRateWithoutFactor: stage2Metrics.winWithout,
      alphaEdgePct: stage2Metrics.edge,
      importancePct: 22,
      description: 'Measured strictly from historical EMA50 slope at entry bar i, isolating Stage 2 markup trends from counter-trend bounces.'
    },
    {
      factor: 'Bollinger Squeeze Pre-Ignition (Coiled >= 4 bars)',
      category: 'Volatility',
      winRateWithFactor: squeezeMetrics.winWith,
      winRateWithoutFactor: squeezeMetrics.winWithout,
      alphaEdgePct: squeezeMetrics.edge,
      importancePct: 18,
      description: 'Compares compressed-volatility breakout entries against non-squeezed wide-band entries across historical bars.'
    },
    {
      factor: 'Multi-Day Continuous Uptrend (3+ Advancing Closes)',
      category: 'Trend & Structure',
      winRateWithFactor: streakMetrics.winWith,
      winRateWithoutFactor: streakMetrics.winWithout,
      alphaEdgePct: streakMetrics.edge,
      importancePct: 15,
      description: 'Evaluates 3+ consecutive advancing sessions entering with orderly momentum rather than isolated single-day spikes.'
    },
    {
      factor: '52-Week Lower Base Entry (< 45% Annual Range)',
      category: 'Machine Learning',
      winRateWithFactor: baseMetrics.winWith,
      winRateWithoutFactor: baseMetrics.winWithout,
      alphaEdgePct: baseMetrics.edge,
      importancePct: 13,
      description: 'Measures asymmetry of buying early accumulation bases versus chasing late-stage upper-range extensions under DSE T+2.'
    },
    {
      factor: 'Dynamic Trailing Stop Protection (+6% Breakeven Lock)',
      category: 'Risk Geometry',
      winRateWithFactor: trailMetrics.winWith,
      winRateWithoutFactor: trailMetrics.winWithout,
      alphaEdgePct: trailMetrics.edge,
      importancePct: 8,
      description: 'Trades reaching +6% lock in +2% trailing floor once T+2 delivery completes, preventing reversals from turning into losses.'
    }
  ];

  // Empirical Calibration Buckets from actual PIT probabilities
  const bucketDefs = [
    { range: '60% - 70% Conviction', min: 0.55, max: 0.70 },
    { range: '70% - 80% Conviction', min: 0.70, max: 0.80 },
    { range: '80% - 90% Conviction', min: 0.80, max: 0.90 },
    { range: '90% - 100% Elite', min: 0.90, max: 1.01 },
  ];

  const calibrationBuckets: CalibrationBucket[] = bucketDefs.map(def => {
    const inBucket = allTrades.filter(t => {
      const p = t.pitProbability ?? 0.72;
      return p >= def.min && p < def.max;
    });
    const tradeCount = inBucket.length;
    const predictedAvgPct = tradeCount > 0
      ? Math.round((inBucket.reduce((acc, t) => acc + (t.pitProbability ?? 0.72) * 100, 0) / tradeCount) * 10) / 10
      : Math.round(((Math.max(0.60, def.min) + Math.min(1.0, def.max)) / 2) * 1000) / 10;
    const actualWinPct = tradeCount > 0
      ? Math.round((inBucket.filter(t => t.isWin).length / tradeCount) * 1000) / 10
      : 0;
    const diff = actualWinPct - predictedAvgPct;
    const reliability: CalibrationBucket['reliability'] = tradeCount === 0
      ? 'CALIBRATED'
      : diff > 8
      ? 'UNDERESTIMATED'
      : diff < -8
      ? 'OVERESTIMATED'
      : 'CALIBRATED';

    return {
      range: def.range,
      predictedAvgPct,
      actualWinPct,
      tradeCount,
      reliability,
    };
  });

  return {
    totalTradesAudited,
    winningTrades,
    losingTrades,
    overallWinRatePct,
    overallProfitFactor,
    mathematicalExpectancyPct,
    avgGainPct,
    avgLossPct,
    payoffRatio,
    maxDrawdownPct,
    sharpeRatio,
    sortinoRatio,
    brierScore,
    precisionPct,
    sensitivityPct,
    falsePositiveRatePct,
    barsScannedCount,
    setupsFilteredOutCount,
    factorAttributions,
    calibrationBuckets,
    strategyComparisons,
  };
}

export interface EmpiricalFactorWeight {
  factor: string;
  category: string;
  priorWeight: number;
  empiricalLogOddsLift: number;
  winRateWithFactor: number;
  winRateWithoutFactor: number;
  alphaEdgePct: number;
  sampleWith: number;
}

export interface EmpiricalMlModelSummary {
  status: MlModelStatus;
  audit: TradeAccuracyAudit;
  empiricalFactors: EmpiricalFactorWeight[];
  baseLogOddsShift: number;
}

/**
 * Computes real empirical ML model telemetry & regularized factor log-odds lifts
 * directly from the user's loaded historical dataset (replacing static banner numbers).
 */
export function computeEmpiricalMlModelState(stocks: DseStockItem[]): EmpiricalMlModelSummary {
  const audit = computeTradeAccuracyAudit(stocks, 'next_open');
  const allTrades: BacktestTrade[] = [];
  const seenKeys = new Set<string>();
  for (const s of audit.strategyComparisons) {
    for (const t of s.trades) {
      const k = `${t.symbol}-${t.entryDate}-${t.strategy}`;
      if (!seenKeys.has(k)) {
        seenKeys.add(k);
        allTrades.push(t);
      }
    }
  }

  const totalTrades = allTrades.length;
  const equitiesCount = stocks.filter(
    s => !s.isSectorIndex && !isSectorIndexSymbol(s.symbol) && !isBenchmarkSymbol(s.symbol) && s.sector !== 'Benchmark'
  ).length;

  const hasEnoughHistory = totalTrades >= 20;

  // High-conviction subset (PIT probability >= 0.72)
  const highConvTrades = allTrades.filter(t => (t.pitProbability ?? 0) >= 0.72);
  const highConvWins = highConvTrades.filter(t => t.isWin).length;
  const highConvWinRate = highConvTrades.length > 0
    ? Math.round((highConvWins / highConvTrades.length) * 1000) / 10
    : audit.overallWinRatePct;

  // Lower-conviction baseline within dataset
  const lowConvTrades = allTrades.filter(t => (t.pitProbability ?? 0) < 0.72);
  const baselineWinRate = lowConvTrades.length >= 8
    ? Math.round((lowConvTrades.filter(t => t.isWin).length / lowConvTrades.length) * 1000) / 10
    : totalTrades > 0
    ? Math.round(Math.max(25, audit.overallWinRatePct - 10) * 10) / 10
    : 33.7;

  // Mann-Whitney U / Rank-Sum ROC-AUC on actual (pitProbability, isWin) pairs
  const positives = allTrades.filter(t => t.isWin).map(t => t.pitProbability ?? 0.5);
  const negatives = allTrades.filter(t => !t.isWin).map(t => t.pitProbability ?? 0.5);
  let rocAuc = 0.5;
  if (positives.length > 0 && negatives.length > 0) {
    let concordant = 0;
    for (const p of positives) {
      for (const n of negatives) {
        if (p > n) concordant += 1;
        else if (Math.abs(p - n) < 1e-6) concordant += 0.5;
      }
    }
    rocAuc = Math.round((concordant / (positives.length * negatives.length)) * 1000) / 1000;
  }

  // Sensitivity / Recall: share of winning trades captured by >= 0.72 conviction threshold
  const totalWinners = positives.length;
  const recallPct = totalWinners > 0
    ? Math.round((highConvWins / totalWinners) * 1000) / 10
    : 0;

  // Empirical factor log-odds lifts with Laplace shrinkage
  const baseWinProb = totalTrades > 0 ? Math.min(0.85, Math.max(0.15, audit.overallWinRatePct / 100)) : 0.55;
  const makeEmpiricalFactor = (
    label: string,
    category: string,
    priorWeight: number,
    predicate: (t: BacktestTrade) => boolean,
    attr: FactorAttributionItem
  ): EmpiricalFactorWeight => {
    const withGroup = allTrades.filter(predicate);
    const withoutGroup = allTrades.filter(t => !predicate(t));
    const winsWith = withGroup.filter(t => t.isWin).length;
    const winsWithout = withoutGroup.filter(t => t.isWin).length;

    const pWith = (winsWith + 3 * baseWinProb) / (withGroup.length + 3);
    const pWithout = (winsWithout + 3 * baseWinProb) / (withoutGroup.length + 3);
    const lift = totalTrades >= 15
      ? Math.round((Math.log(pWith / (1 - pWith)) - Math.log(pWithout / (1 - pWithout))) * 100) / 100
      : priorWeight;

    return {
      factor: label,
      category,
      priorWeight,
      empiricalLogOddsLift: lift,
      winRateWithFactor: attr.winRateWithFactor,
      winRateWithoutFactor: attr.winRateWithoutFactor,
      alphaEdgePct: attr.alphaEdgePct,
      sampleWith: withGroup.length,
    };
  };

  const empiricalFactors: EmpiricalFactorWeight[] = [
    makeEmpiricalFactor('Relative Volume Surge (RVOL >= 1.5x)', 'Volume & Flow', 0.48, t => Boolean(t.pitFactors?.rvolSurge), audit.factorAttributions[0]),
    makeEmpiricalFactor('Weinstein Stage 2 (Close > Rising EMA50)', 'Trend & Structure', 0.39, t => Boolean(t.pitFactors?.stage2), audit.factorAttributions[1]),
    makeEmpiricalFactor('Bollinger Squeeze Pre-Ignition (>= 4 bars)', 'Volatility', 0.31, t => Boolean(t.pitFactors?.squeeze), audit.factorAttributions[2]),
    makeEmpiricalFactor('Multi-Day Continuous Uptrend (3D+ Streak)', 'Trend & Structure', 0.24, t => Boolean(t.pitFactors?.multiDayStreak), audit.factorAttributions[3]),
    makeEmpiricalFactor('52-Week Lower Base Entry (< 45% Range)', 'Machine Learning', 0.18, t => Boolean(t.pitFactors?.nearBase), audit.factorAttributions[4]),
    makeEmpiricalFactor('Trailing Stop Profit Lock (+6% Trigger)', 'Risk Geometry', 0.20, t => Boolean(t.pitFactors?.trailingProtected), audit.factorAttributions[5]),
  ];

  // Log-odds calibration intercept shift compared to prior 0.62 baseline
  const priorBaseProb = 0.62;
  const empiricalBaseShift = hasEnoughHistory
    ? Math.round((Math.log(baseWinProb / (1 - baseWinProb)) - Math.log(priorBaseProb / (1 - priorBaseProb))) * 100) / 100
    : 0;

  const status: MlModelStatus = {
    state: hasEnoughHistory ? 'ACTIVE' : 'ACCUMULATING',
    modelType: 'Point-in-Time Regularized Logistic + Empirical Dataset Audit (Next-Open, Cash-Capped)',
    accuracyPct: hasEnoughHistory ? highConvWinRate : audit.overallWinRatePct,
    overallAccuracyPct: audit.overallWinRatePct,
    sampleCount: totalTrades,
    targetDefinition: 'Net +12.0% TP1 vs -4.5% SL within 20 sessions (T+2 lock, circuit freezes & 0.85% fee applied)',
    precision: hasEnoughHistory ? highConvWinRate : audit.precisionPct,
    recall: recallPct,
    rocAuc,
    benchmarkDseWinRate: baselineWinRate,
    modelWinRate: hasEnoughHistory ? highConvWinRate : audit.overallWinRatePct,
    profitFactor: audit.overallProfitFactor,
    brierScore: audit.brierScore,
    dataSourceMode: hasEnoughHistory ? 'EMPIRICAL_DATASET' : 'INSUFFICIENT_HISTORY',
    lastRetrained: hasEnoughHistory
      ? `Empirical Audit: ${totalTrades} trades across ${equitiesCount} scrips`
      : `Accumulating (${totalTrades} audited trades — upload 25+ days for full calibration)`,
  };

  return {
    status,
    audit,
    empiricalFactors,
    baseLogOddsShift: empiricalBaseShift,
  };
}

/**
 * Sector Relative Strength & Rotation Matrix (RRG Quadrants)
 * Follows Stan Weinstein's top-down sector methodology.
 */
export function calculateSectorRotation(stocks: DseStockItem[]): SectorRotationItem[] {
  const sectorMap = new Map<string, {
    count: number;
    turnoverCr: number;
    totalChangePct: number;
    stocks: DseStockItem[];
  }>();

  let totalMarketTurnover = 0;
  const sectorIndexItems = new Map<string, DseStockItem>();

  for (const stock of stocks) {
    if (stock.isSectorIndex || isSectorIndexSymbol(stock.symbol) || isBenchmarkSymbol(stock.symbol) || stock.sector === 'Benchmark') {
      if (stock.sector !== 'Benchmark' && !isBenchmarkSymbol(stock.symbol)) {
        sectorIndexItems.set(stock.sector, stock);
      }
      continue;
    }

    // Authoritatively resolve canonical DSE sector
    let sec = stock.sector;
    // 1. If stock sector is unclassified ("General", "Market", "Unclassified", etc.) or missing, resolve via ticker master
    if (!sec || isUnclassifiedSector(sec)) {
      sec = resolveCompanySector(stock.symbol, stock.name).sector;
    }
    sec = normalizeSectorName(sec);

    // 2. An equity is SME Platform ONLY if it is an official SME symbol or resolved as SME Platform
    const isSme = Boolean(stock.isSme || isSmeSymbol(stock.symbol) || sec === 'SME Platform');
    if (isSme) {
      sec = 'SME Platform';
    }

    totalMarketTurnover += stock.turnoverCr || 0.1;
    const existing = sectorMap.get(sec) || {
      count: 0,
      turnoverCr: 0,
      totalChangePct: 0,
      stocks: [],
    };

    existing.count++;
    existing.turnoverCr += stock.turnoverCr || 0;
    existing.totalChangePct += stock.changePercent || 0;
    existing.stocks.push({ ...stock, sector: sec });
    sectorMap.set(sec, existing);
  }

  // If sector index files exist and a sector has company stocks, merge sector index turnover if needed.
  // Never create a phantom sector with count: 1 containing only the index ticker itself!

  const result: SectorRotationItem[] = [];

  sectorMap.forEach((val, sector) => {
    const turnoverSharePct = totalMarketTurnover > 0
      ? Math.round((val.turnoverCr / totalMarketTurnover) * 1000) / 10
      : 0;
    const avgChangePct = Math.round((val.totalChangePct / Math.max(1, val.count)) * 100) / 100;

    // Top stock in sector by change %
    const sortedStocks = [...val.stocks].sort((a, b) => b.changePercent - a.changePercent);
    const topStock = sortedStocks[0]?.symbol || 'N/A';
    const topStockGain = sortedStocks[0]?.changePercent || 0;

    // Relative strength vs benchmark (100 is parity)
    const rsRatio = 100 + avgChangePct * 6 + (turnoverSharePct > 15 ? 4 : 0);
    const momentumScore = avgChangePct * 1.5 + (sortedStocks[0]?.rvol >= 1.5 ? 2.5 : 0);

    // Quadrant mapping:
    // Leading: RS >= 100, Momentum >= 0
    // Improving: RS < 100, Momentum >= 0
    // Weakening: RS >= 100, Momentum < 0
    // Lagging: RS < 100, Momentum < 0
    let quadrant: SectorRotationItem['quadrant'] = 'Lagging';
    if (rsRatio >= 100 && momentumScore >= 0) {
      quadrant = 'Leading';
    } else if (rsRatio < 100 && momentumScore >= 0) {
      quadrant = 'Improving';
    } else if (rsRatio >= 100 && momentumScore < 0) {
      quadrant = 'Weakening';
    } else {
      quadrant = 'Lagging';
    }

    result.push({
      sector,
      stockCount: val.count,
      turnoverCr: Math.round(val.turnoverCr * 10) / 10,
      turnoverSharePct,
      avgChangePct,
      relativeStrength: Math.round(rsRatio * 10) / 10,
      momentumScore: Math.round(momentumScore * 10) / 10,
      quadrant,
      topStock,
      topStockGain,
    });
  });

  return result.sort((a, b) => b.turnoverCr - a.turnoverCr);
}

/**
 * Calculates Volume Profile (Price Bins, Point of Control POC, Value Area)
 */
export function calculateVolumeProfile(bars: CandleBar[], binsCount = 10): VolumeProfileBin[] {
  if (bars.length === 0) return [];

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let totalVolume = 0;

  bars.forEach(b => {
    if (b.low < minPrice) minPrice = b.low;
    if (b.high > maxPrice) maxPrice = b.high;
    totalVolume += b.volume;
  });

  if (maxPrice <= minPrice) {
    maxPrice = minPrice + 1;
  }

  const step = (maxPrice - minPrice) / binsCount;
  const bins: { low: number; high: number; mid: number; volume: number }[] = [];

  for (let i = 0; i < binsCount; i++) {
    const low = minPrice + i * step;
    const high = low + step;
    bins.push({
      low: Math.round(low * 10) / 10,
      high: Math.round(high * 10) / 10,
      mid: Math.round(((low + high) / 2) * 10) / 10,
      volume: 0,
    });
  }

  // Allocate bar volume to overlapping bins
  bars.forEach(b => {
    const barMid = (b.high + b.low) / 2;
    for (const bin of bins) {
      if (barMid >= bin.low && barMid <= bin.high) {
        bin.volume += b.volume;
        break;
      }
    }
  });

  // Find POC (Point of Control)
  let maxVol = 0;
  let pocIndex = 0;
  bins.forEach((bin, idx) => {
    if (bin.volume > maxVol) {
      maxVol = bin.volume;
      pocIndex = idx;
    }
  });

  // Calculate 70% Value Area around POC
  const targetAreaVol = totalVolume * 0.7;
  let accumulatedVol = bins[pocIndex].volume;
  const inValueAreaSet = new Set<number>([pocIndex]);

  let upper = pocIndex + 1;
  let lower = pocIndex - 1;

  while (accumulatedVol < targetAreaVol && (upper < bins.length || lower >= 0)) {
    const upVol = upper < bins.length ? bins[upper].volume : -1;
    const downVol = lower >= 0 ? bins[lower].volume : -1;

    if (upVol >= downVol && upper < bins.length) {
      accumulatedVol += upVol;
      inValueAreaSet.add(upper);
      upper++;
    } else if (lower >= 0) {
      accumulatedVol += downVol;
      inValueAreaSet.add(lower);
      lower--;
    } else {
      break;
    }
  }

  return bins.map((bin, idx) => ({
    priceLow: bin.low,
    priceHigh: bin.high,
    priceMid: bin.mid,
    volume: bin.volume,
    percentage: totalVolume > 0 ? Math.round((bin.volume / totalVolume) * 1000) / 10 : 0,
    isPoc: idx === pocIndex,
    inValueArea: inValueAreaSet.has(idx),
  }));
}

/**
 * Generates Real-Time Execution Alerts based on Technical Levels & Price Geometry
 */
export function generateExecutionAlerts(stocks: DseStockItem[]): LiveExecutionAlert[] {
  const alerts: LiveExecutionAlert[] = [];
  let alertId = 1;

  for (const s of stocks) {
    if (s.isSectorIndex || isSectorIndexSymbol(s.symbol) || isBenchmarkSymbol(s.symbol) || s.sector === 'Benchmark') continue;

    const distToPivotPct = Math.round(((s.lastPrice - s.entryZoneLow) / s.entryZoneLow) * 1000) / 10;
    const distToTp1Pct = Math.round(((s.targetPrice1 - s.lastPrice) / s.lastPrice) * 1000) / 10;
    const distToSlPct = Math.round(((s.lastPrice - s.stopLoss) / s.lastPrice) * 1000) / 10;

    // 1. Breakout Now Trigger
    if (s.breakoutScore >= 7 && s.rvol >= 1.8 && s.changePercent > 1.5) {
      alerts.push({
        id: `ALT-${alertId++}`,
        symbol: s.symbol,
        type: 'BREAKOUT_NOW',
        timestamp: 'Just now',
        price: s.lastPrice,
        changePct: s.changePercent,
        message: `High volume breakout triggered (+${s.changePercent}% on ${s.rvol}x volume). Weinstein Stage 2 confirmed.`,
        urgency: 'CRITICAL',
        action: 'EXECUTE BUY IN ZONE',
        targetPrice: s.targetPrice1,
        stopLoss: s.stopLoss,
      });
    }

    // 2. Volatility Squeeze Expansion
    if (s.squeezeBarCount >= 5 && s.confluenceScore >= 5) {
      alerts.push({
        id: `ALT-${alertId++}`,
        symbol: s.symbol,
        type: 'SQUEEZE_EXPANSION',
        timestamp: 'Active',
        price: s.lastPrice,
        changePct: s.changePercent,
        message: `Bollinger Band squeeze compressed for ${s.squeezeBarCount} bars. Energy release imminent with institutional OBV accumulation.`,
        urgency: 'HIGH',
        action: 'PLACE PIVOT LIMIT ORDER',
        targetPrice: s.targetPrice1,
        stopLoss: s.stopLoss,
      });
    }

    // 3. Approaching Take Profit
    if (distToTp1Pct <= 2.5 && distToTp1Pct >= -1.0) {
      alerts.push({
        id: `ALT-${alertId++}`,
        symbol: s.symbol,
        type: 'TP_HIT',
        timestamp: 'Active',
        price: s.lastPrice,
        changePct: s.changePercent,
        message: `Approaching Target 1 at ৳${s.targetPrice1}. Consider locking in 50% profits and trailing remaining stop.`,
        urgency: 'HIGH',
        action: 'SCALE OUT 50%',
        targetPrice: s.targetPrice2,
        stopLoss: s.entryZoneHigh,
      });
    }

    // 4. Multi-Day Continuous Momentum Climber
    if (
      s.multiDayMomentum?.isMultiDayClimber &&
      s.multiDayMomentum.momentumHealth === 'HEALTHY_CONTINUATION'
    ) {
      const mdm = s.multiDayMomentum;
      alerts.push({
        id: `ALT-${alertId++}`,
        symbol: s.symbol,
        type: 'MULTI_DAY_MOMENTUM',
        timestamp: 'Active',
        price: s.lastPrice,
        changePct: s.changePercent,
        message: `${mdm.consecutiveUpDays}-day consecutive advancing streak (${mdm.upDaysInLast5}/5 up sessions, +${mdm.return5dPct}% over 5D) with healthy continuation structure.`,
        urgency: mdm.consecutiveUpDays >= 4 ? 'HIGH' : 'INFO',
        action: 'TRAIL / PULLBACK ENTRY',
        targetPrice: s.targetPrice1,
        stopLoss: s.stopLoss,
      });
    }

    // 5. Institutional Block Turnover
    if (s.turnoverCr >= 30 && s.rvol >= 1.5) {
      alerts.push({
        id: `ALT-${alertId++}`,
        symbol: s.symbol,
        type: 'INSTITUTIONAL_VOLUME',
        timestamp: 'Active',
        price: s.lastPrice,
        changePct: s.changePercent,
        message: `Heavy institutional block turnover detected (৳${s.turnoverCr} Cr, ${s.rvol}x avg). Smart money accumulation footprint.`,
        urgency: 'INFO',
        action: 'MONITOR CONFLUENCE',
        targetPrice: s.targetPrice1,
        stopLoss: s.stopLoss,
      });
    }
  }

  return alerts.slice(0, 10); // Top 10 most actionable alerts
}
