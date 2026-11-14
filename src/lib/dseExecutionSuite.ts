/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DseStockItem, MarketBreadth, ActiveTradePlan } from '../types/dse';

export interface DseFeeBreakdown {
  brokerageBuyBDT: number;
  brokerageSellBDT: number;
  turnoverTaxBDT: number;
  cdblChargesBDT: number;
  totalFeesBDT: number;
  feePercentage: number;
}

export interface DseNetTradeResult {
  entryPrice: number;
  exitPrice: number;
  shares: number;
  investedBDT: number;
  grossGainBDT: number;
  grossGainPct: number;
  fees: DseFeeBreakdown;
  netGainBDT: number;
  netGainPct: number;
  isProfit: boolean;
}

export interface DsePositionSizingPlan {
  portfolioCapitalBDT: number;
  riskTolerancePct: number;
  riskBudgetBDT: number;
  entryPrice: number;
  stopLossPrice: number;
  targetPrice1: number;
  targetPrice2: number;
  suggestedShares: number;
  positionValueBDT: number;
  portfolioAllocationPct: number;
  maxLossAtStopBDT: number;
  netProfitAtTP1BDT: number;
  netProfitAtTP1Pct: number;
  netProfitAtTP2BDT: number;
  netProfitAtTP2Pct: number;
  netRiskRewardRatio: number;
}

export interface DseLiquidityAndCircuitStatus {
  lastPrice: number;
  prevClose: number;
  dailyCircuitPct: number; // 10% (Main) or 20% (SME)
  upperCircuit: number; // Today's intraday ceiling limit
  lowerCircuit: number; // Today's intraday floor limit
  headroomToUpperPct: number; // Headroom remaining TODAY
  distanceToLowerPct: number;
  isNearUpperCircuit: boolean;
  isNearLowerCircuit: boolean;
  circuitWarningMessage?: string;
  
  // T+2 Multi-Day Compounded Price Expansion Corridor (3 sessions)
  t2CompoundedDays: number;
  t2MaxUpsidePct: number;    // +33.1% for Main (+10% daily * 3 sessions compounded) or +72.8% for SME
  t2MaxDownsidePct: number;  // -27.1% for Main (-10% daily * 3 sessions compounded) or -48.8% for SME
  t2MaxCeilingPrice: number; // Theoretical 3-session compounded upper bound
  t2MaxFloorPrice: number;   // Theoretical 3-session compounded lower bound
  isTarget1WithinT2Corridor: boolean;
  isTarget2WithinT2Corridor: boolean;

  advShares: number;
  positionShareOfAdvPct: number;
  liquidityTier: 'EXCELLENT' | 'GOOD' | 'CAUTION' | 'ILLIQUID_RISK';
  liquidityMessage: string;
  t2SettlementDate: string;
}

export interface TurnoverConcentrationStats {
  totalMarketTurnoverCr: number;
  top5TurnoverCr: number;
  top5ConcentrationPct: number;
  top10TurnoverCr: number;
  top10ConcentrationPct: number;
  regime: 'INSTITUTIONAL_HEAVY' | 'HEALTHY_BROAD_MARKET' | 'DIFFUSE_SPECULATIVE';
  analysis: string;
  topTurnoverStocks: { symbol: string; turnoverCr: number; sharePct: number; changePct: number }[];
}

/**
 * Standard DSE Transaction Cost Parameters:
 * - Brokerage: 0.40% buy + 0.40% sell (standard retail DSE brokerage)
 * - Gov Turnover Tax: 0.05% on sale turnover
 * - CDBL Fees: ~0.015% + settlement charges
 */
