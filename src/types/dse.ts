/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ScreenerMode = 'high-conviction' | 'screener' | 'quality' | 'breakout' | 'confluence' | 'monthly' | 'radar' | 'sector-indices' | 'ml-studio' | 'backtester' | 'sector-rotation' | 'profit-optimizer';
export type ScreenerStrategyPreset = 'all' | 'confluence' | 'breakout' | 'multi-day' | 'coiling' | 'monthly';
export type UiCategory = 'All' | 'A' | 'B' | 'Z';
export type MonthlyStateFilter = 'All' | 'CONFIRMED+' | 'TRADE_READY';
export type UniverseMode = 'liquid' | 'curated' | 'full';
export type AssetClassFilter = 'stocks' | 'sectors' | 'all';

export interface MonteCarloPathPoint {
  day: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface MonteCarloBin {
  range: string;
  minVal: number;
  maxVal: number;
  count: number;
  percentage: number;
  isPositive: boolean;
}

export interface MonteCarloResult {
  symbol: string;
  iterations: number;
  forwardDays: number;
  currentPrice: number;
  medianReturnPct: number;
  p10ReturnPct: number;
  p90ReturnPct: number;
  winProbability: number;
  expectedValuePct: number;
  var95Pct: number; // Value at Risk 95%
  cvar95Pct: number; // Conditional VaR
  percentilePaths: MonteCarloPathPoint[];
  distributionBins: MonteCarloBin[];
}

export interface DseCorporateAction {
  recordDate: string; // YYYY-MM-DD
  dividendCashPct?: number; // e.g. 35% cash (৳3.50/share)
  dividendBonusPct?: number; // e.g. 5% bonus/stock shares
  agmDate?: string;
  financialYear?: string;
  isRecordDateApproaching?: boolean;
  daysToRecordDate?: number;
  lockoutRisk?: 'CRITICAL_T2_LOCKOUT' | 'APPROACHING_CAUTION' | 'SAFE_CLEAR';
  estimatedExPrice?: number;
  details?: string;
}

export interface KellyResult {
  symbol: string;
  winRate: number; // 0.0 to 1.0
  payoffRatio: number; // Avg Win / Avg Loss
  fullKellyPct: number;
  halfKellyPct: number;
  quarterKellyPct: number;
  recommendedRiskPct: number;
  recommendedPositionPct: number;
  maxShares: number;
  totalCommitmentBdt: number;
  riskOfRuinPct: number;
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  strategy: string;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  pnlPct: number;
  grossPnlPct?: number;
  feeDragPct?: number;
  pnlAmount: number;
  holdingBars: number;
  outcome: 'TP1' | 'TP2' | 'STOP_LOSS' | 'TRAILING_STOP' | 'TIMEOUT';
  isWin: boolean;
  t2LockTriggered?: boolean;
  circuitBlocked?: boolean;
  entryTimingUsed?: 'next_open' | 'signal_close';
  pitProbability?: number;
  pitFactors?: {
    rvolSurge: boolean;
    stage2: boolean;
    squeeze: boolean;
    multiDayStreak: boolean;
    nearBase: boolean;
    trailingProtected: boolean;
  };
}

export interface BacktestSummary {
  strategyName: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  profitFactor: number;
  totalReturnPct: number;
  benchmarkReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  avgGainPct: number;
  avgLossPct: number;
  payoffRatio: number;
  t2LockedExitsCount?: number;
  circuitBlockedBarsCount?: number;
  avgFeeDragPct?: number;
  barsEvaluatedCount?: number;
  signalsFilteredCount?: number;
  entryTimingUsed?: 'next_open' | 'signal_close';
  maxConcurrentPositions?: number;
  peakConcurrentPositions?: number;
  peakCapitalDeployedPct?: number;
  cashCappedSkippedCount?: number;
  gapSkippedCount?: number;
  dsexRegimeSkippedCount?: number;
  dsexGateActive?: boolean;
  equityCurve: { date: string; portfolioEquity: number; benchmarkEquity: number; drawdownPct: number }[];
  trades: BacktestTrade[];
}

export interface FactorAttributionItem {
  factor: string;
  category: 'Volume & Flow' | 'Trend & Structure' | 'Volatility' | 'Machine Learning' | 'Sector Alignment' | 'Risk Geometry';
  winRateWithFactor: number;
  winRateWithoutFactor: number;
  alphaEdgePct: number;
  importancePct: number;
  description: string;
}

export interface CalibrationBucket {
  range: string;
  predictedAvgPct: number;
  actualWinPct: number;
  tradeCount: number;
  reliability: 'CALIBRATED' | 'UNDERESTIMATED' | 'OVERESTIMATED';
}

export interface TradeAccuracyAudit {
  totalTradesAudited: number;
  winningTrades: number;
  losingTrades: number;
  overallWinRatePct: number;
  overallProfitFactor: number;
  mathematicalExpectancyPct: number;
  avgGainPct: number;
  avgLossPct: number;
  payoffRatio: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  brierScore: number;
  precisionPct: number;
  sensitivityPct: number;
  falsePositiveRatePct: number;
  barsScannedCount?: number;
  setupsFilteredOutCount?: number;
  factorAttributions: FactorAttributionItem[];
  calibrationBuckets: CalibrationBucket[];
  strategyComparisons: BacktestSummary[];
}

export interface SectorRotationItem {
  sector: string;
  stockCount: number;
  turnoverCr: number;
  turnoverSharePct: number;
  avgChangePct: number;
  relativeStrength: number; // vs DSEX benchmark (100 = parity)
  momentumScore: number;    // rate of change of relative strength
  quadrant: 'Leading' | 'Improving' | 'Weakening' | 'Lagging';
  topStock: string;
  topStockGain: number;
}

export interface LiveExecutionAlert {
  id: string;
  symbol: string;
  type: 'BREAKOUT_NOW' | 'SQUEEZE_EXPANSION' | 'MULTI_DAY_MOMENTUM' | 'TP_HIT' | 'SL_TRIGGER' | 'INSTITUTIONAL_VOLUME';
  timestamp: string;
  price: number;
  changePct: number;
  message: string;
  urgency: 'CRITICAL' | 'HIGH' | 'INFO';
  action: string;
  targetPrice: number;
  stopLoss: number;
}

export interface VolumeProfileBin {
  priceLow: number;
  priceHigh: number;
  priceMid: number;
  volume: number;
  percentage: number;
  isPoc: boolean;
  inValueArea: boolean;
}

export interface CandleBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value?: number;
}

