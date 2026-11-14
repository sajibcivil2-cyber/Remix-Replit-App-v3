/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Target,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  BrainCircuit,
  Zap,
  Calculator,
  Compass,
  Calendar,
  Lock,
  Layers,
  Copy,
  Check,
  Clock,
  DollarSign,
  Scale,
  Sparkles,
  ArrowUpRight,
  Info,
  Maximize2,
  BookOpen,
  ListOrdered
} from 'lucide-react';
import { DseStockItem, MarketBreadth } from '../types/dse';
import {
  calculateDsePositionSizing,
  evaluateDseLiquidityAndCircuit,
  calculateDseNetTrade,
  getRegimeRiskGuidance
} from '../lib/dseExecutionSuite';
import { resolveCompanySector, isSmeSymbol } from '../lib/sectorClassifier';
import { evaluateCorporateActionLockout } from '../lib/dseCorporateActions';

interface PreTradeCockpitProps {
  stock: DseStockItem;
  marketBreadth?: MarketBreadth;
  onOpenChart?: (stock: DseStockItem) => void;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export function PreTradeCockpit({
  stock,
  marketBreadth,
  onOpenChart,
  onClose,
  isEmbedded = false
}: PreTradeCockpitProps) {
  // BO Account Portfolio Capital Sizing
  const [portfolioCapital, setPortfolioCapital] = useState<number>(500000); // ৳5 Lakh BDT default
  const [riskTolerancePct, setRiskTolerancePct] = useState<number>(1.5); // 1.5% fixed risk
  const [brokerageRatePct, setBrokerageRatePct] = useState<number>(0.40); // 0.40% DSE rate
  const [copiedTicket, setCopiedTicket] = useState(false);
  const [copiedPlaybook, setCopiedPlaybook] = useState(false);

  // Market regime risk guidance
  const regimeGuidance = useMemo(() => {
    return getRegimeRiskGuidance(marketBreadth);
  }, [marketBreadth]);

  const effectiveRiskPct = useMemo(() => {
    return Math.round(riskTolerancePct * regimeGuidance.sizeMultiplier * 100) / 100;
  }, [riskTolerancePct, regimeGuidance.sizeMultiplier]);

  // Position sizing plan
  const sizingPlan = useMemo(() => {
    return calculateDsePositionSizing(
      portfolioCapital,
      effectiveRiskPct,
      stock.lastPrice,
      stock.stopLoss,
      stock.targetPrice1,
      stock.targetPrice2,
      brokerageRatePct
    );
  }, [stock, portfolioCapital, effectiveRiskPct, brokerageRatePct]);

  // Circuit breaker & liquidity assessment
  const liquidityStatus = useMemo(() => {
    return evaluateDseLiquidityAndCircuit(stock, sizingPlan.suggestedShares);
  }, [stock, sizingPlan.suggestedShares]);

  // Net trade breakdown at TP1
  const netTradeTP1 = useMemo(() => {
    return calculateDseNetTrade(stock.lastPrice, stock.targetPrice1, sizingPlan.suggestedShares, brokerageRatePct);
  }, [stock.lastPrice, stock.targetPrice1, sizingPlan.suggestedShares, brokerageRatePct]);

  // Net trade breakdown at TP2
  const netTradeTP2 = useMemo(() => {
    return calculateDseNetTrade(stock.lastPrice, stock.targetPrice2, sizingPlan.suggestedShares, brokerageRatePct);
  }, [stock.lastPrice, stock.targetPrice2, sizingPlan.suggestedShares, brokerageRatePct]);

  // Corporate Action & Record Date Lockout
  const corporateAction = useMemo(() => {
    return evaluateCorporateActionLockout(stock);
  }, [stock]);

  // Pre-Trade "GO / NO-GO" Checklist items (DSE 7-Gate System)
  const checks = useMemo(() => {
    const isSectorFavorable = stock.sectorStrength === 'strong' || stock.sectorTrend === 'up';
    const isRvolSurge = stock.rvol >= 1.3;
    const isPriceActionBullish = stock.change >= 0 && stock.paConfirmed;
    const isEntryNotChasing = !stock.chaseRisk && stock.t2SettlementRisk !== 'EXTENDED_CHASE_RISK';
    const isRiskRewardHigh = stock.riskRewardRatio >= 2.5;
    const isMlConfident = (stock.mlProbability || 0.5) >= 0.75;
    const isRecordDateSafe = !corporateAction || corporateAction.lockoutRisk !== 'CRITICAL_T2_LOCKOUT';

    return [
      {
        id: 'sector',
        label: 'Sector Tailwind',
        detail: `Sector (${stock.sector}) shows ${isSectorFavorable ? 'institutional inflow' : 'neutral/lagging strength'}`,
        passed: isSectorFavorable,
        importance: 'HIGH',
      },
      {
        id: 'volume',
        label: 'Volume Surge (RVOL)',
        detail: `Current RVOL is ${stock.rvol.toFixed(1)}x (Threshold: >= 1.3x 20d average)`,
        passed: isRvolSurge,
        importance: 'CRITICAL',
      },
      {
        id: 'price-action',
        label: 'Bullish Price Action',
        detail: isPriceActionBullish
          ? 'Confirmed bullish green candle closing near highs'
          : 'Lacks decisive green bar ignition confirmation',
        passed: isPriceActionBullish,
        importance: 'HIGH',
      },
      {
        id: 't2-risk',
        label: 'T+2 Pivot Safety',
        detail: isEntryNotChasing
          ? 'Inside base / consolidation; minimal T+2 trapping danger'
          : 'Extended > 4.5% above pivot; high risk of 2-day lockup',
        passed: isEntryNotChasing,
        importance: 'CRITICAL',
      },
      {
        id: 'record-date',
        label: 'Record Date Lockout Clear',
        detail: corporateAction
          ? corporateAction.lockoutRisk === 'CRITICAL_T2_LOCKOUT'
            ? `CRITICAL LOCKOUT: Record date in ${corporateAction.daysToRecordDate}d (${corporateAction.recordDate}). Trading suspended; shares locked during T+2!`
            : corporateAction.lockoutRisk === 'APPROACHING_CAUTION'
            ? `Caution: Record date in ${corporateAction.daysToRecordDate}d (${corporateAction.recordDate}). Dividend pump & ex-date dump risk.`
            : `Safe: Record date on ${corporateAction.recordDate} (${corporateAction.daysToRecordDate}d away). Dividend: ${corporateAction.dividendCashPct || 0}% cash.`
          : stock.fundamentalsSource === 'DEFAULT_ESTIMATE'
          ? 'Unverified Local DB: No record date imported for this stock — verify Category & Record Date on dsebd.org or import Fundamentals CSV.'
          : 'Clear: No immediate dividend record date or book closure suspension.',
        passed: isRecordDateSafe,
        importance: 'CRITICAL',
      },
      {
        id: 'risk-reward',
        label: 'Risk : Reward Ratio',
        detail: `${stock.riskRewardRatio.toFixed(1)}:1 geometry to TP1 (Minimum requirement: >= 2.5:1)`,
        passed: isRiskRewardHigh,
        importance: 'HIGH',
      },
      {
        id: 'ml-winrate',
        label: 'ML Win Probability',
        detail: `${Math.round((stock.mlProbability || 0.5) * 100)}% historical target hit rate (Minimum: >= 75%)`,
        passed: isMlConfident,
        importance: 'HIGH',
      },
    ];
  }, [stock, corporateAction]);

  const passedChecksCount = checks.filter(c => c.passed).length;
  const isFullyCleared = passedChecksCount === checks.length;
  const isPartiallyCleared = passedChecksCount >= 5;

  // Generate clean Brokerage Order Ticket text
  const orderTicketText = useMemo(() => {
    return `[DSE ORDER TICKET]
Action: BUY (LIMIT)
Symbol: ${stock.symbol}
Board: ${stock.marketBoard || 'MAIN'}
Category: ${stock.category}
Quantity: ${sizingPlan.suggestedShares.toLocaleString()} shares
Entry Limit: ৳${stock.lastPrice.toFixed(1)} (Range: ৳${stock.entryZoneLow.toFixed(1)} - ৳${stock.entryZoneHigh.toFixed(1)})
Stop Loss: ৳${stock.stopLoss.toFixed(1)} (-${Math.round(((stock.lastPrice - stock.stopLoss) / stock.lastPrice) * 100)}%)
Take Profit 1: ৳${stock.targetPrice1.toFixed(1)} (+${Math.round(((stock.targetPrice1 - stock.lastPrice) / stock.lastPrice) * 100)}%) [Sell 50%]
Take Profit 2: ৳${stock.targetPrice2.toFixed(1)} (+${Math.round(((stock.targetPrice2 - stock.lastPrice) / stock.lastPrice) * 100)}%) [Trail Runner]
Total Commitment: ৳${sizingPlan.positionValueBDT.toLocaleString()}
Max Loss Risk: ৳${sizingPlan.maxLossAtStopBDT.toLocaleString()} (${effectiveRiskPct}% regime-adjusted BO Capital)
Est. Net Gain TP1: +৳${netTradeTP1.netGainBDT.toLocaleString()}`;
  }, [stock, sizingPlan, effectiveRiskPct, netTradeTP1]);

  const handleCopyTicket = () => {
    navigator.clipboard.writeText(orderTicketText);
    setCopiedTicket(true);
    setTimeout(() => setCopiedTicket(false), 3000);
  };

  // Generate formatted DSE 3-Stage Lifecycle Execution Playbook text
  const playbookText = useMemo(() => {
    const scaleShares = Math.floor(sizingPlan.suggestedShares / 2);
    const runnerShares = Math.ceil(sizingPlan.suggestedShares / 2);
    const scaleProfit = Math.round(netTradeTP1.netGainBDT * (scaleShares / Math.max(1, sizingPlan.suggestedShares)));
    const runnerProfit = Math.round(netTradeTP2.netGainBDT * (runnerShares / Math.max(1, sizingPlan.suggestedShares)));
    const ema20Val = stock.technicalParams?.ma20 || stock.ma20;
    const ema20Str = ema20Val ? `৳${ema20Val.toFixed(1)}` : `৳${(stock.lastPrice * 0.94).toFixed(1)}`;
    const boardName = stock.marketBoard === 'SME' ? 'DSE SME Growth Board' : 'DSE Main Board';
    const t2Ceiling = stock.marketBoard === 'SME' ? '+72.8%' : '+33.1%';
    const t2Floor = stock.marketBoard === 'SME' ? '-48.8%' : '-27.1%';

    return `=====================================================
DSE 3-STAGE TRADE LIFECYCLE PLAYBOOK: ${stock.symbol}
=====================================================
Security: ${stock.symbol} (${stock.name})
Board: ${boardName} | Category: ${stock.category} | Sector: ${stock.sector}
Position Size: ${sizingPlan.suggestedShares.toLocaleString()} shares | Committed: ৳${sizingPlan.positionValueBDT.toLocaleString()}
Entry Limit: ৳${stock.lastPrice.toFixed(1)} | Stop Loss: ৳${stock.stopLoss.toFixed(1)} (-${Math.round(((stock.lastPrice - stock.stopLoss) / stock.lastPrice) * 100)}%)
T+2 Corridor (3 sessions): Max Trapped Floor ${t2Floor} | Compounded Ceiling ${t2Ceiling}

-----------------------------------------------------
STAGE 1: INITIAL TARGET (TP1) & RISK-FREE PIVOT
-----------------------------------------------------
- Target 1 Price: ৳${stock.targetPrice1.toFixed(1)} (+${Math.round(((stock.targetPrice1 - stock.lastPrice) / stock.lastPrice) * 100)}%)
- Action: Sell 50% of position (${scaleShares.toLocaleString()} shares) on first touch or close at TP1
- Net Profit Locked: +৳${scaleProfit.toLocaleString()} (deposited into BO balance net of fees)
- MANDATORY ORDER UPDATE: Cancel initial stop loss at ৳${stock.stopLoss.toFixed(1)}.
  Place new Stop Loss at Breakeven (৳${stock.lastPrice.toFixed(1)}).
  Status: TRADE IS NOW 100% RISK-FREE. Capital is fully protected.

-----------------------------------------------------
STAGE 2: 50% RUNNER & 20 EMA DYNAMIC TRAILING STOP
-----------------------------------------------------
- Target 2 Price: ৳${stock.targetPrice2.toFixed(1)} (+${Math.round(((stock.targetPrice2 - stock.lastPrice) / stock.lastPrice) * 100)}%)
- Runner Position: Keep ${runnerShares.toLocaleString()} shares active (Est. Net: +৳${runnerProfit.toLocaleString()})
- Trailing Stop Rule: Do NOT exit on minor intraday dips or red prints.
  Exit the remaining 50% ONLY if:
  (a) Price touches TP2 (৳${stock.targetPrice2.toFixed(1)}), OR
  (b) Daily candle closes below 20-day EMA (${ema20Str}).
  This captures major multi-week institutional markups.

-----------------------------------------------------
STAGE 3: TIME STOP & T+2 ANTI-TRAP DISCIPLINE
-----------------------------------------------------
- Time Stop: 8 to 10 trading sessions maximum.
  If the stock fails to advance towards TP1 and hovers near entry after 8-10 sessions,
  exit at market to free up BO cash for higher momentum opportunities.
- T+2 Settlement Rule: DSE settlement is T+2 (shares locked on Day 0, Day 1, Day 2).
- Zero Averaging-Down Rule: NEVER buy additional shares on Day 1 or Day 2 if price falls!
  Averaging down into an illiquid/circuit-locked DSE stock turns a calculated 1.5% risk
  into a catastrophic trap.
- Day 2 Delivery Exit: If price closes below ৳${stock.stopLoss.toFixed(1)} on Day 2/3,
  cut the trade instantly without hesitation.
=====================================================`;
  }, [stock, sizingPlan, netTradeTP1, netTradeTP2]);

  const handleCopyPlaybook = () => {
    navigator.clipboard.writeText(playbookText);
    setCopiedPlaybook(true);
    setTimeout(() => setCopiedPlaybook(false), 3000);
  };

  return (
    <div className={`font-mono text-slate-100 ${isEmbedded ? '' : 'bg-[#0b111e] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6'}`}>
      
      {/* 1. Pre-Trade Executive Summary Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              {stock.symbol}
            </h2>
            <span className={`text-xs px-2 py-0.5 rounded font-bold border ${
              stock.category === 'Z'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              Cat {stock.category}
            </span>
            {stock.fundamentalsSource === 'DEFAULT_ESTIMATE' && (
              <span
                title="Category, P/E, Float %, and Record Date are default estimates — import DSE Fundamentals CSV or verify on dsebd.org"
                className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold"
              >
                Unverified Est. (Cat/Fund)
              </span>
            )}
            {stock.fundamentalsSource === 'USER_IMPORTED' && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 font-bold">
                Verified CSV Fundamentals
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded font-bold border ${
              stock.marketBoard === 'SME'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
            }`}>
              {stock.marketBoard === 'SME' ? 'DSE SME Growth Board' : 'DSE Main Board'}
            </span>
            <span className="text-xs text-slate-400 font-sans">
              &bull; {stock.sector}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-1">
            {stock.name} &bull; Pre-Trade Verification &amp; Asymmetric Execution Blueprint
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenChart && (
            <button
              onClick={() => onOpenChart(stock)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Full Chart</span>
            </button>
          )}
          <button
            onClick={handleCopyTicket}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-all cursor-pointer"
          >
            {copiedTicket ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copiedTicket ? 'Ticket Copied!' : 'Copy Order Ticket'}</span>
          </button>
        </div>
      </div>

      {/* 2. Overarching Pre-Trade Clearance Verdict Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        isFullyCleared
          ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
          : isPartiallyCleared
          ? 'bg-amber-950/30 border-amber-500/50 text-amber-300'
          : 'bg-rose-950/30 border-rose-500/50 text-rose-300'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            isFullyCleared
              ? 'bg-emerald-500/20 text-emerald-400'
              : isPartiallyCleared
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-rose-500/20 text-rose-400'
          }`}>
            {isFullyCleared ? (
              <ShieldCheck className="h-6 w-6" />
            ) : isPartiallyCleared ? (
              <AlertTriangle className="h-6 w-6" />
            ) : (
              <XCircle className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-sm uppercase tracking-wider">
                {isFullyCleared
                  ? 'CLEAR FOR EXECUTION — ALL 7 CONFLUENCE CRITERIA MET'
                  : isPartiallyCleared
                  ? `CONDITIONAL SETUP — ${passedChecksCount}/7 CRITERIA MET`
                  : `SETUP NOT READY — ONLY ${passedChecksCount}/7 CRITERIA MET`}
              </span>
              {stock.category === 'Z' && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                  CAT Z GOVERNANCE RISK
                </span>
              )}
              {stock.category === 'B' && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  CAT B CAUTION
                </span>
              )}
              {stock.dataQuality === 'LIMITED_HISTORY' && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  LIMITED HISTORY (&lt;20 BARS)
                </span>
              )}
            </div>
            <p className="text-xs opacity-90 font-sans mt-0.5">
              {stock.dataQuality === 'LIMITED_HISTORY'
                ? 'Fewer than 20 daily bars available; moving average & ML indicators carry lower statistical confidence.'
                : stock.category === 'Z'
                ? 'Category Z issue: elevated settlement delay and illiquidity risk — enforce strict position cap.'
                : stock.category === 'B'
                ? 'Category B issue: verify corporate governance, liquidity, and record date on dsebd.org before entry.'
                : isFullyCleared
                ? 'High statistical edge: Stage 2 trend, institutional volume surge, safe entry zone, and positive ML expectancy.'
                : 'Trade with conservative sizing. Ensure entry limit is placed inside the consolidation base to prevent T+2 lockup.'}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] uppercase tracking-wider block opacity-75">Algorithmic Win Rate</span>
          <span className="text-xl font-black font-mono">
            {Math.round((stock.mlProbability || 0.5) * 100)}%
          </span>
        </div>
      </div>

      {/* 3. The 5 Golden Execution Numbers (Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Current Price */}
        <div className="p-3.5 rounded-xl bg-[#070b13] border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Current Price (CMP)</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-black text-white">৳{stock.lastPrice.toFixed(1)}</span>
            <span className={`text-xs font-bold ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-sans block mt-1">
            Vol: {(stock.volume / 1000).toFixed(0)}k | ৳{stock.turnoverCr.toFixed(2)} Cr
          </span>
        </div>

        {/* Entry Zone */}
        <div className="p-3.5 rounded-xl bg-[#070b13] border border-cyan-500/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-cyan-400 uppercase tracking-wider block">Entry Limit Zone</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
              {stock.lastPrice >= stock.entryZoneLow && stock.lastPrice <= stock.entryZoneHigh ? 'IN BUY ZONE' : 'EXTENDED'}
            </span>
          </div>
          <div className="text-lg font-black text-cyan-300 mt-0.5">
            ৳{stock.entryZoneLow.toFixed(1)} - ৳{stock.entryZoneHigh.toFixed(1)}
          </div>
          <span className="text-[10px] text-slate-400 font-sans block mt-1">
            Max chase limit: ৳{(stock.entryZoneHigh * 1.025).toFixed(1)}
          </span>
        </div>

        {/* Structural Stop Loss */}
        <div className="p-3.5 rounded-xl bg-[#070b13] border border-rose-500/40">
          <span className="text-[10px] text-rose-400 uppercase tracking-wider block">Stop Loss (Exit Trigger)</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-black text-rose-400">৳{stock.stopLoss.toFixed(1)}</span>
            <span className="text-xs text-rose-300 font-bold">
              (-{Math.round(((stock.lastPrice - stock.stopLoss) / stock.lastPrice) * 100)}%)
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-sans block mt-1">
            Risk: ৳{(stock.lastPrice - stock.stopLoss).toFixed(1)} / share
          </span>
        </div>

        {/* Take Profit 1 */}
        <div className="p-3.5 rounded-xl bg-[#070b13] border border-emerald-500/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider block">Target 1 (Scale 50%)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
              +{Math.round(((stock.targetPrice1 - stock.lastPrice) / stock.lastPrice) * 100)}%
            </span>
          </div>
          <div className="text-lg font-black text-emerald-400 mt-0.5">
            ৳{stock.targetPrice1.toFixed(1)}
          </div>
          <span className="text-[10px] text-slate-400 font-sans block mt-1">
            Gain: +৳{(stock.targetPrice1 - stock.lastPrice).toFixed(1)} / share
          </span>
        </div>

        {/* Target 2 & R:R */}
        <div className="p-3.5 rounded-xl bg-[#070b13] border border-purple-500/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-purple-400 uppercase tracking-wider block">Target 2 &amp; R:R</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold font-mono">
              {stock.riskRewardRatio.toFixed(1)}:1 R:R
            </span>
          </div>
          <div className="text-lg font-black text-purple-300 mt-0.5">
            ৳{stock.targetPrice2.toFixed(1)}
          </div>
          <span className="text-[10px] text-slate-400 font-sans block mt-1">
            +{Math.round(((stock.targetPrice2 - stock.lastPrice) / stock.lastPrice) * 100)}% runner target
          </span>
        </div>
      </div>

      {/* 4. DSE Market Realities: Circuit Breakers, T+2 Calendar, Corporate Actions & Record Date, and Liquidity Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* DSE Circuit Breaker Limits & T+2 Price Corridor */}
        <div className="p-4 rounded-xl bg-[#070b13] border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Circuit &amp; T+2 Corridor
              </span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
              liquidityStatus.isNearUpperCircuit
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              {liquidityStatus.headroomToUpperPct.toFixed(1)}% Headroom Today
            </span>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            {/* Daily Session Limit */}
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Today's Ceiling (T+0):</span>
              <span className="font-bold text-amber-300">৳{liquidityStatus.upperCircuit.toFixed(1)} (+{liquidityStatus.dailyCircuitPct.toFixed(1)}%)</span>
            </div>
            {/* 3-Session T+2 Compounded Expansion Ceiling */}
            <div className="flex justify-between items-center text-slate-300 border-t border-slate-800/80 pt-1">
              <span className="text-slate-400">T+2 Max Ceiling (3-Day):</span>
              <span className="font-bold text-emerald-400">৳{liquidityStatus.t2MaxCeilingPrice.toFixed(1)} (+{liquidityStatus.t2MaxUpsidePct.toFixed(1)}%)</span>
            </div>
            {/* 3-Session T+2 Compounded Floor */}
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">T+2 Trapped Floor (3-Day):</span>
              <span className="font-bold text-rose-400">৳{liquidityStatus.t2MaxFloorPrice.toFixed(1)} (-{liquidityStatus.t2MaxDownsidePct.toFixed(1)}%)</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">TP1 / TP2 Reachable:</span>
              <span className="text-emerald-300 font-bold">
                {liquidityStatus.isTarget1WithinT2Corridor && liquidityStatus.isTarget2WithinT2Corridor ? '✓ Both within T+2 Corridor' : '✓ Target 1 within T+2'}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-300 bg-[#0b111e] p-2 rounded-lg border border-slate-800 font-sans leading-relaxed">
            <strong className="text-white">DSE Compounded Rule: </strong>
            Daily circuit resets each morning. Across your 3-session T+2 holding cycle, price can rise up to <span className="text-emerald-400 font-bold">+{liquidityStatus.t2MaxUpsidePct}%</span> to hit targets, but can also drop <span className="text-rose-400 font-bold">-{liquidityStatus.t2MaxDownsidePct}%</span> if trapped limit-down. Buying near base limits downside.
          </p>

          {liquidityStatus.circuitWarningMessage && (
            <p className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 font-sans">
              {liquidityStatus.circuitWarningMessage}
            </p>
          )}
        </div>

        {/* T+2 Settlement & Liquidity Trap Defense */}
        <div className="p-4 rounded-xl bg-[#070b13] border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                T+2 Settlement Calendar
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
              CDBL Cycle
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Execution Date (T+0):</span>
              <span className="font-bold text-white font-mono">Today (Order Placed)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">CDBL Clearing (T+1):</span>
              <span className="font-bold text-slate-300 font-mono">Next Business Day</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-800 pt-1">
              <span className="text-emerald-400 font-bold">Salable Exit Date (T+2):</span>
              <span className="font-bold text-emerald-400 font-mono">{liquidityStatus.t2SettlementDate}</span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-[#0b111e] border border-slate-800 text-[11px] text-slate-300 font-sans">
            <span className="font-bold text-white">Settlement Rule: </span>
            In DSE, you are locked into the position until T+2 settlement completes. Do not chase breakout extensions greater than 3.5% above the pivot.
          </div>
        </div>

        {/* Corporate Actions & Record Date Lockout */}
        <div className="p-4 rounded-xl bg-[#070b13] border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Record Date Lockout
              </span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
              corporateAction?.lockoutRisk === 'CRITICAL_T2_LOCKOUT'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                : corporateAction?.lockoutRisk === 'APPROACHING_CAUTION'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : stock.fundamentalsSource === 'DEFAULT_ESTIMATE' && !corporateAction
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              {corporateAction
                ? `${corporateAction.daysToRecordDate}d to Record`
                : stock.fundamentalsSource === 'DEFAULT_ESTIMATE'
                ? 'Unverified DB'
                : 'No Record Date'}
            </span>
          </div>

          {corporateAction ? (
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Record Date (Halts):</span>
                <span className="font-bold text-white">{corporateAction.recordDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Dividend Declared:</span>
                <span className="font-bold text-emerald-400 truncate max-w-[140px]" title={corporateAction.details}>
                  {corporateAction.dividendCashPct ? `${corporateAction.dividendCashPct}% Cash` : ''}
                  {corporateAction.dividendBonusPct ? ` + ${corporateAction.dividendBonusPct}% Bonus` : ''}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800 pt-0.5">
                <span className="text-slate-400">Est. Ex-Price:</span>
                <span className="font-bold text-cyan-300">৳{corporateAction.estimatedExPrice?.toFixed(1) ?? '—'}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[#0b111e] border border-slate-800 text-[10px] text-slate-300 font-sans">
                {corporateAction.lockoutRisk === 'CRITICAL_T2_LOCKOUT' ? (
                  <span className="text-rose-300 font-bold">
                    ⚠️ DSE Rule: Trading halts on Record Date ({corporateAction.recordDate}). If bought now, shares will be frozen during T+2!
                  </span>
                ) : (
                  <span>
                    Book closure in {corporateAction.daysToRecordDate}d. Close position before record date if avoiding dividend tax.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[#0b111e] border border-slate-800 text-slate-300 font-sans leading-relaxed text-[11px]">
                {stock.fundamentalsSource === 'DEFAULT_ESTIMATE' ? (
                  <>
                    <span className="text-amber-300 font-bold">⚠ Unverified Local Calendar: </span>
                    No record date imported for {stock.symbol}. Verify upcoming AGM/Record Date on dsebd.org or import via Upload &rarr; Fundamentals.
                  </>
                ) : (
                  <>
                    <span className="text-emerald-400 font-bold">✓ Clear Window: </span>
                    No immediate AGM/Dividend record date or trading suspension scheduled. Clear for swing breakout trading without book closure risk.
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sector Tail-Wind & Liquidity Health */}
        <div className="p-4 rounded-xl bg-[#070b13] border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Sector &amp; Float Health
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
              {stock.sectorStrength.toUpperCase()}
            </span>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Sector Name:</span>
              <span className="font-bold text-white truncate max-w-[140px]">{stock.sector}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Free Float:</span>
              <span className="font-bold text-slate-300">
                {stock.freeFloatPct}% ({stock.freeFloatPct > 30 ? 'Liquid' : 'Tight Float'})
                {stock.fundamentalsSource === 'DEFAULT_ESTIMATE' && <span className="text-amber-300/80 ml-1">(Est)</span>}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Audited P/E:</span>
              <span className="font-bold text-slate-300">
                {stock.pe !== undefined ? `${stock.pe.toFixed(1)}x` : 'N/A'}
                {stock.fundamentalsSource === 'DEFAULT_ESTIMATE' && <span className="text-amber-300/80 ml-1">(Est)</span>}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Market Beta vs DSEX:</span>
              <span className="font-bold text-cyan-400">{stock.beta.toFixed(2)}x</span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-[#0b111e] border border-slate-800 text-[11px] text-slate-300 font-sans flex items-center justify-between">
            <span>Liquidity Depth:</span>
            <span className="font-bold text-emerald-400 font-mono">{liquidityStatus.liquidityTier}</span>
          </div>
        </div>
      </div>

      {/* 5. 7-Point Pre-Trade "GO / NO-GO" Checklist */}
      <div className="p-4 rounded-xl bg-[#070b13] border border-slate-800 space-y-3 font-sans">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              DSE 7-Point Algorithmic Pre-Flight Checklist
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-300">
            Passed: <strong className={isFullyCleared ? 'text-emerald-400' : 'text-amber-400'}>{passedChecksCount} / 7</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
          {checks.map(chk => (
            <div
              key={chk.id}
              className={`p-3 rounded-xl border transition-all ${
                chk.passed
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-rose-950/20 border-rose-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white font-mono">{chk.label}</span>
                {chk.passed ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1">
                    <Check className="h-3 w-3" /> PASS
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> FAIL
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                {chk.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Interactive Position Sizing & BO Commitment Calculator */}
      <div className="p-4 rounded-xl bg-[#070b13] border border-purple-500/30 space-y-4 font-sans">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Exact BO Account Capital &amp; Risk Sizing Calculator
            </h3>
          </div>
          <span className="text-xs text-purple-300 font-mono tabular-nums">
            {regimeGuidance.label} ({Math.round(regimeGuidance.sizeMultiplier * 100)}% &rarr; {effectiveRiskPct}% Eff. Risk)
          </span>
        </div>

        {/* Capital & Risk Selector Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              Your BO Account Portfolio Capital (BDT)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={portfolioCapital}
                onChange={e => setPortfolioCapital(Math.max(10000, Number(e.target.value) || 0))}
                className="w-full bg-[#0b111e] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-purple-400"
              />
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              {[200000, 500000, 1000000, 2500000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setPortfolioCapital(amt)}
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold cursor-pointer transition-colors ${
                    portfolioCapital === amt
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ৳{(amt / 100000).toFixed(0)}L
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              Max Risk Per Trade (% of Capital)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="5.0"
                value={riskTolerancePct}
                onChange={e => setRiskTolerancePct(Number(e.target.value) || 1.5)}
                className="w-full bg-[#0b111e] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-purple-400"
              />
              <span className="text-xs text-slate-400">%</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-1">
              Regime allowance: ৳{Math.round((portfolioCapital * effectiveRiskPct) / 100).toLocaleString()} ({effectiveRiskPct}%)
            </span>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              Brokerage Commission (Retail Standard: 0.40%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.05"
                min="0.10"
                max="1.0"
                value={brokerageRatePct}
                onChange={e => setBrokerageRatePct(Number(e.target.value) || 0.40)}
                className="w-full bg-[#0b111e] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-purple-400"
              />
              <span className="text-xs text-slate-400">%</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-1">
              Includes buy + sell fee deduction
            </span>
          </div>
        </div>

        {/* Calculated Results Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 font-mono">
          <div className="p-3 rounded-xl bg-[#0b111e] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block mb-0.5">Quantity to Buy</span>
            <div className="text-xl font-black text-white">
              {sizingPlan.suggestedShares.toLocaleString()}
              <span className="text-xs font-normal text-slate-400 ml-1">shares</span>
            </div>
            <span className="text-[10px] text-purple-400 font-bold block mt-0.5">
              ৳{sizingPlan.positionValueBDT.toLocaleString()} ({sizingPlan.portfolioAllocationPct}% portfolio)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0b111e] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block mb-0.5">Max Loss at SL</span>
            <div className="text-xl font-black text-rose-400">
              -৳{sizingPlan.maxLossAtStopBDT.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
              Capped at {effectiveRiskPct}% of BO account
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0b111e] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block mb-0.5">Net Profit TP1</span>
            <div className="text-xl font-black text-emerald-400">
              +৳{netTradeTP1.netGainBDT.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-400/80 font-sans block mt-0.5">
              +{netTradeTP1.netGainPct}% (net of all fees)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0b111e] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block mb-0.5">Net Profit TP2</span>
            <div className="text-xl font-black text-purple-400">
              +৳{netTradeTP2.netGainBDT.toLocaleString()}
            </div>
            <span className="text-[10px] text-purple-400/80 font-sans block mt-0.5">
              +{netTradeTP2.netGainPct}% (runner target)
            </span>
          </div>
        </div>
      </div>

      {/* 7. DSE 3-Stage Trade Lifecycle & Execution Playbook */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#0e172a] via-[#091122] to-[#070b13] border border-emerald-500/40 shadow-2xl space-y-4">
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  7. DSE 3-Stage Trade Lifecycle &amp; Execution Playbook
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  ACTIVE RULESET
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Dynamic execution rules for {stock.symbol} &bull; {sizingPlan.suggestedShares.toLocaleString()} shares (৳{sizingPlan.positionValueBDT.toLocaleString()})
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyPlaybook}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              copiedPlaybook
                ? 'bg-emerald-500 text-slate-950 font-black'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {copiedPlaybook ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5 text-emerald-400" />}
            <span>{copiedPlaybook ? 'Playbook Copied!' : 'Copy Execution Playbook'}</span>
          </button>
        </div>

        {/* Visual Lifecycle Stepper Pipeline */}
        <div className="p-3 rounded-xl bg-[#070b13] border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase font-mono block mb-2 font-bold tracking-wider">
            Execution Flow Pipeline
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
            {/* Step 1 */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-cyan-500/30 relative">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-cyan-400 font-bold">1. Entry &amp; Initial Risk</span>
                <span className="text-[10px] text-slate-400 font-mono">Day 0</span>
              </div>
              <div className="text-sm font-black text-white font-mono">
                ৳{stock.lastPrice.toFixed(1)}
              </div>
              <div className="text-[11px] text-rose-400 font-mono mt-0.5">
                Stop Loss: ৳{stock.stopLoss.toFixed(1)} (-{Math.round(((stock.lastPrice - stock.stopLoss) / stock.lastPrice) * 100)}%)
              </div>
              <p className="text-[10px] text-slate-400 font-sans mt-1">
                Buy {sizingPlan.suggestedShares.toLocaleString()} shares strictly within ৳{stock.entryZoneLow.toFixed(1)}–৳{stock.entryZoneHigh.toFixed(1)}.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 relative">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-emerald-400 font-bold">2. TP1 Scale &amp; Breakeven</span>
                <span className="text-[10px] text-emerald-400/80 font-mono">De-Risk</span>
              </div>
              <div className="text-sm font-black text-white font-mono">
                ৳{stock.targetPrice1.toFixed(1)}
                <span className="text-xs font-bold text-emerald-400 ml-1.5">
                  (+{Math.round(((stock.targetPrice1 - stock.lastPrice) / stock.lastPrice) * 100)}%)
                </span>
              </div>
              <div className="text-[11px] text-emerald-300 font-mono mt-0.5">
                Sell {Math.floor(sizingPlan.suggestedShares / 2).toLocaleString()} shares &bull; Move SL to ৳{stock.lastPrice.toFixed(1)}
              </div>
              <p className="text-[10px] text-slate-400 font-sans mt-1">
                Locks +৳{Math.round(netTradeTP1.netGainBDT * (Math.floor(sizingPlan.suggestedShares / 2) / Math.max(1, sizingPlan.suggestedShares))).toLocaleString()} profit. Trade becomes 100% risk-free.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/40 relative">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-purple-400 font-bold">3. 50% Runner &amp; Trail</span>
                <span className="text-[10px] text-purple-400/80 font-mono">Expansion</span>
              </div>
              <div className="text-sm font-black text-white font-mono">
                ৳{stock.targetPrice2.toFixed(1)}
                <span className="text-xs font-bold text-purple-400 ml-1.5">
                  (+{Math.round(((stock.targetPrice2 - stock.lastPrice) / stock.lastPrice) * 100)}%)
                </span>
              </div>
              <div className="text-[11px] text-purple-300 font-mono mt-0.5">
                Trail {Math.ceil(sizingPlan.suggestedShares / 2).toLocaleString()} shares on 20 EMA
              </div>
              <p className="text-[10px] text-slate-400 font-sans mt-1">
                Ride Stage 2 markup until daily close below 20 EMA (৳{(stock.technicalParams?.ma20 || stock.ma20) ? (stock.technicalParams?.ma20 || stock.ma20)!.toFixed(1) : (stock.lastPrice * 0.94).toFixed(1)}) or TP2.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Detailed Stage Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Stage 1 Details */}
          <div className="p-4 rounded-xl bg-[#0b111e] border border-emerald-500/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  STAGE 1 &bull; TP1 SCALE-OUT
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  ৳{stock.targetPrice1.toFixed(1)}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white mb-1">
                Scale 50% &amp; Move Stop to Breakeven
              </h4>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                When {stock.symbol} touches TP1, sell exactly <strong>{Math.floor(sizingPlan.suggestedShares / 2).toLocaleString()} shares</strong>.
                This instantly deposits <strong>+৳{Math.round(netTradeTP1.netGainBDT * (Math.floor(sizingPlan.suggestedShares / 2) / Math.max(1, sizingPlan.suggestedShares))).toLocaleString()}</strong> in
                net profit into your BO account.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-[10px] font-mono text-emerald-200 space-y-1">
              <div className="font-bold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>MANDATORY ORDER ACTION:</span>
              </div>
              <p className="font-sans text-slate-300">
                Cancel original SL at ৳{stock.stopLoss.toFixed(1)}. Replace with a Stop Loss at Entry (<strong>৳{stock.lastPrice.toFixed(1)}</strong>). Position is now completely risk-free.
              </p>
            </div>
          </div>

          {/* Card 2: Stage 2 Details */}
          <div className="p-4 rounded-xl bg-[#0b111e] border border-purple-500/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  STAGE 2 &bull; 50% RUNNER
                </span>
                <span className="text-xs font-mono text-purple-400 font-bold">
                  ৳{stock.targetPrice2.toFixed(1)}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white mb-1">
                Trail on Daily 20-Day EMA
              </h4>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                Keep the remaining <strong>{Math.ceil(sizingPlan.suggestedShares / 2).toLocaleString()} shares</strong> active
                to capture larger multi-week markup. Potential runner net gain: <strong>+৳{Math.round(netTradeTP2.netGainBDT * (Math.ceil(sizingPlan.suggestedShares / 2) / Math.max(1, sizingPlan.suggestedShares))).toLocaleString()}</strong>.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-500/40 text-[10px] font-mono text-purple-200 space-y-1">
              <div className="font-bold text-purple-300 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 shrink-0" />
                <span>TRAILING EXIT BENCHMARK:</span>
              </div>
              <p className="font-sans text-slate-300">
                Do NOT sell on intraday red ticks. Exit the runner ONLY when price registers a <strong>daily close below the 20-day EMA (৳{(stock.technicalParams?.ma20 || stock.ma20) ? (stock.technicalParams?.ma20 || stock.ma20)!.toFixed(1) : (stock.lastPrice * 0.94).toFixed(1)})</strong> or reaches TP2.
              </p>
            </div>
          </div>

          {/* Card 3: Stage 3 Details */}
          <div className="p-4 rounded-xl bg-[#0b111e] border border-amber-500/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  STAGE 3 &bull; CAPITAL VELOCITY
                </span>
                <span className="text-xs font-mono text-amber-400 font-bold">
                  8–10 SESSIONS
                </span>
              </div>
              <h4 className="text-xs font-bold text-white mb-1">
                Time-Stop &amp; T+2 Anti-Averaging
              </h4>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                If {stock.symbol} consolidates without hitting TP1 after <strong>8 to 10 trading sessions</strong>, exit at market. Stagnant stocks tie down capital that could be deployed into faster movers.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-[10px] font-mono text-amber-200 space-y-1">
              <div className="font-bold text-amber-300 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>T+2 ZERO-AVERAGING DISCIPLINE:</span>
              </div>
              <p className="font-sans text-slate-300">
                Shares are locked during Day 0–2. <strong>NEVER average down</strong> on red days. If delivery price closes below ৳{stock.stopLoss.toFixed(1)} on Day 2, exit immediately without emotion.
              </p>
            </div>
          </div>
        </div>

        {/* Operational Trader Discipline Footnote */}
        <div className="p-3 rounded-xl bg-[#070b13] border border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-sans text-[11px]">
              <strong>Execution Principle:</strong> A professional DSE trader never questions the stop loss or waits for "one more green day". Discipline creates consistent asymmetric compound returns.
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-slate-500">Max BO Risk:</span>
            <span className="font-bold text-rose-400">৳{sizingPlan.maxLossAtStopBDT.toLocaleString()}</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-500">Est. Total Profit (TP1+TP2):</span>
            <span className="font-bold text-emerald-400">
              +৳{(Math.round(netTradeTP1.netGainBDT * (Math.floor(sizingPlan.suggestedShares / 2) / Math.max(1, sizingPlan.suggestedShares))) + Math.round(netTradeTP2.netGainBDT * (Math.ceil(sizingPlan.suggestedShares / 2) / Math.max(1, sizingPlan.suggestedShares)))).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PreTradeCockpit;