export function calculateDseNetTrade(
  entryPrice: number,
  exitPrice: number,
  shares: number,
  brokerageRatePct: number = 0.40
): DseNetTradeResult {
  const investedBDT = Math.round(entryPrice * shares * 100) / 100;
  const exitValueBDT = Math.round(exitPrice * shares * 100) / 100;
  const grossGainBDT = Math.round((exitValueBDT - investedBDT) * 100) / 100;
  const grossGainPct = investedBDT > 0 ? Math.round(((exitPrice - entryPrice) / entryPrice) * 1000) / 10 : 0;

  const brokerageBuyBDT = Math.round(investedBDT * (brokerageRatePct / 100) * 100) / 100;
  const brokerageSellBDT = Math.round(exitValueBDT * (brokerageRatePct / 100) * 100) / 100;
  const turnoverTaxBDT = Math.round(exitValueBDT * 0.0005 * 100) / 100; // 0.05%
  const cdblChargesBDT = Math.round((investedBDT + exitValueBDT) * 0.00015 * 100) / 100 + 2.50; // CDBL transaction + settlement

  const totalFeesBDT = Math.round((brokerageBuyBDT + brokerageSellBDT + turnoverTaxBDT + cdblChargesBDT) * 100) / 100;
  const feePercentage = investedBDT > 0 ? Math.round((totalFeesBDT / investedBDT) * 1000) / 10 : 0.85;

  const netGainBDT = Math.round((grossGainBDT - totalFeesBDT) * 100) / 100;
  const netGainPct = investedBDT > 0 ? Math.round((netGainBDT / investedBDT) * 1000) / 10 : 0;

  return {
    entryPrice,
    exitPrice,
    shares,
    investedBDT,
    grossGainBDT,
    grossGainPct,
    fees: {
      brokerageBuyBDT,
      brokerageSellBDT,
      turnoverTaxBDT,
      cdblChargesBDT,
      totalFeesBDT,
      feePercentage,
    },
    netGainBDT,
    netGainPct,
    isProfit: netGainBDT > 0,
  };
}

/**
 * Calculates exact share allocation based on Portfolio Size and Fixed-Fractional Risk Budget
 */
export function calculateDsePositionSizing(
  portfolioCapitalBDT: number,
  riskTolerancePct: number, // e.g. 1.5%
  entryPrice: number,
  stopLossPrice: number,
  targetPrice1: number,
  targetPrice2: number,
  brokerageRatePct: number = 0.40
): DsePositionSizingPlan {
  const riskBudgetBDT = Math.round(portfolioCapitalBDT * (riskTolerancePct / 100));
  const perShareRiskBDT = Math.max(0.1, entryPrice - stopLossPrice);

  // Exact share quantity to cap loss at risk budget
  let suggestedShares = Math.floor(riskBudgetBDT / perShareRiskBDT);
  // Cap position value at 25% of total portfolio capital for diversification
  const maxPositionValueBDT = portfolioCapitalBDT * 0.25;
  if (suggestedShares * entryPrice > maxPositionValueBDT) {
    suggestedShares = Math.floor(maxPositionValueBDT / entryPrice);
  }
  suggestedShares = Math.max(1, suggestedShares);

  const positionValueBDT = Math.round(suggestedShares * entryPrice);
  const portfolioAllocationPct = Math.round((positionValueBDT / portfolioCapitalBDT) * 1000) / 10;

  const stopLossResult = calculateDseNetTrade(entryPrice, stopLossPrice, suggestedShares, brokerageRatePct);
  const tp1Result = calculateDseNetTrade(entryPrice, targetPrice1, suggestedShares, brokerageRatePct);
  const tp2Result = calculateDseNetTrade(entryPrice, targetPrice2, suggestedShares, brokerageRatePct);

  const maxLossAtStopBDT = Math.abs(stopLossResult.netGainBDT);
  const netProfitAtTP1BDT = tp1Result.netGainBDT;
  const netProfitAtTP2BDT = tp2Result.netGainBDT;

  const netRiskRewardRatio = maxLossAtStopBDT > 0
    ? Math.round((netProfitAtTP1BDT / maxLossAtStopBDT) * 10) / 10
    : 2.5;

  return {
    portfolioCapitalBDT,
    riskTolerancePct,
    riskBudgetBDT,
    entryPrice,
    stopLossPrice,
    targetPrice1,
    targetPrice2,
    suggestedShares,
    positionValueBDT,
    portfolioAllocationPct,
    maxLossAtStopBDT,
    netProfitAtTP1BDT,
    netProfitAtTP1Pct: tp1Result.netGainPct,
    netProfitAtTP2BDT,
    netProfitAtTP2Pct: tp2Result.netGainPct,
    netRiskRewardRatio,
  };
}