export interface TechnicalIndicators {
  ema20: number;
  ema50: number;
  ema200: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbWidth: number;
  isSqueezing: boolean;
  squeezeBarCount: number;
  rsi14: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
  rvol: number;
  obv: number;
  obvTrend: 'rising' | 'falling' | 'neutral';
  volDryDays: number;
  weinsteinStage: 1 | 2 | 3;
  wyckoffPhase: 'A' | 'B' | 'C' | 'D' | 'E';
  candlePatterns: string[];
  paConfirmed: boolean;
}

export interface MultiDayMomentumMetrics {
  consecutiveUpDays: number;
  consecutiveGreenCandles: number;
  higherLowsCount: number;
  upDaysInLast5: number;
  upDaysInLast10: number;
  return3dPct: number;
  return5dPct: number;
  return10dPct: number;
  isMultiDayClimber: boolean;
  climberTier: 'STREAK_LEADER' | 'STEADY_CLIMBER' | 'EARLY_RUNNER' | 'NONE';
  momentumHealth: 'HEALTHY_CONTINUATION' | 'OVEREXTENDED_EXHAUSTION' | 'NEUTRAL';
  avgDailyGainPct: number;
}

export interface DseStockItem {
  symbol: string;
  name: string;
  category: 'A' | 'B' | 'Z' | 'N/A';
  sector: string;
  isSectorIndex?: boolean; // True for AmiBroker sector index files (01_BANK, 02_CEMENT, etc.)
  sectorCode?: string;     // Original sector code like 01_BANK
  isSme?: boolean;         // True for DSE SME Platform Growth Board companies
  marketBoard?: 'MAIN' | 'SME' | 'ATB'; // Official DSE market board segment
  lastPrice: number;
  change: number;
  changePercent: number;
  changePct?: number;
  volume: number;
  turnoverCr: number;
  marketCapCr: number;
  freeFloatPct: number;
  pe: number;
  divYield: number;
  beta: number;
  latestBarDate: string;
  fundamentalsSource?: 'DEFAULT_ESTIMATE' | 'PRESEEDED' | 'USER_IMPORTED';
  
  // 52-week metrics
  high52w: number;
  low52w: number;
  pricePosition52w: number; // 0.0 to 1.0

  // Screener Scores
  confluenceScore: number; // 0 to 7
  breakoutScore: number;   // 0 to 10
  phase: 'breakout' | 'reversal' | 'accumulation' | 'distribution' | 'pullback' | 'watchlist';
  setupState: 'CONFIRMED' | 'TRADE_READY' | 'WATCH' | 'FORMING';
  
  // Flags & signals
  stage: 1 | 2 | 3 | 4;
  paConfirmed: boolean;
  isSmallCap: boolean;
  rvol: number;
  popScore: number; // 0 to 7
  popSignals: string[];
  chaseRisk: boolean;
  sectorStrength: 'strong' | 'neutral' | 'weak';
  sectorTrend: 'up' | 'down' | 'flat';
  
