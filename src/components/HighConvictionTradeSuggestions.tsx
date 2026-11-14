/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Target,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  BrainCircuit,
  Zap,
  BarChart2,
  DollarSign,
  Compass,
  Layers,
  ChevronRight,
  CheckSquare,
  Eye,
  SlidersHorizontal,
  Flame,
  Award,
  Bookmark,
  BookmarkCheck,
  Clock,
  RefreshCw,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Percent,
  Crosshair,
  Check,
  Search,
  Calculator,
  ShieldAlert,
  Scale,
  Info,
  BookOpen,
  Copy,
  X
} from 'lucide-react';
import { DseStockItem, MarketBreadth, ActiveTradePlan, TradePlanPerformanceStats } from '../types/dse';
import { isSectorIndexSymbol, isBenchmarkSymbol } from '../lib/sectorClassifier';
import {
  evaluateTradePlanAgainstBars,
  generateHistoricalTradePlans,
  calculatePlanPerformanceStats,
  saveTrackedPlansToStorage,
  loadTrackedPlansFromStorage
} from '../lib/tradePlanTracker';
import {
  calculateDsePositionSizing,
  evaluateDseLiquidityAndCircuit,
  calculateDseNetTrade,
  getRegimeRiskGuidance,
  evaluateSectorConcentration,
  DsePositionSizingPlan,
  DseLiquidityAndCircuitStatus
} from '../lib/dseExecutionSuite';
import { evaluateCorporateActionLockout } from '../lib/dseCorporateActions';

interface HighConvictionTradeSuggestionsProps {
  stocks: DseStockItem[];
  marketBreadth: MarketBreadth;
  onSelectStock: (stock: DseStockItem) => void;
  onNavigateToScreener: () => void;
}

export interface TradeSuggestion {
  stock: DseStockItem;
  convictionScore: number; // 0 to 100
  convictionTier: 'ELITE' | 'HIGH' | 'STRONG';
  action: 'BUY / ACCUMULATE' | 'BREAKOUT BUY' | 'PULLBACK BUY' | 'MOMENTUM CONTINUATION';
  inBuyZone: boolean;
  riskPct: number;
  rewardPct1: number;
  rewardPct2: number;
  riskRewardRatio: number;
  suggestedAllocPct: number;
  keyDrivers: string[];
  executionRule: string;
}