/**
 * Calculates T+2 settlement date skipping Friday and Saturday (DSE weekend)
 */
export function calculateDseT2SettlementDate(fromDate?: string): string {
  const date = fromDate ? new Date(fromDate) : new Date();
  let tradingDaysAdded = 0;

  while (tradingDaysAdded < 2) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    // Friday = 5, Saturday = 6 in JS
    if (day !== 5 && day !== 6) {
      tradingDaysAdded++;
    }
  }

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

/**
 * Evaluates Circuit Limit headroom and Liquidity Slippage Viability
 */
export function evaluateDseLiquidityAndCircuit(
  stock: DseStockItem,
  sharesToBuy: number = 1000
): DseLiquidityAndCircuitStatus {
  const lastPrice = stock.lastPrice;
  const prevClose = stock.bars && stock.bars.length > 1
    ? stock.bars[stock.bars.length - 2].close
    : lastPrice / (1 + (stock.changePercent || 0) / 100);

  // Standard DSE circuit: ±10% for Main Board, ±20% for SME Board
  const circuitPct = stock.isSme || stock.marketBoard === 'SME' ? 0.20 : 0.10;
  const upperCircuit = Math.round(prevClose * (1 + circuitPct) * 10) / 10;
  const lowerCircuit = Math.round(prevClose * (1 - circuitPct) * 10) / 10;

  const headroomToUpperPct = lastPrice > 0 ? Math.round(((upperCircuit - lastPrice) / lastPrice) * 1000) / 10 : 0;
  const distanceToLowerPct = lastPrice > 0 ? Math.round(((lastPrice - lowerCircuit) / lastPrice) * 1000) / 10 : 0;

  const isNearUpperCircuit = headroomToUpperPct <= 1.5;
  const isNearLowerCircuit = distanceToLowerPct <= 2.0;

  let circuitWarningMessage: string | undefined = undefined;
  if (isNearUpperCircuit) {
    circuitWarningMessage = `Upper Circuit Warning: Within ${headroomToUpperPct}% of ceiling (৳${upperCircuit}). High risk of buyer lockout; wait for opening liquidity next session.`;
  } else if (isNearLowerCircuit) {
    circuitWarningMessage = `Floor Risk Warning: Within ${distanceToLowerPct}% of lower circuit (৳${lowerCircuit}). High risk of illiquid sell freeze.`;
  }

  // 20-Day Average Daily Volume (ADV)
  let advShares = stock.volume || 10000;
  if (stock.bars && stock.bars.length > 0) {
    const recentBars = stock.bars.slice(-20);
    const sumVol = recentBars.reduce((sum, b) => sum + (b.volume || 0), 0);
    advShares = Math.round(sumVol / recentBars.length) || stock.volume || 10000;
  }

  const positionShareOfAdvPct = advShares > 0 ? Math.round((sharesToBuy / advShares) * 1000) / 10 : 0;

  let liquidityTier: DseLiquidityAndCircuitStatus['liquidityTier'] = 'EXCELLENT';
  let liquidityMessage = 'High volume depth. Immediate execution with zero slippage.';

  if (positionShareOfAdvPct > 5.0 || stock.turnoverCr < 0.20) {
    liquidityTier = 'ILLIQUID_RISK';
    liquidityMessage = `Illiquidity Warning: Position is ${positionShareOfAdvPct}% of daily volume. High risk of >2% market impact slippage on exit.`;
  } else if (positionShareOfAdvPct > 2.0 || stock.turnoverCr < 0.80) {
    liquidityTier = 'CAUTION';
    liquidityMessage = `Moderate volume: Position is ${positionShareOfAdvPct}% of daily volume. Use limit orders on entry and exit.`;
  } else if (positionShareOfAdvPct > 1.0) {
    liquidityTier = 'GOOD';
    liquidityMessage = 'Healthy depth: Position is comfortably under 2% of daily volume.';
  }

  const t2SettlementDate = calculateDseT2SettlementDate(stock.latestBarDate);

  // 3-Session T+2 Compounded Price Corridor:
  // Day 0 (Entry) -> Day 1 (Clearing) -> Day 2 (Salable Exit)
  // Daily limits reset each session; over 3 sessions, price can expand up to (1 + circuitPct)^3
  const t2CompoundedDays = 3;
  const t2MaxUpsideFactor = Math.pow(1 + circuitPct, 3);
  const t2MaxDownsideFactor = Math.pow(1 - circuitPct, 3);
  const t2MaxUpsidePct = Math.round((t2MaxUpsideFactor - 1) * 1000) / 10; // +33.1% (Main) or +72.8% (SME)
  const t2MaxDownsidePct = Math.round((1 - t2MaxDownsideFactor) * 1000) / 10; // -27.1% (Main) or -48.8% (SME)
  const t2MaxCeilingPrice = Math.round(prevClose * t2MaxUpsideFactor * 10) / 10;
  const t2MaxFloorPrice = Math.round(prevClose * t2MaxDownsideFactor * 10) / 10;

  const isTarget1WithinT2Corridor = (stock.targetPrice1 || 0) <= t2MaxCeilingPrice;
  const isTarget2WithinT2Corridor = (stock.targetPrice2 || 0) <= t2MaxCeilingPrice;

  return {
    lastPrice,
    prevClose: Math.round(prevClose * 10) / 10,
    dailyCircuitPct: circuitPct * 100,
    upperCircuit,
    lowerCircuit,
    headroomToUpperPct,
    distanceToLowerPct,
    isNearUpperCircuit,
    isNearLowerCircuit,
    circuitWarningMessage,
    t2CompoundedDays,
    t2MaxUpsidePct,
    t2MaxDownsidePct,
    t2MaxCeilingPrice,
    t2MaxFloorPrice,
    isTarget1WithinT2Corridor,
    isTarget2WithinT2Corridor,
    advShares,
    positionShareOfAdvPct,
    liquidityTier,
    liquidityMessage,
    t2SettlementDate,
  };
}