  // Trade setup plan
  entryZoneLow: number;
  entryZoneHigh: number;
  supportPrice: number;
  resistancePrice: number;
  targetPrice1: number;
  targetPrice2: number;
  stopLoss: number;
  riskRewardRatio: number;
  structuralRiskR?: number;
  rMultipleTarget1?: number;
  rMultipleTarget2?: number;
  t2SettlementRisk?: 'OPTIMAL_PIVOT_ENTRY' | 'ACCEPTABLE_ENTRY' | 'EXTENDED_CHASE_RISK' | 'BASE_CONSOLIDATION';
  vduConfirmed?: boolean;
  upperWickExhaustion?: boolean;
  
  // Confluence details
  topSignals: string[];
  confluenceFactors: string[];
  squeezeBarCount: number;
  volDryDays: number;
  obvTrend: 'rising' | 'falling' | 'neutral';
  wyckoffPhase?: 'A' | 'B' | 'C' | 'D' | 'E';
  ma20?: number;

  // Detailed Technical Parameters & Stock Position
  technicalParams?: {
    ma14: number;
    ma20: number;
    ma50: number;
    ma100: number;
    ma150: number;
    ma20DistancePct: number;
    inMa20Zone: boolean;
    ma50Rising: boolean;
    ma100Aligned: boolean;
    trendGatePassed: boolean;
    rsi14: number;
    rsiZone: 'Oversold (<35)' | 'Neutral (35-65)' | 'Overbought (>65)';
    bullishDivergence: boolean;
    stealthObvAccumulation: boolean;
    obvSlope: number;
    obvGrowthPct: number;
    bbWidth: number;
    bbSqueezeActive: boolean;
    bbPercentile: number;
    atr14: number;
    atrPct: number;
    stop2Atr: number;
    trailingExitLevel: number;
    candlePattern: string;
    near52wSupport: boolean;
    position52wPct: number;
    confluenceBreakoutReady: boolean;
    rs20d: number;
    conditions: {
      trend: boolean;
      trigger: boolean;
      volume: boolean;
      obv: boolean;
      divergence: boolean;
      squeeze: boolean;
      support: boolean;
      pa: boolean;
    };
    backtestWinRate: number;
    backtestAvgGain: number;
    backtestSignalsCount: number;
  };

  // Monthly setup details
  monthlyWinRate?: string;
  monthlyDominantPhase?: string;
  dailyTradeReady?: boolean;
  dailyConfirmed?: boolean;
  relativeStrengthDsex?: number;

  // Radar details
  radarState?: 'READY' | 'WATCHING';
  barsSinceCross?: number;
  pctSinceCross?: number;

  // Machine Learning & Profit Prediction
  mlProbability: number; // 0.0 to 1.0 (P(Hit Target))
  mlConfidence: 'HIGH' | 'MEDIUM' | 'SPECULATIVE';
  mlTopFactors: { name: string; weight: number; impact: 'positive' | 'negative' }[];
  mlExpectedReturnPct?: number; // e.g. +11.8% profit expectancy
  mlProfitFactor?: number;       // e.g. 3.4 profit factor
  mlKellySizePct?: number;       // e.g. 12% portfolio sizing

  // Multi-day continuous price increase / uptrend streak metrics
  multiDayMomentum?: MultiDayMomentumMetrics;

  // Data completeness quality indicator
  dataQuality?: 'FULL' | 'LIMITED_HISTORY';

  // Historical data for interactive charts
  bars: CandleBar[];

  // Corporate Actions & Record Date Lockout
  corporateAction?: DseCorporateAction;
}

export interface MlModelStatus {
  state: 'ACTIVE' | 'ACCUMULATING';
  modelType: string;
  accuracyPct: number;             // High-Conviction accuracy
  overallAccuracyPct?: number;      // Overall out-of-sample
  sampleCount: number;
  targetDefinition: string;
  precision: number;
  recall: number;
  rocAuc: number;
  benchmarkDseWinRate: number;
  modelWinRate: number;
  profitFactor?: number;
  brierScore?: number;
  dataSourceMode?: 'EMPIRICAL_DATASET' | 'INSUFFICIENT_HISTORY';
  lastRetrained: string;
}

export interface MarketBreadth {
  dsexIndex: number;
  dsexChange: number;
  dsexChangePct: number;
  ds30Index?: number;         // DSE 30 Blue-Chip Index (e.g. 2068.63)
  ds30Change?: number;
  ds30ChangePct?: number;
  advancing: number;
  declining: number;
  unchanged: number;
  turnoverCr: number;         // Trade Value (Turnover) in Crore BDT
  tradeVolumeMn?: number;     // Trade Volume (Shares) in Millions of Shares
  totalSharesTraded?: number; // Exact count of shares traded
  totalTrades?: number;       // Total number of executed trades
  sessionDate?: string;       // Date and time of official or dataset session
  isManualOverride?: boolean; // True when user explicitly overrides from Official DSE Portal modal
  activeEquitiesCount?: number; // Number of active equities in the latest session
  staleEquitiesCount?: number;  // Loaded equities whose last bar predates the latest session
  regime: 'BULLISH' | 'NEUTRAL' | 'CAUTION' | 'BEARISH';
  regimeNote: string;
}