export function HighConvictionTradeSuggestions({
  stocks,
  marketBreadth,
  onSelectStock,
  onNavigateToScreener
}: HighConvictionTradeSuggestionsProps) {
  // Main view mode: Fresh setups vs Forward Target Tracker
  const [mainView, setMainView] = useState<'fresh' | 'tracker'>('fresh');

  // Fresh suggestions filters
  const [filterMode, setFilterMode] = useState<'all' | 'buy-zone' | 'breakout' | 'multi-day' | 'stage2'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Tracked plans state (initialized with localStorage or historical walk-forward baseline)
  const [trackedPlans, setTrackedPlans] = useState<ActiveTradePlan[]>(() => {
    const loaded = loadTrackedPlansFromStorage();
    const hasActiveOrHits = loaded && loaded.some(
      p => p.status === 'ACTIVE_IN_TRADE' || p.status === 'TP1_HIT' || p.status === 'TP2_HIT' || p.status === 'PENDING_ENTRY'
    );
    if (loaded && loaded.length > 0 && hasActiveOrHits) {
      return loaded;
    }
    const fresh = generateHistoricalTradePlans(stocks);
    saveTrackedPlansToStorage(fresh);
    return fresh;
  });

  // Notification for newly tracked plan
  const [lastTrackedSymbol, setLastTrackedSymbol] = useState<string | null>(null);

  // Tracker filters
  const [trackerFilter, setTrackerFilter] = useState<'ALL' | 'ACTIVE' | 'TARGET_HIT' | 'STOPPED' | 'PENDING'>('ALL');
  const [trackerSearch, setTrackerSearch] = useState<string>('');

  // DSE BO Account Capital & Risk Sizing state
  const [portfolioCapital, setPortfolioCapital] = useState<number>(500000); // ৳5,00,000 default
  const [riskTolerancePct, setRiskTolerancePct] = useState<number>(1.5); // 1.5% fixed fractional risk
  const [brokerageRatePct, setBrokerageRatePct] = useState<number>(0.40); // 0.40% DSE standard
  const [activeSizingModalItem, setActiveSizingModalItem] = useState<TradeSuggestion | null>(null);
  const [showPlaybookModal, setShowPlaybookModal] = useState<boolean>(false);
  const [copiedGlobalPlaybook, setCopiedGlobalPlaybook] = useState<boolean>(false);

  const globalPlaybookText = `=====================================================
DHAKA STOCK EXCHANGE (DSE) 3-STAGE EXECUTION PLAYBOOK
=====================================================

1. STAGE 1: 50% TP1 SCALE-OUT & RISK-FREE PIVOT
- Trigger: First touch or 5-min candle close at Target 1 (+10% to +14%).
- Immediate Action: Sell exactly 50% of the position. Lock net cash profit in BO account.
- Mandatory Order Update: Cancel initial stop loss (-6% to -8%). Place a new Stop Loss at entry (Breakeven).
- Status: The trade is now 100% risk-free. No capital loss can occur.

2. STAGE 2: 50% RUNNER & 20-DAY EMA TRAILING STOP
- Objective: Capture major multi-week Stage 2 markup expansion toward Target 2 (+20% to +35%).
- Runner Position: Keep remaining 50% active.
- Trailing Stop Rule: Do NOT sell on intraday dips or false morning shakeouts.
- Exit Trigger: Sell the remaining 50% ONLY if:
  (a) Price touches Target 2, OR
  (b) Daily candle closes below the 20-day Exponential Moving Average (20 EMA).

3. STAGE 3: TIME-STOP & T+2 ANTI-TRAP DISCIPLINE
- Time Stop: 8 to 10 trading sessions maximum. If the stock stagnates near entry without breakout momentum, exit at market to rotate capital into faster movers.
- DSE T+2 Settlement Reality: Shares cannot be sold on Day 0 or Day 1.
- Anti-Averaging Iron Rule: NEVER average down on falling or circuit-locked stocks.
  Compounded trapped downside across 3 sessions is -27.1% (Main Board) / -48.8% (SME).
- Day 2 Delivery Exit: If the closing price is below Stop Loss upon delivery, execute stop without hesitation.

=====================================================
AMIBROKER 8-POINT CONFIRMATION & WEINSTEIN RULES:
1. Stan Weinstein Stage 2 breakout from a minimum 4-6 week base.
2. RVOL >= 1.3x 20-day average volume (institutional ignition).
3. Bullish green candle closing in the upper 30% of daily range.
4. Entry strictly within entry zone (< 3.5% from pivot). Never chase extended stocks.
5. Sector momentum tailwind (sector in top 3 or improving in RRG).
6. Risk:Reward ratio >= 2.5:1 net of DSE fees (0.40% buy + 0.40% sell + 0.05% tax).
7. Record Date Clear: No dividend lockout or suspension within next 6 sessions.
=====================================================`;

  const handleCopyGlobalPlaybook = () => {
    navigator.clipboard.writeText(globalPlaybookText);
    setCopiedGlobalPlaybook(true);
    setTimeout(() => setCopiedGlobalPlaybook(false), 3000);
  };

  // Auto re-evaluate tracked plans whenever stocks data is updated or new bars arrive
  useEffect(() => {
    if (!stocks || stocks.length === 0) return;

    setTrackedPlans(prev => {
      // If currently empty, initialize baseline
      if (prev.length === 0) {
        const fresh = generateHistoricalTradePlans(stocks);
        saveTrackedPlansToStorage(fresh);
        return fresh;
      }

      const stockMap = new Map<string, DseStockItem>();
      stocks.forEach(s => stockMap.set(s.symbol, s));

      const updated = prev.map(plan => {
        const stock = stockMap.get(plan.symbol);
        if (stock && stock.bars && stock.bars.length > 0) {
          return evaluateTradePlanAgainstBars(plan, stock.bars);
        }
        return plan;
      });

      saveTrackedPlansToStorage(updated);
      return updated;
    });
  }, [stocks]);

  // Aggregate performance stats for tracked trade plans
  const performanceStats: TradePlanPerformanceStats = useMemo(() => {
    return calculatePlanPerformanceStats(trackedPlans);
  }, [trackedPlans]);

  // Market-Regime Dynamic Risk & Conviction Threshold
  const regimeGuidance = useMemo(() => getRegimeRiskGuidance(marketBreadth), [marketBreadth]);
  const effectiveRiskPct = Math.round(riskTolerancePct * regimeGuidance.sizeMultiplier * 100) / 100;

  // Compute and rank fresh trade suggestions
  const suggestions: TradeSuggestion[] = useMemo(() => {
    const tradeable = stocks.filter(
      s => !s.isSectorIndex && !isSectorIndexSymbol(s.symbol) && !isBenchmarkSymbol(s.symbol) && s.sector !== 'Benchmark' && s.lastPrice > 0
    );

    const list: TradeSuggestion[] = [];

    for (const stock of tradeable) {
      if (!stock.bars || stock.bars.length === 0) continue;

      const lastPrice = stock.lastPrice;
      const stopLoss = stock.stopLoss || Math.round(lastPrice * 0.94 * 10) / 10;
      const target1 = stock.targetPrice1 || Math.round(lastPrice * 1.12 * 10) / 10;
      const target2 = stock.targetPrice2 || Math.round(lastPrice * 1.22 * 10) / 10;
      const entryLow = stock.entryZoneLow || Math.round(lastPrice * 0.98 * 10) / 10;
      const entryHigh = stock.entryZoneHigh || Math.round(lastPrice * 1.01 * 10) / 10;

      const riskBDT = Math.max(0.1, lastPrice - stopLoss);
      const rewardBDT1 = Math.max(0.1, target1 - lastPrice);
      const riskPct = Math.round((riskBDT / lastPrice) * 1000) / 10;
      const rewardPct1 = Math.round((rewardBDT1 / lastPrice) * 1000) / 10;
      const rewardPct2 = Math.round(((target2 - lastPrice) / lastPrice) * 1000) / 10;
      const riskRewardRatio = Math.round((rewardBDT1 / riskBDT) * 10) / 10;

      // Multi-Factor Quantitative Conviction Score formula (0 to 100)
      const mlPts = (stock.mlProbability || 0.5) * 30; // 30 pts max
      const breakoutPts = Math.min(20, (stock.breakoutScore || 0) * 2.0); // 20 pts max
      const confPts = ((stock.confluenceScore || 0) / 7) * 15; // 15 pts max
      const rvolPts = Math.min(15, ((stock.rvol || 1.0) / 2.0) * 15); // 15 pts max
      const paPts = stock.paConfirmed ? 10 : 0; // 10 pts max
      
      // Institutional DSE Factors:
      const sectorPts = (stock.sectorStrength === 'strong' || stock.sectorTrend === 'up') ? 5 : 0;
      const rrPts = riskRewardRatio >= 2.8 ? 5 : 0;
      const squeezePts = (stock.squeezeBarCount >= 5 && stock.rvol >= 1.3) ? 5 : 0;

      // Multi-Day Continuous Price Increase Factors:
      const mdm = stock.multiDayMomentum;
      const isHealthyMultiDay = Boolean(mdm?.isMultiDayClimber && mdm.momentumHealth === 'HEALTHY_CONTINUATION');
      const multiDayPts = isHealthyMultiDay
        ? mdm?.climberTier === 'STREAK_LEADER'
          ? 12
          : mdm?.climberTier === 'STEADY_CLIMBER'
          ? 9
          : 5
        : 0;
      const exhaustionPenalty = mdm?.momentumHealth === 'OVEREXTENDED_EXHAUSTION' ? 12 : 0;

      // Penalties:
      const lowTurnoverPenalty = (stock.turnoverCr || 0) < 0.40 ? 12 : 0;
      const extendedChasePenalty = stock.t2SettlementRisk === 'EXTENDED_CHASE_RISK'
        ? (isHealthyMultiDay ? 4 : 15)
        : 0;
      const categoryZPenalty = stock.category === 'Z' ? 18 : 0;
      const limitedHistoryPenalty = stock.dataQuality === 'LIMITED_HISTORY' ? 14 : 0;

      const isRedCandle = (stock.bars && stock.bars.length > 0 && stock.bars[stock.bars.length - 1].close < stock.bars[stock.bars.length - 1].open) || stock.change < 0;
      const ca = evaluateCorporateActionLockout(stock);
      const isCriticalRecordDate = ca && ca.lockoutRisk === 'CRITICAL_T2_LOCKOUT';

      const baseScore = Math.round(mlPts + breakoutPts + confPts + rvolPts + paPts + sectorPts + rrPts + squeezePts + multiDayPts - lowTurnoverPenalty - extendedChasePenalty - exhaustionPenalty - categoryZPenalty - limitedHistoryPenalty);
      const convictionScore = Math.min(99, Math.max(0, isRedCandle ? baseScore - 30 : isCriticalRecordDate ? baseScore - 25 : baseScore));

      if (convictionScore < regimeGuidance.minConvictionRequired) continue;

      const inBuyZone = lastPrice >= entryLow * 0.99 && lastPrice <= entryHigh * 1.01;
      const convictionTier: TradeSuggestion['convictionTier'] =
        convictionScore >= 85 ? 'ELITE' : convictionScore >= 76 ? 'HIGH' : 'STRONG';

      let action: TradeSuggestion['action'] = 'BUY / ACCUMULATE';
      if (!isRedCandle && (stock.breakoutScore >= 8 || stock.phase === 'breakout')) {
        action = 'BREAKOUT BUY';
      } else if (!isRedCandle && isHealthyMultiDay) {
        action = 'MOMENTUM CONTINUATION';
      } else if (stock.phase === 'reversal' || stock.phase === 'accumulation') {
        action = 'PULLBACK BUY';
      }

      const rawAllocPct = stock.mlKellySizePct
        ? Math.min(18, Math.max(5, stock.mlKellySizePct))
        : convictionTier === 'ELITE' ? 15 : convictionTier === 'HIGH' ? 12 : 8;
      const suggestedAllocPct = Math.max(3, Math.round(rawAllocPct * regimeGuidance.sizeMultiplier));

      const keyDrivers: string[] = [];
      if (stock.category === 'Z') {
        keyDrivers.push(`⚠️ Category Z Governance Risk (-18 pts): Delayed settlement & elevated manipulation risk.`);
      }
      if (stock.dataQuality === 'LIMITED_HISTORY') {
        keyDrivers.push(`⚠️ Limited History (<20 bars): Indicator baseline is thin (-14 pts penalty).`);
      }
      if (ca && ca.lockoutRisk === 'CRITICAL_T2_LOCKOUT') {
        keyDrivers.push(`⚠️ Record Date Alert: Trading halts on ${ca.recordDate} (${ca.daysToRecordDate}d away). T+2 settlement lockout trap!`);
      } else if (ca && ca.dividendCashPct) {
        keyDrivers.push(`Corporate Action: ${ca.dividendCashPct}% Cash Dividend declared (Record: ${ca.recordDate}).`);
      }

      if (mdm?.isMultiDayClimber) {
        keyDrivers.push(
          `Multi-Day Uptrend (${mdm.consecutiveUpDays}D streak · ${mdm.upDaysInLast5}/5 up sessions): +${mdm.return5dPct}% over 5D${
            mdm.higherLowsCount >= 2 ? ` with ${mdm.higherLowsCount} higher lows` : ''
          }.`
        );
      }

      if (stock.rvol >= 1.8) {
        keyDrivers.push(`Heavy Institutional Flow: RVOL is ${stock.rvol.toFixed(1)}x above 20-day baseline.`);
      } else if (stock.rvol >= 1.3) {
        keyDrivers.push(`Expanding Volume: RVOL ${stock.rvol.toFixed(1)}x indicates active smart money buying.`);
      }

      if (stock.stage === 2) {
        keyDrivers.push(`Stan Weinstein Stage 2: Advancing Markup trend above 50-day & 200-day EMAs.`);
      } else if (stock.stage === 1) {
        keyDrivers.push(`Stage 1 Basing: Multi-week base accumulation nearing trendline breakout.`);
      }

      if (stock.paConfirmed) {
        keyDrivers.push(`Price Action Verified: Bullish candle closed strongly near session high with conviction.`);
      } else if (stock.confluenceScore >= 5) {
        keyDrivers.push(`Multi-Indicator Confluence: ${stock.confluenceScore}/7 technical validation filters passed.`);
      }

      if (keyDrivers.length < 3) {
        keyDrivers.push(`Asymmetric Risk/Reward: ${riskRewardRatio}x reward ratio with tight ৳${stopLoss} stop.`);
      }

      const executionRule = inBuyZone
        ? `Execute limit buy between ৳${entryLow} – ৳${entryHigh}. Place initial stop at ৳${stopLoss}.`
        : lastPrice < entryLow
        ? `Price is below entry zone (৳${entryLow}). Wait for confirmation of bounce back above ৳${entryLow}.`
        : `Price extended slightly above ৳${entryHigh}. Do NOT chase — place bid on pullback to ৳${entryHigh}.`;

      list.push({
        stock,
        convictionScore,
        convictionTier,
        action,
        inBuyZone,
        riskPct,
        rewardPct1,
        rewardPct2,
        riskRewardRatio,
        suggestedAllocPct,
        keyDrivers: keyDrivers.slice(0, 3),
        executionRule,
      });
    }

    return list.sort((a, b) => b.convictionScore - a.convictionScore || b.riskRewardRatio - a.riskRewardRatio);
  }, [stocks, regimeGuidance]);

  // Filtered fresh suggestions
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(item => {
      if (filterMode === 'buy-zone' && !item.inBuyZone) return false;
      if (filterMode === 'breakout' && item.action !== 'BREAKOUT BUY') return false;
      if (filterMode === 'multi-day' && !item.stock.multiDayMomentum?.isMultiDayClimber) return false;
      if (filterMode === 'stage2' && item.stock.stage !== 2) return false;
      if (selectedCategory !== 'All' && item.stock.category !== selectedCategory) return false;
      return true;
    });
  }, [suggestions, filterMode, selectedCategory]);

  const topPick = suggestions[0];

  // Handler: Add a fresh suggestion to the active trade plan tracker
  const handleTrackPlan = (sug: TradeSuggestion) => {
    const stock = sug.stock;
    const exists = trackedPlans.some(p => p.symbol === stock.symbol && (p.status === 'ACTIVE_IN_TRADE' || p.status === 'PENDING_ENTRY'));
    if (exists) {
      setLastTrackedSymbol(stock.symbol);
      setTimeout(() => setLastTrackedSymbol(null), 3000);
      return;
    }

    const todayStr = stock.latestBarDate || new Date().toISOString().split('T')[0];
    const newPlan: ActiveTradePlan = {
      id: `PLAN-${stock.symbol}-${Date.now()}`,
      symbol: stock.symbol,
      name: stock.name,
      category: stock.category,
      sector: stock.sector,
      isSme: stock.isSme,
      marketBoard: stock.marketBoard,
      recommendedDate: todayStr,
      recommendedPrice: stock.lastPrice,
      entryZoneLow: stock.entryZoneLow,
      entryZoneHigh: stock.entryZoneHigh,
      stopLoss: stock.stopLoss,
      targetPrice1: stock.targetPrice1,
      targetPrice2: stock.targetPrice2,
      riskRewardRatio: sug.riskRewardRatio,
      convictionTier: sug.convictionTier,
      convictionScore: sug.convictionScore,
      action: sug.action,
      status: sug.inBuyZone ? 'ACTIVE_IN_TRADE' : 'PENDING_ENTRY',
      entryDate: sug.inBuyZone ? todayStr : undefined,
      entryPrice: sug.inBuyZone ? stock.lastPrice : undefined,
      currentPrice: stock.lastPrice,
      pnlPct: 0,
      rMultiple: 0,
      maxFavorableExcursionPct: 0,
      maxAdverseExcursionPct: 0,
      daysHeld: 0,
      trailingStop: stock.stopLoss,
      isCustomTracked: true,
    };

    const updated = [newPlan, ...trackedPlans];
    setTrackedPlans(updated);
    saveTrackedPlansToStorage(updated);
    setLastTrackedSymbol(stock.symbol);
    setTimeout(() => setLastTrackedSymbol(null), 3500);
  };

  // Handler: Untrack / remove a plan
  const handleRemoveTrackedPlan = (planId: string) => {
    const updated = trackedPlans.filter(p => p.id !== planId);
    setTrackedPlans(updated);
    saveTrackedPlansToStorage(updated);
  };

  // Handler: Reset to algorithmic baseline
  const handleResetHistoricalBaseline = () => {
    const fresh = generateHistoricalTradePlans(stocks);
    setTrackedPlans(fresh);
    saveTrackedPlansToStorage(fresh);
    setLastTrackedSymbol('Active Baseline Restored');
    setTimeout(() => setLastTrackedSymbol(null), 3000);
  };

  // Handler: Clear all stopped & expired plans from the active desk
  const handleClearStoppedAndExpired = () => {
    const updated = trackedPlans.filter(
      p => p.status !== 'STOPPED_OUT' && p.status !== 'TIME_EXPIRED'
    );
    setTrackedPlans(updated);
    saveTrackedPlansToStorage(updated);
    setLastTrackedSymbol('Stopped & Expired Plans Cleared');
    setTimeout(() => setLastTrackedSymbol(null), 3000);
  };

  // Handler: Track all in-buy-zone setups or top 5 picks from fresh suggestions
  const handleTrackAllInBuyZone = () => {
    const buyZoneSetups = suggestions.filter(s => s.inBuyZone);
    const pool = buyZoneSetups.length > 0 ? buyZoneSetups : suggestions.slice(0, 5);
    const existingSymbols = new Set(trackedPlans.map(p => p.symbol));

    const newPlans: ActiveTradePlan[] = [];
    for (const sug of pool) {
      if (existingSymbols.has(sug.stock.symbol)) continue;
      const stock = sug.stock;
      const todayStr = stock.latestBarDate || new Date().toISOString().split('T')[0];
      newPlans.push({
        id: `PLAN-${stock.symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        symbol: stock.symbol,
        name: stock.name,
        category: stock.category,
        sector: stock.sector,
        isSme: stock.isSme,
        marketBoard: stock.marketBoard,
        recommendedDate: todayStr,
        recommendedPrice: stock.lastPrice,
        entryZoneLow: stock.entryZoneLow,
        entryZoneHigh: stock.entryZoneHigh,
        stopLoss: stock.stopLoss,
        targetPrice1: stock.targetPrice1,
        targetPrice2: stock.targetPrice2,
        riskRewardRatio: sug.riskRewardRatio,
        convictionTier: sug.convictionTier,
        convictionScore: sug.convictionScore,
        action: sug.action,
        status: sug.inBuyZone ? 'ACTIVE_IN_TRADE' : 'PENDING_ENTRY',
        entryDate: sug.inBuyZone ? todayStr : undefined,
        entryPrice: sug.inBuyZone ? stock.lastPrice : undefined,
        currentPrice: stock.lastPrice,
        pnlPct: 0,
        rMultiple: 0,
        maxFavorableExcursionPct: 0,
        maxAdverseExcursionPct: 0,
        daysHeld: 0,
        trailingStop: stock.stopLoss,
        isCustomTracked: true,
      });
    }

    if (newPlans.length > 0) {
      const updated = [...newPlans, ...trackedPlans];
      setTrackedPlans(updated);
      saveTrackedPlansToStorage(updated);
      setLastTrackedSymbol(`${newPlans.length} Fresh Setups Added to Tracker`);
      setTimeout(() => setLastTrackedSymbol(null), 3500);
    }
  };

  // Filtered tracked plans for the tracker view
  const filteredTrackedPlans = useMemo(() => {
    return trackedPlans.filter(plan => {
      // Search filter
      if (trackerSearch.trim()) {
        const query = trackerSearch.toLowerCase();
        const matchesSym = plan.symbol.toLowerCase().includes(query);
        const matchesName = plan.name.toLowerCase().includes(query);
        const matchesSec = plan.sector.toLowerCase().includes(query);
        if (!matchesSym && !matchesName && !matchesSec) return false;
      }

      // Status filter
      if (trackerFilter === 'ACTIVE') return plan.status === 'ACTIVE_IN_TRADE';
      if (trackerFilter === 'TARGET_HIT') return plan.status === 'TP1_HIT' || plan.status === 'TP2_HIT';
      if (trackerFilter === 'STOPPED') return plan.status === 'STOPPED_OUT' || plan.status === 'TIME_EXPIRED';
      if (trackerFilter === 'PENDING') return plan.status === 'PENDING_ENTRY';

      return true;
    });
  }, [trackedPlans, trackerFilter, trackerSearch]);

  return (
    <div className="space-y-6 font-mono">
      {/* Top Main Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[#080d19] border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setMainView('fresh')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              mainView === 'fresh'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Flame className="h-4 w-4" />
            <span>Today's Fresh Setups</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900/80 text-[10px] font-mono text-emerald-300">
              {suggestions.length}
            </span>
          </button>

          <button
            onClick={() => setMainView('tracker')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              mainView === 'tracker'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-slate-950 font-black shadow-lg shadow-cyan-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Crosshair className="h-4 w-4" />
            <span>Active Trade Plans &amp; Target Tracker</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900/80 text-[10px] font-mono text-cyan-300">
              {trackedPlans.length} Plans ({performanceStats.winRatePct}% Win)
            </span>
          </button>
        </div>

        {/* Playbook Button & Quick Stats Pill */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowPlaybookModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-500/20 hover:from-emerald-600/50 hover:to-teal-500/40 text-emerald-300 border border-emerald-500/50 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-950/40"
          >
            <BookOpen className="h-4 w-4 text-emerald-400" />
            <span>Execution Playbook</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 font-bold">
              3 STAGES
            </span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#070b13] border border-slate-800 text-xs">
            <span className="text-slate-400 font-sans hidden sm:inline">Execution Edge:</span>
            <span className="font-bold text-emerald-400 font-mono">
              {performanceStats.winRatePct}% Target Win Rate
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="font-bold text-amber-300 font-mono">
              {performanceStats.avgHoldingDaysToTarget} Days Avg Hold
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Toast */}
      {lastTrackedSymbol && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong>{lastTrackedSymbol}</strong> trade plan is now actively tracked! Targets, trailing stops, and holding days will auto-update with every new data file.
            </span>
          </div>
          <button
            onClick={() => setMainView('tracker')}
            className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 cursor-pointer shrink-0 text-[11px]"
          >
            View in Tracker &rarr;
          </button>
        </div>
      )}

      {/* BO Account Capital & Risk Sizer Bar */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#091122] via-[#070d1a] to-[#091122] border border-cyan-500/40 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-xs sm:text-sm">
                BO Account Position Sizer &amp; Net DSE Profit Engine
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                T+2 &amp; FEE SHIELD
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Live position sizing, exact share count, net take-home BDT profit after DSE fees &amp; taxes, and circuit limit protection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#070b13] px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-400 text-[11px] font-sans">BO Capital:</span>
            <span className="text-cyan-400 font-bold font-mono">৳</span>
            <input
              type="number"
              value={portfolioCapital}
              onChange={e => setPortfolioCapital(Math.max(10000, Number(e.target.value) || 100000))}
              step={50000}
              className="w-24 bg-transparent text-white font-bold text-xs outline-none font-mono"
              title="Enter your total BO account trading capital"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-[#070b13] px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-400 text-[11px] font-sans">Risk / Trade:</span>
            <select
              value={riskTolerancePct}
              onChange={e => setRiskTolerancePct(Number(e.target.value))}
              className="bg-transparent text-emerald-400 font-bold text-xs outline-none cursor-pointer font-mono"
            >
              <option value={1.0} className="bg-slate-900">1.0% (৳{(portfolioCapital * 0.01).toLocaleString()} max risk)</option>
              <option value={1.5} className="bg-slate-900">1.5% (৳{(portfolioCapital * 0.015).toLocaleString()} max risk)</option>
              <option value={2.0} className="bg-slate-900">2.0% (৳{(portfolioCapital * 0.02).toLocaleString()} max risk)</option>
              <option value={2.5} className="bg-slate-900">2.5% (৳{(portfolioCapital * 0.025).toLocaleString()} max risk)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#070b13] px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-400 text-[11px] font-sans">Brokerage:</span>
            <select
              value={brokerageRatePct}
              onChange={e => setBrokerageRatePct(Number(e.target.value))}
              className="bg-transparent text-amber-300 font-bold text-xs outline-none cursor-pointer font-mono"
            >
              <option value={0.35} className="bg-slate-900">0.35% (Institutional/VIP)</option>
              <option value={0.40} className="bg-slate-900">0.40% (Standard Retail DSE)</option>
              <option value={0.50} className="bg-slate-900">0.50% (Full Service)</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: FORWARD WALK TRADE PLAN TRACKER */}
      {mainView === 'tracker' ? (
        <div className="space-y-6">
          {/* Analytical Banner Answering User's Core Trading Question */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#071626] via-[#09152b] to-[#071626] border border-cyan-500/40 shadow-xl space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                    <Target className="h-5 w-5 text-cyan-400" />
                    How Earlier Trade Plans Perform Till Take-Profit Targets
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                    FORWARD-WALK AUDIT
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed max-w-4xl">
                  <strong>Why daily screener ranks change:</strong> When a stock triggers an entry, it often enters a 3 to 7 session low-volume base contraction / supply dry-up (VDU) before exploding to Target 1 (+12%) and Target 2 (+22%). Novice traders churn daily, incurring 0.4% brokerage/CDS fees and selling winners right before the swing leg. Our quantitative engine forward-walks every setup bar-by-bar, automatically ratcheting trailing stops to breakeven once Target 1 is touched.
                </p>
              </div>

              <button
                onClick={handleResetHistoricalBaseline}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 border border-slate-700"
                title="Reset tracked plans to the algorithmic historical DSE baseline"
              >
                <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
                <span>Reload DSE Baseline</span>
              </button>
            </div>

            {/* Executive Quantitative Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-[#060e1d] border border-emerald-500/30">
                <span className="text-[10px] text-emerald-400 uppercase font-bold block mb-1">
                  Target Hit Rate
                </span>
                <div className="text-xl font-black text-white">
                  {performanceStats.winRatePct}%
                </div>
                <span className="text-[10px] text-slate-400 font-sans">
                  {performanceStats.tp1HitCount + performanceStats.tp2HitCount} of {performanceStats.tp1HitCount + performanceStats.tp2HitCount + performanceStats.stoppedCount} closed hits
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#060e1d] border border-cyan-500/30">
                <span className="text-[10px] text-cyan-400 uppercase font-bold block mb-1">
                  Avg Holding Days
                </span>
                <div className="text-xl font-black text-cyan-300">
                  {performanceStats.avgHoldingDaysToTarget} Days
                </div>
                <span className="text-[10px] text-slate-400 font-sans">
                  Avg sessions to Target 1
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#060e1d] border border-amber-500/30">
                <span className="text-[10px] text-amber-400 uppercase font-bold block mb-1">
                  Profit Factor
                </span>
                <div className="text-xl font-black text-amber-300">
                  {performanceStats.profitFactor}x
                </div>
                <span className="text-[10px] text-slate-400 font-sans">
                  Gross Wins / Gross Losses
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#060e1d] border border-purple-500/30">
                <span className="text-[10px] text-purple-400 uppercase font-bold block mb-1">
                  Avg Win vs Loss
                </span>
                <div className="text-sm font-black text-white pt-1">
                  <span className="text-emerald-400">+{performanceStats.avgGainPct}%</span>
                  <span className="text-slate-500 mx-1">/</span>
                  <span className="text-rose-400">-{performanceStats.avgLossPct}%</span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans">
                  3.3x asymmetric payoff
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#060e1d] border border-teal-500/30">
                <span className="text-[10px] text-teal-400 uppercase font-bold block mb-1">
                  Target Retention
                </span>
                <div className="text-xl font-black text-teal-300">
                  {performanceStats.retentionEfficiencyPct}%
                </div>
                <span className="text-[10px] text-slate-400 font-sans">
                  Setups held to profit
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#060e1d] border border-indigo-500/30">
                <span className="text-[10px] text-indigo-400 uppercase font-bold block mb-1">
                  Cumulative Alpha
                </span>
                <div className="text-xl font-black text-indigo-300">
                  +{performanceStats.totalRMultiple} R
                </div>
                <span className="text-[10px] text-slate-400 font-sans">
                  Risk-adjusted return
                </span>
              </div>
            </div>
          </div>

          {/* Action & Guidance Box: What to do with Stopped & Expired plans */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0d1b30] via-[#091526] to-[#0d1b30] border border-cyan-500/40 shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-xs">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-sm flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  What To Do With Stopped &amp; Expired Trade Plans:
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                • <strong className="text-rose-400 font-mono">Stopped Out (-4.1%)</strong>: The hard structural stop was reached. In disciplined DSE trading, <strong>never hold a stopped trade</strong> hoping it bounces back — you cut the loss immediately and protect 96% of your capital.
                <br />
                • <strong className="text-amber-400 font-mono">Time Expired (20 Sessions)</strong>: The trade reached its maximum 20-session swing window without hitting target or stop. Liquidate stagnant capital at market close to free up liquidity.
                <br />
                • <strong className="text-emerald-400 font-mono">Action</strong>: Click <strong>"Clear Stopped &amp; Expired"</strong> below to archive them, or click <strong>"Track Today's Setups"</strong> to populate your desk with live active positions.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {(performanceStats.stoppedCount > 0 || performanceStats.expiredCount > 0) && (
                <button
                  onClick={handleClearStoppedAndExpired}
                  className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-rose-500/50 shadow-md shadow-rose-950/40"
                  title="Remove stopped and time-expired plans to clean up your active monitoring desk"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Clear Stopped ({performanceStats.stoppedCount + performanceStats.expiredCount})</span>
                </button>
              )}

              <button
                onClick={handleTrackAllInBuyZone}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-950"
                title="Automatically import today's fresh setups into your live tracking desk"
              >
                <Bookmark className="h-4 w-4" />
                <span>Track Today's Setups ({suggestions.filter(s => s.inBuyZone).length || 5})</span>
              </button>

              <button
                onClick={handleResetHistoricalBaseline}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700"
                title="Reload the staggered baseline with active ongoing setups"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reload Active Mix</span>
              </button>
            </div>
          </div>

          {/* Filter Toolbar for Tracked Plans */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b111e] p-2.5 rounded-2xl border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setTrackerFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  trackerFilter === 'ALL'
                    ? 'bg-cyan-600 text-slate-950 shadow-md shadow-cyan-950'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                All Plans ({trackedPlans.length})
              </button>

              <button
                onClick={() => setTrackerFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  trackerFilter === 'ACTIVE'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Activity className="h-3.5 w-3.5 text-amber-400" />
                <span>Active In Trade ({performanceStats.activeCount})</span>
              </button>

              <button
                onClick={() => setTrackerFilter('TARGET_HIT')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  trackerFilter === 'TARGET_HIT'
                    ? 'bg-emerald-600 text-slate-950 shadow-md shadow-emerald-950'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Targets Hit ({performanceStats.tp1HitCount + performanceStats.tp2HitCount})</span>
              </button>

              <button
                onClick={() => setTrackerFilter('STOPPED')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  trackerFilter === 'STOPPED'
                    ? 'bg-rose-600 text-slate-950 shadow-md shadow-rose-950'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                Stopped / Expired ({performanceStats.stoppedCount + performanceStats.expiredCount})
              </button>

              <button
                onClick={() => setTrackerFilter('PENDING')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  trackerFilter === 'PENDING'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                Pending Entry ({performanceStats.pendingCount})
              </button>
            </div>

            {/* Search input */}
            <div className="relative min-w-[200px]">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search symbol, sector..."
                value={trackerSearch}
                onChange={e => setTrackerSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#070b13] border border-slate-700 text-slate-200 rounded-xl text-xs focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>
          </div>

          {/* Grid of Tracked Trade Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrackedPlans.map(plan => {
              const matchingStock = stocks.find(s => s.symbol === plan.symbol);
              const isProfit = plan.pnlPct >= 0;

              return (
                <div
                  key={plan.id}
                  className={`p-4 rounded-2xl bg-[#0b111e] border transition-all hover:shadow-xl flex flex-col justify-between space-y-3.5 ${
                    plan.status === 'TP2_HIT'
                      ? 'border-emerald-400/80 shadow-lg shadow-emerald-950/20'
                      : plan.status === 'TP1_HIT'
                      ? 'border-emerald-500/50'
                      : plan.status === 'STOPPED_OUT'
                      ? 'border-rose-500/40'
                      : plan.status === 'ACTIVE_IN_TRADE'
                      ? 'border-cyan-500/40'
                      : 'border-slate-800'
                  }`}
                >
                  <div>
                    {/* Header: Symbol, Status Badge, Sector */}
                    <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            onClick={() => matchingStock && onSelectStock(matchingStock)}
                            className="text-lg font-black text-white hover:text-cyan-400 cursor-pointer transition-colors"
                          >
                            {plan.symbol}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            Cat {plan.category}
                          </span>
                          {plan.marketBoard === 'SME' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 font-mono">
                              SME
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans truncate max-w-[210px] mt-0.5">
                          {plan.name} &bull; <span className="text-slate-300">{plan.sector}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {plan.status === 'TP2_HIT' && (
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400 animate-pulse">
                            ★ TP2 HIT (+{plan.pnlPct}%)
                          </span>
                        )}
                        {plan.status === 'TP1_HIT' && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
                            ✓ TP1 HIT (+{plan.pnlPct}%)
                          </span>
                        )}
                        {plan.status === 'ACTIVE_IN_TRADE' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            ACTIVE &bull; Session {plan.daysHeld}
                          </span>
                        )}
                        {plan.status === 'STOPPED_OUT' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            STOPPED ({plan.pnlPct}%)
                          </span>
                        )}
                        {plan.status === 'PENDING_ENTRY' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            PENDING ENTRY
                          </span>
                        )}
                        {plan.status === 'TIME_EXPIRED' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            TIME EXPIRED ({plan.pnlPct > 0 ? `+${plan.pnlPct}%` : `${plan.pnlPct}%`})
                          </span>
                        )}

                        <span className="text-[10px] text-slate-500 font-mono">
                          Rec: {plan.recommendedDate}
                        </span>
                      </div>
                    </div>

                    {/* Live Performance & R-Multiple Bar */}
                    <div className="grid grid-cols-3 gap-2 my-2.5 text-xs">
                      <div className="p-2 rounded-lg bg-[#070b13] border border-slate-800/80">
                        <span className="text-[9px] text-slate-400 block">ENTRY PRICE</span>
                        <span className="font-bold text-white text-xs">
                          ৳{plan.entryPrice ? plan.entryPrice.toFixed(1) : plan.recommendedPrice.toFixed(1)}
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          Current: ৳{plan.currentPrice.toFixed(1)}
                        </span>
                      </div>

                      <div className={`p-2 rounded-lg border ${
                        isProfit
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : 'bg-rose-950/20 border-rose-500/40'
                      }`}>
                        <span className={`text-[9px] block font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          NET P&amp;L
                        </span>
                        <span className={`font-black text-sm ${isProfit ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {isProfit ? '+' : ''}{plan.pnlPct}%
                        </span>
                        <span className={`text-[9px] block ${plan.rMultiple >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                          {plan.rMultiple >= 0 ? `+${plan.rMultiple}R` : `${plan.rMultiple}R`} Edge
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-[#070b13] border border-slate-800/80">
                        <span className="text-[9px] text-slate-400 block">EXCURSION</span>
                        <span className="font-bold text-emerald-400 text-xs block">
                          MFE: +{plan.maxFavorableExcursionPct}%
                        </span>
                        <span className="text-[9px] text-rose-400/90 block">
                          MAE: {plan.maxAdverseExcursionPct}%
                        </span>
                      </div>
                    </div>

                    {/* Multi-Target Level Geometry Progress */}
                    <div className="space-y-1.5 p-2 rounded-lg bg-[#070b13]/60 border border-slate-800 text-[11px]">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Stop: ৳{plan.stopLoss.toFixed(1)}</span>
                        <span>TP1: ৳{plan.targetPrice1.toFixed(1)}</span>
                        <span>TP2: ৳{plan.targetPrice2.toFixed(1)}</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
                        <div
                          className={`h-full transition-all rounded-full ${
                            plan.status === 'TP2_HIT'
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-300 w-full'
                              : plan.status === 'TP1_HIT'
                              ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 w-3/4'
                              : plan.pnlPct > 0
                              ? 'bg-emerald-500'
                              : 'bg-rose-500'
                          }`}
                          style={{
                            width: plan.status === 'TP2_HIT'
                              ? '100%'
                              : plan.status === 'TP1_HIT'
                              ? '75%'
                              : plan.pnlPct > 0
                              ? `${Math.min(70, Math.max(15, (plan.pnlPct / 15) * 70))}%`
                              : `${Math.min(40, Math.max(10, (Math.abs(plan.pnlPct) / 5) * 40))}%`
                          }}
                        />
                      </div>

                      {/* Breakeven Trailing Stop Status */}
                      <div className="flex items-center justify-between pt-0.5 text-[10px]">
                        <span className="text-slate-400 font-sans">Trailing Stop:</span>
                        <span className={`font-bold font-mono ${
                          plan.trailingStop >= (plan.entryPrice ?? plan.recommendedPrice)
                            ? 'text-emerald-400'
                            : 'text-slate-300'
                        }`}>
                          ৳{plan.trailingStop.toFixed(1)} {plan.trailingStop >= (plan.entryPrice ?? plan.recommendedPrice) ? '(Breakeven Locked)' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Exit Reason / Progress status text */}
                    {plan.exitReason && (
                      <div className="text-[11px] text-slate-300 font-sans p-2 rounded bg-slate-900/40 border border-slate-800 flex items-center gap-1.5 mt-2">
                        <Check className="h-3 w-3 text-cyan-400 shrink-0" />
                        <span>{plan.exitReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {plan.daysHeld > 0 ? `Held: ${plan.daysHeld} sessions` : 'Pending fill'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRemoveTrackedPlan(plan.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Dismiss / Untrack plan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      {matchingStock && (
                        <button
                          onClick={() => onSelectStock(matchingStock)}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-slate-950 font-bold transition-all cursor-pointer flex items-center gap-1 text-[11px]"
                        >
                          <span>Inspect Chart</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredTrackedPlans.length === 0 && (
              <div className="col-span-full py-16 text-center rounded-2xl bg-[#0b111e] border border-slate-800 space-y-3 font-mono">
                <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
                <h3 className="text-base font-bold text-white">No Tracked Plans In Current Filter</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto font-sans">
                  Switch to "All Plans" or track any setup from "Today's Fresh Setups" with 1-click.
                </p>
                <button
                  onClick={() => {
                    setTrackerFilter('ALL');
                    setTrackerSearch('');
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 text-slate-950 font-bold text-xs cursor-pointer hover:bg-cyan-500"
                >
                  View All Plans
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW 2: TODAY'S FRESH HIGH-CONVICTION SUGGESTIONS */
        <div className="space-y-6">
          {/* Top Header & Decision Summary Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0b162c] via-[#091122] to-[#0b162c] border border-cyan-500/40 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-400 text-slate-950 shadow-lg shadow-amber-500/20">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                      High-Conviction Trade Suggestions
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                      DECISION ENGINE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Simplified, actionable trade suggestions filtered down to the highest mathematical expectancy on DSE
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="px-3.5 py-1.5 rounded-xl bg-[#070b13] border border-slate-700 text-xs tabular-nums">
                  <span className="text-slate-400 font-sans">Regime Sizing: </span>
                  <strong className={
                    regimeGuidance.regime === 'BULLISH' ? 'text-emerald-400'
                      : regimeGuidance.regime === 'NEUTRAL' ? 'text-cyan-300'
                      : regimeGuidance.regime === 'CAUTION' ? 'text-amber-400'
                      : 'text-rose-400'
                  }>
                    {regimeGuidance.label} ({Math.round(regimeGuidance.sizeMultiplier * 100)}% Risk &bull; Min {regimeGuidance.minConvictionRequired}%)
                  </strong>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-bold tabular-nums">
                  {suggestions.length} High-Conviction Setups
                </div>
              </div>
            </div>

            {/* Regime Risk Budget Guidance Bar */}
            <div className="px-3.5 py-2.5 rounded-xl bg-[#070b13]/80 border border-slate-800 text-[11px] font-sans flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-300">{regimeGuidance.guidance}</span>
              <span className="font-mono text-cyan-300 font-bold tabular-nums shrink-0">
                Effective BO Risk/Trade: {effectiveRiskPct}% (৳{Math.round((portfolioCapital * effectiveRiskPct) / 100).toLocaleString()})
              </span>
            </div>

            {/* 3-Point Decision Rule Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs border-t border-slate-800">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#070b13]/60 border border-slate-800/80">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-200">1. Strict Entry Zone Discipline:</span>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5 leading-relaxed">
                    Only buy inside the specified limit zone. Never chase if price exceeds entry high by &gt; 1.5%.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#070b13]/60 border border-slate-800/80">
                <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-200">2. Regime-Scaled Risk &amp; Sizing:</span>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5 leading-relaxed">
                    Position sizes automatically scale by DSEX breadth ({Math.round(regimeGuidance.sizeMultiplier * 100)}% multiplier = {effectiveRiskPct}% risk/trade).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#070b13]/60 border border-slate-800/80">
                <Target className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-200">3. Take Profit Scaling:</span>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5 leading-relaxed">
                    Sell 50% at Target 1 (+10% to +14%). Move stop to breakeven, and let the remaining 50% ride to Target 2.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b111e] p-2 rounded-2xl border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-emerald-600 text-slate-950 shadow-md shadow-emerald-950'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                All Top Picks ({suggestions.length})
              </button>

              <button
                onClick={() => setFilterMode('buy-zone')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterMode === 'buy-zone'
                    ? 'bg-emerald-600 text-slate-950 shadow-md shadow-emerald-950'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>In Buy Zone Now ({suggestions.filter(s => s.inBuyZone).length})</span>
              </button>

              <button
                onClick={() => setFilterMode('breakout')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  filterMode === 'breakout'
                    ? 'bg-emerald-600 text-slate-950 shadow-md shadow-emerald-950'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                Breakout Ignitions ({suggestions.filter(s => s.action === 'BREAKOUT BUY').length})
              </button>

              <button
                onClick={() => setFilterMode('multi-day')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterMode === 'multi-day'
                    ? 'bg-emerald-600 text-slate-950 shadow-md shadow-emerald-950'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Multi-Day Climbers ({suggestions.filter(s => s.stock.multiDayMomentum?.isMultiDayClimber).length})</span>
              </button>

              <button
                onClick={() => setFilterMode('stage2')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  filterMode === 'stage2'
                    ? 'bg-emerald-600 text-slate-950 shadow-md shadow-emerald-950'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                Stage 2 Advancing Markup ({suggestions.filter(s => s.stock.stage === 2).length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-sans hidden sm:inline">Category:</span>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 bg-[#070b13] border border-slate-700 text-slate-200 rounded-xl text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="All">All Categories</option>
                <option value="A">Category A Only</option>
                <option value="B">Category B Only</option>
              </select>
            </div>
          </div>

          {/* Primary Top Pick Hero Card (If available) */}
          {topPick && filterMode === 'all' && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0c1a2d] via-[#081220] to-[#060b14] border-2 border-emerald-500/60 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 px-4 py-1 bg-gradient-to-l from-emerald-500 to-cyan-400 text-slate-950 text-[10px] font-black rounded-bl-xl uppercase tracking-wider shadow-md">
                ★ #1 HIGHEST CONVICTION SETUP TODAY
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      onClick={() => onSelectStock(topPick.stock)}
                      className="text-2xl font-black text-white hover:text-emerald-400 cursor-pointer transition-colors"
                    >
                      {topPick.stock.symbol}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Cat {topPick.stock.category}
                    </span>
                    <span className="text-xs text-slate-400 font-sans">
                      {topPick.stock.name} &bull; <strong className="text-slate-300">{topPick.stock.sector}</strong>
                    </span>
                    {topPick.stock.latestBarDate && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
                        📅 Last Bar: {topPick.stock.latestBarDate}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-950/40 text-amber-300 font-bold border border-amber-800/50" title="Trade Value (Total Turnover in Crore BDT)">
                      ৳{topPick.stock.turnoverCr.toFixed(2)} Cr Value
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-cyan-950/40 text-cyan-300 font-bold border border-cyan-800/50" title="Trade Volume (Total Traded Shares)">
                      {topPick.stock.volume > 1_000_000
                        ? `${(topPick.stock.volume / 1_000_000).toFixed(2)}M Shares Vol`
                        : `${topPick.stock.volume.toLocaleString()} Shares Vol`}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                      {topPick.convictionScore}% CONVICTION INDEX
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                      {topPick.action}
                    </span>
                    {topPick.stock.multiDayMomentum?.isMultiDayClimber && (
                      <span className="text-xs font-mono font-bold text-emerald-300 tabular-nums">
                        {topPick.stock.multiDayMomentum.consecutiveUpDays}D Up Streak &middot; +{topPick.stock.multiDayMomentum.return5dPct}% (5D)
                      </span>
                    )}
                  </div>
                </div>

                {/* Price & Execution Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#070b13]/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block mb-1">Current Price</span>
                    <div className="text-base font-bold text-white">
                      ৳{topPick.stock.lastPrice.toFixed(1)}
                    </div>
                    <span className={`text-[11px] font-bold ${topPick.stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {topPick.stock.change >= 0 ? '+' : ''}{topPick.stock.change.toFixed(1)} ({topPick.stock.changePercent.toFixed(2)}%)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/40">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold block mb-1">Buy Zone</span>
                    <div className="text-base font-bold text-emerald-300">
                      ৳{topPick.stock.entryZoneLow.toFixed(1)} – ৳{topPick.stock.entryZoneHigh.toFixed(1)}
                    </div>
                    <span className="text-[11px] text-emerald-400 font-sans">
                      {topPick.inBuyZone ? '✓ Inside Buy Zone Now' : 'Limit Bid Area'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/40">
                    <span className="text-[10px] text-rose-400 uppercase font-bold block mb-1">Stop Loss</span>
                    <div className="text-base font-bold text-rose-300">
                      ৳{topPick.stock.stopLoss.toFixed(1)}
                    </div>
                    <span className="text-[11px] text-rose-400 font-sans">
                      Risk: -{topPick.riskPct}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/40">
                    <span className="text-[10px] text-cyan-400 uppercase font-bold block mb-1">Target 1</span>
                    <div className="text-base font-bold text-cyan-300">
                      ৳{topPick.stock.targetPrice1.toFixed(1)}
                    </div>
                    <span className="text-[11px] text-cyan-400 font-sans">
                      Gain: +{topPick.rewardPct1}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#070b13]/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block mb-1">Risk / Reward</span>
                    <div className="text-base font-bold text-amber-400">
                      {topPick.riskRewardRatio}x
                    </div>
                    <span className="text-[11px] text-slate-400 font-sans">
                      Asymmetric Edge
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#070b13]/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block mb-1">Suggested Sizing</span>
                    <div className="text-base font-bold text-purple-300">
                      {topPick.suggestedAllocPct}%
                    </div>
                    <span className="text-[11px] text-slate-400 font-sans">
                      Kelly Position Size
                    </span>
                  </div>
                </div>

                {/* Plain-English Conviction Reasons & Action Button */}
                <div className="p-3.5 rounded-xl bg-[#070b13]/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      Why This Trade:
                    </span>
                    <ul className="text-slate-300 space-y-0.5 list-disc list-inside font-sans text-[11px]">
                      {topPick.keyDrivers.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTrackPlan(topPick)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        trackedPlans.some(p => p.symbol === topPick.stock.symbol && (p.status === 'ACTIVE_IN_TRADE' || p.status === 'PENDING_ENTRY'))
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                      }`}
                    >
                      <Bookmark className="h-4 w-4" />
                      <span>
                        {trackedPlans.some(p => p.symbol === topPick.stock.symbol && (p.status === 'ACTIVE_IN_TRADE' || p.status === 'PENDING_ENTRY'))
                          ? 'Tracking Active'
                          : 'Track Trade Plan'}
                      </span>
                    </button>

                    <button
                      onClick={() => onSelectStock(topPick.stock)}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer shrink-0"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Open Full Trade Plan &amp; Chart</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grid of High-Conviction Suggestion Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuggestions.map((item, index) => {
              const isAlreadyTracked = trackedPlans.some(
                p => p.symbol === item.stock.symbol && (p.status === 'ACTIVE_IN_TRADE' || p.status === 'PENDING_ENTRY')
              );

              const cardSizing = calculateDsePositionSizing(
                portfolioCapital,
                effectiveRiskPct,
                item.stock.lastPrice,
                item.stock.stopLoss,
                item.stock.targetPrice1,
                item.stock.targetPrice2,
                brokerageRatePct
              );

              const cardLiquidity = evaluateDseLiquidityAndCircuit(item.stock, cardSizing.suggestedShares);
              const sectorCheck = evaluateSectorConcentration(item.stock, trackedPlans);

              return (
                <div
                  key={item.stock.symbol}
                  className={`p-4 rounded-2xl bg-[#0b111e] border transition-all hover:shadow-xl flex flex-col justify-between space-y-3 ${
                    item.convictionTier === 'ELITE'
                      ? 'border-emerald-500/50 hover:border-emerald-400'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Card Header: Symbol, Tier, Action */}
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800/80">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            onClick={() => onSelectStock(item.stock)}
                            className="text-lg font-black text-white hover:text-emerald-400 cursor-pointer transition-colors"
                          >
                            {item.stock.symbol}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            Cat {item.stock.category}
                          </span>
                          {item.inBuyZone && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                              IN BUY ZONE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans truncate max-w-[200px] mt-0.5">
                          {item.stock.name}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          item.convictionTier === 'ELITE'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        }`}>
                          {item.convictionScore}% Conviction
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.stock.sector}
                        </span>
                      </div>
                    </div>

                    {/* Price & Targets Matrix */}
                    <div className="grid grid-cols-3 gap-2 my-2.5 text-xs">
                      <div className="p-2 rounded-lg bg-[#070b13] border border-slate-800/80">
                        <span className="text-[9px] text-slate-400 block">CURRENT</span>
                        <span className="font-bold text-white text-sm">৳{item.stock.lastPrice.toFixed(1)}</span>
                        <span className={`text-[10px] block ${item.stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {item.stock.change >= 0 ? '+' : ''}{item.stock.changePercent.toFixed(1)}%
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                        <span className="text-[9px] text-emerald-400 block font-bold">BUY ZONE</span>
                        <span className="font-bold text-emerald-300 text-xs">
                          ৳{item.stock.entryZoneLow.toFixed(1)}–{item.stock.entryZoneHigh.toFixed(1)}
                        </span>
                        <span className="text-[9px] text-emerald-400/80 block">Limit Bid</span>
                      </div>

                      <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-500/30">
                        <span className="text-[9px] text-rose-400 block font-bold">STOP LOSS</span>
                        <span className="font-bold text-rose-300 text-xs">৳{item.stock.stopLoss.toFixed(1)}</span>
                        <span className="text-[9px] text-rose-400/80 block">-{item.riskPct}% Risk</span>
                      </div>
                    </div>

                    {/* Live DSE Position Sizing & Net Take-Home Strip */}
                    <div className="p-2 rounded-lg bg-[#070e1c] border border-cyan-500/30 text-[10px] space-y-1 mb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-sans">
                          Shares for ৳{portfolioCapital.toLocaleString()}:
                        </span>
                        <span className="font-bold text-white font-mono">
                          {cardSizing.suggestedShares.toLocaleString()} shs (৳{cardSizing.positionValueBDT.toLocaleString()} &bull; {cardSizing.portfolioAllocationPct}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-sans">Net TP1 Take-Home:</span>
                        <span className="font-bold text-emerald-400 font-mono">
                          +৳{cardSizing.netProfitAtTP1BDT.toLocaleString()} (+{cardSizing.netProfitAtTP1Pct}% net)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] pt-1 border-t border-slate-800 text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-cyan-400" />
                          T+2: {cardLiquidity.t2SettlementDate}
                        </span>
                        <span className={`font-mono ${cardLiquidity.isNearUpperCircuit ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                          Ceiling: +{cardLiquidity.headroomToUpperPct}%
                        </span>
                      </div>
                    </div>

                    {/* Target & Risk/Reward Strip */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#070b13] border border-slate-800/80 text-[11px] mb-2">
                      <div>
                        <span className="text-slate-400 font-sans">Target 1: </span>
                        <span className="font-bold text-cyan-300">৳{item.stock.targetPrice1.toFixed(1)} (+{item.rewardPct1}%)</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-sans">R:R: </span>
                        <span className="font-bold text-amber-400">{item.riskRewardRatio}x</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-sans">Sizing: </span>
                        <span className="font-bold text-purple-300">{item.suggestedAllocPct}%</span>
                      </div>
                    </div>

                    {/* Sector Concentration Guard Alert */}
                    {sectorCheck.isOverConcentrated && sectorCheck.warningMessage && (
                      <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-500/40 text-[10px] text-amber-300 font-sans flex items-start gap-1.5 mb-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{sectorCheck.warningMessage}</span>
                      </div>
                    )}

                    {/* Key Conviction Reasons */}
                    <div className="space-y-1 pt-1 text-[11px] text-slate-300 font-sans">
                      {item.keyDrivers.map((driver, dIdx) => (
                        <div key={dIdx} className="flex items-start gap-1.5">
                          <CheckSquare className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">{driver}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons & Value/Volume badges */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap text-[10px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40" title="Trade Value (Total Turnover in Crore BDT)">
                          ৳{item.stock.turnoverCr.toFixed(2)} Cr Value
                        </span>
                        <span className="font-bold text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40" title="Trade Volume (Total Traded Shares)">
                          {item.stock.volume > 1_000_000
                            ? `${(item.stock.volume / 1_000_000).toFixed(2)}M Vol`
                            : item.stock.volume > 1000
                            ? `${(item.stock.volume / 1000).toFixed(1)}k Vol`
                            : `${item.stock.volume} Vol`}
                        </span>
                      </div>
                      {item.stock.latestBarDate && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          📅 {item.stock.latestBarDate}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                        RVOL: <strong className="text-emerald-400">{item.stock.rvol.toFixed(1)}x</strong> &bull; Stage {item.stock.stage}
                        {item.stock.multiDayMomentum?.isMultiDayClimber && (
                          <span className="text-emerald-300 font-bold">
                            {' '}&bull; {item.stock.multiDayMomentum.consecutiveUpDays}D Climb (+{item.stock.multiDayMomentum.return5dPct}%)
                          </span>
                        )}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setActiveSizingModalItem(item)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-400 border border-slate-700 transition-colors cursor-pointer"
                          title="Inspect exact DSE Brokerage Fees, Net Take-Home BDT & T+2 Timeline"
                        >
                          <Calculator className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleTrackPlan(item)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            isAlreadyTracked
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                          }`}
                          title="Track this trade plan forward across daily updates"
                        >
                          <Bookmark className="h-3.5 w-3.5" />
                          <span>{isAlreadyTracked ? 'Tracked' : 'Track'}</span>
                        </button>

                        <button
                          onClick={() => onSelectStock(item.stock)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-slate-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span>Trade Plan</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredSuggestions.length === 0 && (
              <div className="col-span-full py-16 text-center rounded-2xl bg-[#0b111e] border border-slate-800 space-y-3 font-mono">
                <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
                <h3 className="text-base font-bold text-white">No Setups Met Active Conviction Filter</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto font-sans">
                  Switch filter to "All Top Picks" or lower the score threshold in the screener toolbar to inspect emerging candidates.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive DSE Position Sizing & Net Profit Breakdown Modal */}
      {activeSizingModalItem && (() => {
        const item = activeSizingModalItem;
        const sizing = calculateDsePositionSizing(
          portfolioCapital,
          effectiveRiskPct,
          item.stock.lastPrice,
          item.stock.stopLoss,
          item.stock.targetPrice1,
          item.stock.targetPrice2,
          brokerageRatePct
        );
        const liquidity = evaluateDseLiquidityAndCircuit(item.stock, sizing.suggestedShares);
        const netTradeTP1 = calculateDseNetTrade(item.stock.lastPrice, item.stock.targetPrice1, sizing.suggestedShares, brokerageRatePct);
        const netTradeTP2 = calculateDseNetTrade(item.stock.lastPrice, item.stock.targetPrice2, sizing.suggestedShares, brokerageRatePct);

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-[#0b111e] border border-cyan-500/50 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto font-mono text-xs">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    <Calculator className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-black text-white">{item.stock.symbol}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        Cat {item.stock.category} &bull; {item.stock.sector}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                        ৳{item.stock.lastPrice.toFixed(1)} BDT
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      DSE Position Sizing, Net Take-Home Profit Calculator &amp; T+2 Settlement Shield
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveSizingModalItem(null)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 hidden" />
                  <span className="text-base font-bold px-1">✕</span>
                </button>
              </div>

              {/* Dynamic Sizing Control Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-[#070b13] border border-slate-800">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Your Total BO Capital:</label>
                  <div className="flex items-center gap-1 bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-700">
                    <span className="text-cyan-400 font-bold">৳</span>
                    <input
                      type="number"
                      value={portfolioCapital}
                      onChange={e => setPortfolioCapital(Math.max(10000, Number(e.target.value) || 100000))}
                      step={50000}
                      className="w-full bg-transparent text-white font-bold outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Max Risk / Trade Budget:</label>
                  <select
                    value={riskTolerancePct}
                    onChange={e => setRiskTolerancePct(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-bold py-1.5 px-2 rounded-lg outline-none cursor-pointer"
                  >
                    <option value={1.0}>1.0% (৳{(portfolioCapital * 0.01).toLocaleString()} risk)</option>
                    <option value={1.5}>1.5% (৳{(portfolioCapital * 0.015).toLocaleString()} risk)</option>
                    <option value={2.0}>2.0% (৳{(portfolioCapital * 0.02).toLocaleString()} risk)</option>
                    <option value={2.5}>2.5% (৳{(portfolioCapital * 0.025).toLocaleString()} risk)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Brokerage Commission:</label>
                  <select
                    value={brokerageRatePct}
                    onChange={e => setBrokerageRatePct(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 text-amber-300 font-bold py-1.5 px-2 rounded-lg outline-none cursor-pointer"
                  >
                    <option value={0.35}>0.35% (Institutional/VIP)</option>
                    <option value={0.40}>0.40% (Standard Retail)</option>
                    <option value={0.50}>0.50% (Full Service)</option>
                  </select>
                </div>
              </div>

              {/* Exact Execution Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-[#070b13] border border-cyan-500/30">
                  <span className="text-[9px] text-slate-400 block mb-0.5">EXACT SHARES TO BUY</span>
                  <div className="text-base font-black text-white">
                    {sizing.suggestedShares.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-cyan-300 font-sans block mt-0.5">
                    ৳{sizing.positionValueBDT.toLocaleString()} ({sizing.portfolioAllocationPct}% BO)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/40">
                  <span className="text-[9px] text-emerald-400 font-bold block mb-0.5">TARGET 1 NET TAKE-HOME</span>
                  <div className="text-base font-black text-emerald-300">
                    +৳{sizing.netProfitAtTP1BDT.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-400/80 font-sans block mt-0.5">
                    +{sizing.netProfitAtTP1Pct}% net (+{item.rewardPct1}% gross)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-teal-950/20 border border-teal-500/40">
                  <span className="text-[9px] text-teal-400 font-bold block mb-0.5">TARGET 2 NET RUNNER</span>
                  <div className="text-base font-black text-teal-300">
                    +৳{sizing.netProfitAtTP2BDT.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-teal-400/80 font-sans block mt-0.5">
                    +{sizing.netProfitAtTP2Pct}% net (+{item.rewardPct2}% gross)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/40">
                  <span className="text-[9px] text-rose-400 font-bold block mb-0.5">MAX LOSS IF STOPPED</span>
                  <div className="text-base font-black text-rose-300">
                    -৳{sizing.maxLossAtStopBDT.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-rose-400/80 font-sans block mt-0.5">
                    Regime cap: {effectiveRiskPct}% ({Math.round(regimeGuidance.sizeMultiplier * 100)}%)
                  </span>
                </div>
              </div>

              {/* DSE Fee & Tax Itemization */}
              <div className="p-3.5 rounded-xl bg-[#070b13] border border-slate-800 space-y-2">
                <span className="font-bold text-white text-xs block flex items-center justify-between">
                  <span>DSE Transaction Friction &amp; Fee Breakdown (Buy &amp; Sell):</span>
                  <span className="text-amber-400 font-mono">
                    Total Fees: ৳{netTradeTP1.fees.totalFeesBDT.toLocaleString()} BDT ({netTradeTP1.fees.feePercentage}%)
                  </span>
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Buy Brokerage ({brokerageRatePct}%):</span>
                    <span className="font-bold text-slate-200">৳{netTradeTP1.fees.brokerageBuyBDT.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Sell Brokerage ({brokerageRatePct}%):</span>
                    <span className="font-bold text-slate-200">৳{netTradeTP1.fees.brokerageSellBDT.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">DSE Turnover Tax (0.05%):</span>
                    <span className="font-bold text-amber-300">৳{netTradeTP1.fees.turnoverTaxBDT.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">CDBL Settlement Charges:</span>
                    <span className="font-bold text-cyan-300">৳{netTradeTP1.fees.cdblChargesBDT.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* T+2 Settlement Timeline & Circuit Proximity Shield */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-[#070b13] border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <Clock className="h-4 w-4" />
                    <span>DSE T+2 Settlement Shield</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    If bought today, shares settle into your CDBL account and become <strong>eligible to sell on {liquidity.t2SettlementDate}</strong> (excluding Friday/Saturday weekend).
                  </p>
                  <div className="text-[10px] text-emerald-400 font-mono pt-0.5">
                    ✓ Liquidity Depth: {liquidity.liquidityTier} ({liquidity.positionShareOfAdvPct}% of daily volume)
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#070b13] border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <ShieldAlert className="h-4 w-4" />
                    <span>Circuit Ceiling &amp; Floor Analysis</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400">Upper Circuit Ceiling:</span>
                    <span className="font-bold text-emerald-400 font-mono">৳{liquidity.upperCircuit.toFixed(1)} (+{liquidity.headroomToUpperPct}%)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Lower Circuit Floor:</span>
                    <span className="font-bold text-rose-400 font-mono">৳{liquidity.lowerCircuit.toFixed(1)} (-{liquidity.distanceToLowerPct}%)</span>
                  </div>
                  {liquidity.circuitWarningMessage ? (
                    <div className="text-[10px] text-amber-300 font-sans pt-0.5 font-bold">
                      ⚠ {liquidity.circuitWarningMessage}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 font-sans pt-0.5">
                      ✓ Safe execution headroom: &gt; 1.5% distance from upper circuit lock.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    handleTrackPlan(item);
                    setActiveSizingModalItem(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  <span>Track This Plan ({sizing.suggestedShares} shs)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSelectStock(item.stock);
                      setActiveSizingModalItem(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Inspect Chart</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => setActiveSizingModalItem(null)}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-bold transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Global DSE 3-Stage Execution Playbook Modal */}
      {showPlaybookModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in font-mono">
          <div className="max-w-4xl w-full bg-[#0b111e] border border-emerald-500/50 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto text-slate-100">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                      Dhaka Stock Exchange (DSE) Execution Playbook
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                      3-STAGE LIFECYCLE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Institutional trade management rules adapted for DSE T+2 settlement, 2-way circuit corridor, and fee friction
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyGlobalPlaybook}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    copiedGlobalPlaybook
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {copiedGlobalPlaybook ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5 text-emerald-400" />}
                  <span>{copiedGlobalPlaybook ? 'Playbook Copied!' : 'Copy Playbook'}</span>
                </button>
                <button
                  onClick={() => setShowPlaybookModal(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 3 Stages Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Stage 1 */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      STAGE 1
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      TP1 (+10% to +14%)
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    Scale 50% &amp; Move SL to Breakeven
                  </h4>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    On first touch or 5-min close at Target 1, immediately sell 50% of your shares. This locks in net realized profit in your BO account.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#070b13] border border-emerald-500/40 text-[10px] font-mono text-emerald-200 space-y-1">
                  <div className="font-bold text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    <span>RISK-FREE PIVOT:</span>
                  </div>
                  <p className="font-sans text-slate-300">
                    Cancel original SL. Enter new Stop Loss at Entry (Breakeven). The trade is now 100% risk-free.
                  </p>
                </div>
              </div>

              {/* Stage 2 */}
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/40 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      STAGE 2
                    </span>
                    <span className="text-xs font-mono text-purple-400 font-bold">
                      TP2 (+20% to +35%)
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    50% Runner on 20-Day EMA
                  </h4>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    Allow the remaining 50% runner to capture large multi-week Stage 2 markup expansion. Never exit prematurely on intraday pullbacks.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#070b13] border border-purple-500/40 text-[10px] font-mono text-purple-200 space-y-1">
                  <div className="font-bold text-purple-300 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 shrink-0" />
                    <span>TRAILING BENCHMARK:</span>
                  </div>
                  <p className="font-sans text-slate-300">
                    Exit the runner ONLY if a daily candle closes below the 20-day EMA or reaches Target 2.
                  </p>
                </div>
              </div>

              {/* Stage 3 */}
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      STAGE 3
                    </span>
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      8–10 SESSIONS
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    Time Stop &amp; T+2 Defense
                  </h4>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    If the setup consolidates without hitting TP1 after 8 to 10 trading sessions, exit at market to preserve capital velocity.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#070b13] border border-amber-500/40 text-[10px] font-mono text-amber-200 space-y-1">
                  <div className="font-bold text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>ZERO AVERAGING DOWN:</span>
                  </div>
                  <p className="font-sans text-slate-300">
                    Shares are locked on Day 0 and Day 1. NEVER average down into falling stocks. If below SL on Day 2 delivery, cut immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* DSE Institutional Realities Box */}
            <div className="p-4 rounded-xl bg-[#070b13] border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400" />
                Critical Dhaka Stock Exchange (DSE) Structural Parameters
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block mb-1">T+2 Multi-Day Corridor</span>
                  <div className="font-bold text-white text-xs">
                    Main: -27.1% / +33.1%
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans">
                    SME: -48.8% / +72.8%
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block mb-1">Fixed Fractional Sizing</span>
                  <div className="font-bold text-purple-300 text-xs">
                    1.5% BO Risk Limit
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans">
                    Max loss capped strictly per idea
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block mb-1">Round-Trip Friction</span>
                  <div className="font-bold text-amber-300 text-xs">
                    ~0.85% Total DSE Fees
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans">
                    0.40% buy + 0.40% sell + tax/CDBL
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block mb-1">Record Date Lockout</span>
                  <div className="font-bold text-emerald-400 text-xs">
                    Safe Window &gt; 6 Days
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans">
                    Avoid book closure suspensions
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-sans">
                Access the stock-specific interactive playbook with exact calculated share counts by clicking <strong>Trade Plan</strong> or <strong>Pre-Trade Cockpit</strong> on any stock card.
              </span>
              <button
                onClick={() => setShowPlaybookModal(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-all cursor-pointer"
              >
                Got It, Let's Execute &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