/**
 * Computes Institutional Turnover Concentration across DSE Equities
 */
export function calculateDseTurnoverConcentration(stocks: DseStockItem[]): TurnoverConcentrationStats {
  const tradeable = stocks.filter(
    s => !s.isSectorIndex && s.sector !== 'Benchmark' && s.lastPrice > 0 && s.turnoverCr > 0
  );

  const totalMarketTurnoverCr = tradeable.reduce((sum, s) => sum + (s.turnoverCr || 0), 0) || 1;
  const sorted = [...tradeable].sort((a, b) => (b.turnoverCr || 0) - (a.turnoverCr || 0));

  const top5 = sorted.slice(0, 5);
  const top10 = sorted.slice(0, 10);

  const top5TurnoverCr = Math.round(top5.reduce((sum, s) => sum + s.turnoverCr, 0) * 100) / 100;
  const top10TurnoverCr = Math.round(top10.reduce((sum, s) => sum + s.turnoverCr, 0) * 100) / 100;

  const top5ConcentrationPct = Math.round((top5TurnoverCr / totalMarketTurnoverCr) * 1000) / 10;
  const top10ConcentrationPct = Math.round((top10TurnoverCr / totalMarketTurnoverCr) * 1000) / 10;

  let regime: TurnoverConcentrationStats['regime'] = 'HEALTHY_BROAD_MARKET';
  let analysis = 'Capital is distributed across leading blue-chips and growth leaders.';

  if (top10ConcentrationPct >= 45.0) {
    regime = 'INSTITUTIONAL_HEAVY';
    analysis = `Institutional Concentration Alert: Top 10 stocks monopolize ${top10ConcentrationPct}% of total exchange turnover. Focus exclusively on these institutional leaders; secondary stocks will suffer liquidity starvation.`;
  } else if (top10ConcentrationPct < 25.0) {
    regime = 'DIFFUSE_SPECULATIVE';
    analysis = 'Turnover is widely scattered across speculative micro-caps without institutional leadership. Exercise caution on break-outs.';
  }

  const topTurnoverStocks = top10.map(s => ({
    symbol: s.symbol,
    turnoverCr: Math.round(s.turnoverCr * 100) / 100,
    sharePct: Math.round((s.turnoverCr / totalMarketTurnoverCr) * 1000) / 10,
    changePct: Math.round((s.changePercent || 0) * 10) / 10,
  }));

  return {
    totalMarketTurnoverCr: Math.round(totalMarketTurnoverCr * 100) / 100,
    top5TurnoverCr,
    top5ConcentrationPct,
    top10TurnoverCr,
    top10ConcentrationPct,
    regime,
    analysis,
    topTurnoverStocks,
  };
}