export interface FileConsistencySummary {
  fileName: string;
  headerMode: 'header_detected' | 'headerless_inferred';
  dateOrder: 'ISO' | 'DMY' | 'MDY' | 'MIXED';
  delimiter: string;
  detectedColumns: string;
  ignoredExtraColumns: number;
  rowsScanned: number;
  validBars: number;
  rejectedRows: number;
  ohlcRepaired: number;
  valueUnit: 'raw_bdt' | 'millions' | 'crore' | 'derived_close_x_vol' | 'none';
  warnings: string[];
}

export interface ExtremePriceJumpWarning {
  symbol: string;
  date: string;
  prevClose: number;
  close: number;
  changePct: number;
}

export interface DataConsistencyReport {
  totalFilesParsed: number;
  headerlessFilesCount: number;
  headeredFilesCount: number;
  totalRowsScanned: number;
  validBarsAccepted: number;
  invalidDateRows: number;
  invalidPriceRows: number;
  missingSymbolRows: number;
  ohlcRepairedCount: number;
  duplicatesCollapsedCount: number;
  conflictingDuplicatesCount: number;
  valueMismatchCount: number;
  extremeJumpWarnings: ExtremePriceJumpWarning[];
  fileSummaries: FileConsistencySummary[];
  warnings: string[];
}

export interface IncrementalMergeReport {
  strategy: 'incremental_merge' | 'replace_all';
  totalSymbols: number;
  newSymbolsCount: number;
  existingSymbolsUpdatedCount: number;
  preservedSymbolsCount: number;
  totalBarsBefore: number;
  totalBarsAfter: number;
  newIncrementalBarsAdded: number;
  overlappingBarsCrossChecked: number;
  overlappingBarsUpdated: number;
  dateRange: { start: string; end: string };
  symbolDetails: {
    symbol: string;
    beforeBars: number;
    uploadedBars: number;
    finalBars: number;
    newBarsAdded: number;
    overlappingMatched: number;
    status: 'updated_incremental' | 'new_symbol' | 'preserved';
    latestDate: string;
    latestPrice: number;
    priceChange: number;
    volume?: number;
    turnoverCr?: number;
  }[];
}

export interface UploadedDataSummary {
  fileName: string;
  fileSize: number;
  symbolsCount: number;
  stocksCount?: number;
  sectorIndicesCount?: number;
  detectedSectorSymbols?: string[];
  totalBarsCount: number;
  dateRange: { start: string; end: string };
  symbols: string[];
  mergeReport?: IncrementalMergeReport;
  consistencyReport?: DataConsistencyReport;
}

export interface ActiveTradePlan {
  id: string;
  symbol: string;
  name: string;
  category: 'A' | 'B' | 'Z' | 'N/A';
  sector: string;
  isSme?: boolean;
  marketBoard?: 'MAIN' | 'SME' | 'ATB';
  recommendedDate: string;
  recommendedPrice: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  stopLoss: number;
  targetPrice1: number;
  targetPrice2: number;
  riskRewardRatio: number;
  convictionTier: 'ELITE' | 'HIGH' | 'STRONG';
  convictionScore: number;
  action: 'BUY / ACCUMULATE' | 'BREAKOUT BUY' | 'PULLBACK BUY' | 'MOMENTUM CONTINUATION';

  // Live forward tracking fields:
  status: 'PENDING_ENTRY' | 'ACTIVE_IN_TRADE' | 'TP1_HIT' | 'TP2_HIT' | 'STOPPED_OUT' | 'TIME_EXPIRED';
  entryDate?: string;
  entryPrice?: number;
  currentPrice: number;
  pnlPct: number;
  rMultiple: number;
  maxFavorableExcursionPct: number;
  maxAdverseExcursionPct: number;
  daysHeld: number;
  trailingStop: number;
  exitDate?: string;
  exitPrice?: number;
  exitReason?: string;
  isCustomTracked?: boolean;
}

export interface TradePlanPerformanceStats {
  totalPlans: number;
  activeCount: number;
  tp1HitCount: number;
  tp2HitCount: number;
  stoppedCount: number;
  pendingCount: number;
  expiredCount: number;
  winRatePct: number;
  profitFactor: number;
  avgGainPct: number;
  avgLossPct: number;
  avgHoldingDaysToTarget: number;
  retentionEfficiencyPct: number;
  totalRMultiple: number;
}