export interface RegimeRiskGuidance {
  regime: MarketBreadth['regime'];
  sizeMultiplier: number;       // 1.0 (Bullish), 0.75 (Neutral), 0.50 (Caution), 0.25 (Bearish)
  minConvictionRequired: number; // 68 (Bullish), 72 (Neutral), 76 (Caution), 82 (Bearish)
  label: string;
  guidance: string;
}

/**
 * Scales allowable position risk and minimum conviction threshold based on DSEX & A/D breadth regime.
 */
export function getRegimeRiskGuidance(marketBreadth?: MarketBreadth): RegimeRiskGuidance {
  const regime = marketBreadth?.regime || 'NEUTRAL';
  if (regime === 'BULLISH') {
    return {
      regime,
      sizeMultiplier: 1.0,
      minConvictionRequired: 68,
      label: 'FULL RISK-ON (1.0x Sizing)',
      guidance: 'DSEX breadth is positive. Full fixed-fractional sizing permitted on Stage 2 and multi-day leaders.',
    };
  }
  if (regime === 'NEUTRAL') {
    return {
      regime,
      sizeMultiplier: 0.75,
      minConvictionRequired: 71,
      label: 'SELECTIVE (0.75x Sizing)',
      guidance: 'Mixed market breadth. Concentrate strictly in top relative-strength sectors at 75% standard sizing.',
    };
  }
  if (regime === 'CAUTION') {
    return {
      regime,
      sizeMultiplier: 0.5,
      minConvictionRequired: 76,
      label: 'DEFENSIVE CAUTION (0.50x Sizing)',
      guidance: 'Weak breadth & rising declines. Cut position size in half and tighten stops to avoid T+2 whipsaws.',
    };
  }
  return {
    regime,
    sizeMultiplier: 0.25,
    minConvictionRequired: 82,
    label: 'CAPITAL PRESERVATION (0.25x Sizing)',
    guidance: 'Bearish DSEX tape. Preserve BO cash; deploy quarter-size only on rare elite institutional leaders.',
  };
}

export interface SectorConcentrationCheck {
  sector: string;
  activeCountInSector: number;
  totalActivePlans: number;
  sectorSharePct: number;
  isOverConcentrated: boolean;
  warningMessage?: string;
}

/**
 * Checks whether adding a trade in the stock's sector over-concentrates portfolio risk in correlated DSE tickers.
 */
export function evaluateSectorConcentration(
  stock: DseStockItem,
  trackedPlans: ActiveTradePlan[]
): SectorConcentrationCheck {
  const openPlans = trackedPlans.filter(
    p => p.status === 'ACTIVE_IN_TRADE' || p.status === 'TP1_HIT' || p.status === 'PENDING_ENTRY'
  );
  const sameSectorOpen = openPlans.filter(
    p => p.sector === stock.sector && p.symbol !== stock.symbol
  );
  const totalWithNew = openPlans.length + 1;
  const activeWithNew = sameSectorOpen.length + 1;
  const sectorSharePct = totalWithNew > 0 ? Math.round((activeWithNew / totalWithNew) * 100) : 100;
  const isOverConcentrated = sameSectorOpen.length >= 2 || (openPlans.length >= 3 && sectorSharePct > 40);

  return {
    sector: stock.sector,
    activeCountInSector: sameSectorOpen.length,
    totalActivePlans: openPlans.length,
    sectorSharePct,
    isOverConcentrated,
    warningMessage: isOverConcentrated
      ? `Sector Concentration Alert: You already track ${sameSectorOpen.length} open setup(s) in ${stock.sector} (${sameSectorOpen.map(p => p.symbol).join(', ')}). Cap correlated sector exposure.`
      : undefined,
  };
}
