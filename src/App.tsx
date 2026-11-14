/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  TrendingUp,
  Zap,
  Sparkles,
  CalendarRange,
  Radar,
  BrainCircuit,
  UploadCloud,
  Search,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Layers,
  FileSpreadsheet,
  Download,
  Info,
  BarChart2,
  Compass,
  Activity,
  Bell,
  Database,
  Save,
  Trash2,
  FolderOpen,
  HardDrive,
  Globe
} from 'lucide-react';

import {
  ScreenerMode,
  ScreenerStrategyPreset,
  UiCategory,
  MonthlyStateFilter,
  UniverseMode,
  DseStockItem,
  UploadedDataSummary,
  MarketBreadth,
} from './types/dse';

import {
  PRESEEDED_DSE_STOCKS,
  INITIAL_ML_STATUS,
  INITIAL_MARKET_BREADTH,
  enrichStockAnalytics,
  enrichUniverseMarketContext,
} from './lib/dseDataEngine';
import {
  generateExecutionAlerts,
  computeEmpiricalMlModelState,
} from './lib/quantAnalyticsEngine';
import {
  UserFundamentalAndActionRecord,
  loadUserFundamentalsMap,
  saveUserFundamentalsMap,
  clearUserFundamentalsMap,
  mergeUserFundamentalsIntoStock,
} from './lib/dseCorporateActions';
import {
  isSectorIndexSymbol,
  isBenchmarkSymbol,
  isDsexSymbol,
  isDs30Symbol,
  isDsesSymbol,
  isSmeSymbol,
  resolveCompanySector,
  resolveSectorIndexInfo,
  OFFICIAL_DSE_MISC_SYMBOLS,
  isUnclassifiedSector,
} from './lib/sectorClassifier';
import {
  saveStocksToDatabase,
  loadStocksFromDatabase,
  clearDatabase,
  getDatabaseStats,
  exportDatabaseToJson,
  importDatabaseFromJson
} from './lib/dbStorage';

import { ScreenerCardItem } from './components/ScreenerCardItem';
import { HighConvictionTradeSuggestions } from './components/HighConvictionTradeSuggestions';

// Lazy-loaded modals and analysis studios for ultra-fast startup and lightweight bundle
const StockDetailModal = React.lazy(() => import('./components/StockDetailModal').then(m => ({ default: m.default || m.StockDetailModal })));
const MachineLearningStudio = React.lazy(() => import('./components/MachineLearningStudio').then(m => ({ default: m.default || m.MachineLearningStudio })));
const DataUploadModal = React.lazy(() => import('./components/DataUploadModal').then(m => ({ default: m.default || m.DataUploadModal })));
const StrategyBacktester = React.lazy(() => import('./components/StrategyBacktester').then(m => ({ default: m.default || m.StrategyBacktester })));
const SectorRotationMatrix = React.lazy(() => import('./components/SectorRotationMatrix').then(m => ({ default: m.default || m.SectorRotationMatrix })));
const ProfitPredictionOptimizer = React.lazy(() => import('./components/ProfitPredictionOptimizer').then(m => ({ default: m.default || m.ProfitPredictionOptimizer })));
const ExecutionAlertsModal = React.lazy(() => import('./components/ExecutionAlertsModal').then(m => ({ default: m.default || m.ExecutionAlertsModal })));
const CleanDatabaseModal = React.lazy(() => import('./components/CleanDatabaseModal').then(m => ({ default: m.default || m.CleanDatabaseModal })));
const DsePortalDataModal = React.lazy(() => import('./components/DsePortalDataModal').then(m => ({ default: m.default || m.DsePortalDataModal })));

export default function App() {
  const [mode, setMode] = useState<ScreenerMode>('high-conviction');
  const [strategyPreset, setStrategyPreset] = useState<ScreenerStrategyPreset>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<UiCategory>('All');
  const [sector, setSector] = useState<string>('All');
  const [minScore, setMinScore] = useState<number>(0);
  const [universe, setUniverse] = useState<UniverseMode>('full');
  const [monthlyStateFilter, setMonthlyStateFilter] = useState<MonthlyStateFilter>('All');
  const [assetFilter, setAssetFilter] = useState<'stocks' | 'sectors' | 'all'>('stocks');
  const [boardFilter, setBoardFilter] = useState<'ALL' | 'MAIN' | 'SME'>('ALL');

  // Active dataset (starts clean with 0 stocks, or auto-restored from IndexedDB)
  const [stocks, setStocks] = useState<DseStockItem[]>([]);
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const dbBackupInputRef = useRef<HTMLInputElement>(null);

  const empiricalMlSummary = useMemo(() => {
    if (stocks.length === 0) return null;
    return computeEmpiricalMlModelState(stocks);
  }, [stocks]);

  const mlStatus = empiricalMlSummary?.status ?? INITIAL_ML_STATUS;
  const [marketBreadth, setMarketBreadth] = useState<MarketBreadth>(() => {
    try {
      const saved = localStorage.getItem('dse_portal_market_breadth');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only heal legacy DS30-as-DSEX mix-up if index was stored under 3000
        if (parsed && (!parsed.dsexIndex || parsed.dsexIndex < 3000)) {
          parsed.ds30Index = parsed.dsexIndex && parsed.dsexIndex > 1000 ? parsed.dsexIndex : 2068.63;
          parsed.dsexIndex = 5450.63;
          localStorage.setItem('dse_portal_market_breadth', JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch {
      // fallback
    }
    return {
      ...INITIAL_MARKET_BREADTH,
      isManualOverride: false,
    };
  });

  // Modals
  const [selectedStock, setSelectedStock] = useState<DseStockItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isPortalDataModalOpen, setIsPortalDataModalOpen] = useState(false);
  const [uploadNotification, setUploadNotification] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update & persist official DSE portal benchmark & market breadth (or clear override)
  const handleUpdateMarketBreadth = (updated: MarketBreadth) => {
    setMarketBreadth(updated);
    try {
      localStorage.setItem('dse_portal_market_breadth', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setUploadNotification(
      updated.isManualOverride === false
        ? `✓ Market breadth synchronized live from your loaded dataset (${updated.advancing} Adv / ${updated.declining} Dec / ${updated.unchanged} Unch, ৳${updated.turnoverCr.toFixed(2)} Cr).`
        : `✓ Official DSE Portal override applied: DSEX ${updated.dsexIndex.toFixed(2)}, ${updated.advancing} Adv / ${updated.declining} Dec.`
    );
    setTimeout(() => setUploadNotification(null), 5000);
  };

  // Load saved stock database from IndexedDB on startup
  useEffect(() => {
    async function initDatabase() {
      try {
        const saved = await loadStocksFromDatabase();
        if (saved && saved.length > 0) {
          // If the user's stored database only has the legacy <= 14 preseeded stocks, enrich it with the full sector leaders
          let workingDataset = saved;
          if (saved.length <= 14 && saved.some(s => s.symbol === '00_DSEX')) {
            const existingSyms = new Set(saved.map(s => s.symbol));
            const newAdditions = PRESEEDED_DSE_STOCKS.filter(p => !existingSyms.has(p.symbol));
            if (newAdditions.length > 0) {
              workingDataset = [...saved, ...newAdditions];
            }
          }

          // Backfill company sectors: re-evaluate any stock in 'General Market' or 'Miscellaneous'
          // or where the updated official DSE dictionary provides a more accurate sector
          let reclassifiedCount = 0;
          const upgraded: DseStockItem[] = workingDataset.map(s => {
            let item = s;
            const isBench = isBenchmarkSymbol(s.symbol) || s.sector === 'Benchmark';
            const isSecIdx = !isBench && isSectorIndexSymbol(s.symbol);

            if (isBench) {
              if (item.sector !== 'Benchmark' || !item.isSectorIndex) {
                reclassifiedCount++;
                item = { ...item, sector: 'Benchmark', isSectorIndex: true, category: 'N/A' };
              }
            } else if (isSecIdx) {
              const res = resolveSectorIndexInfo(s.symbol);
              if (item.sector !== res.sector || !item.isSectorIndex) {
                reclassifiedCount++;
                item = { ...item, sector: res.sector, isSectorIndex: true, name: res.name };
              }
            } else {
              const res = resolveCompanySector(s.symbol, s.name);
              const isMiscWhitelisted = OFFICIAL_DSE_MISC_SYMBOLS.has(s.symbol.toUpperCase());
              const wasWronglyMisc = s.sector === 'Miscellaneous' && !isMiscWhitelisted;
              const isSme = isSmeSymbol(s.symbol) || Boolean(s.isSme) || res.sector === 'SME Platform' || isUnclassifiedSector(s.sector);
              const assignedSector = isSme ? 'SME Platform' : res.sector;

              if (
                !s.sector ||
                isUnclassifiedSector(s.sector) ||
                wasWronglyMisc ||
                s.sector !== assignedSector ||
                item.isSectorIndex ||
                (isSme && !s.isSme)
              ) {
                reclassifiedCount++;
                item = {
                  ...s,
                  sector: assignedSector,
                  name: s.name && !s.name.includes('DSE Quotation') && !s.name.includes('Unmapped Equities') ? s.name : res.name,
                  isSme,
                  isSectorIndex: false,
                  marketBoard: isSme ? 'SME' : 'MAIN',
                };
              }
            }

            // Ensure isSme and marketBoard are populated
            const isSme = isSmeSymbol(item.symbol) || Boolean(item.isSme) || item.sector === 'SME Platform';
            item = {
              ...item,
              isSme,
              isSectorIndex: !isBench && isSectorIndexSymbol(item.symbol),
              marketBoard: isSme ? 'SME' : (item.marketBoard || 'MAIN'),
            };

            // Sanitize and heal any corrupt or missing Trade Value (turnoverCr)
            let validTurnoverCr = item.turnoverCr;
            if (!validTurnoverCr || validTurnoverCr > 10000 || validTurnoverCr <= 0) {
              const lastBar = item.bars && item.bars.length > 0 ? item.bars[item.bars.length - 1] : null;
              if (lastBar && lastBar.volume > 0 && item.lastPrice > 0) {
                validTurnoverCr = Math.round((lastBar.volume * item.lastPrice / 10000000) * 100) / 100;
              }
            }
            const resolvedSource = item.fundamentalsSource || (
              isBench || isSecIdx || PRESEEDED_DSE_STOCKS.some(p => p.symbol === item.symbol)
                ? 'PRESEEDED'
                : 'DEFAULT_ESTIMATE'
            );
            return enrichStockAnalytics({
              ...item,
              turnoverCr: validTurnoverCr || item.turnoverCr,
              fundamentalsSource: resolvedSource,
            });
          });
          const contextualized = enrichUniverseMarketContext(upgraded);
          setStocks(contextualized);
          if (reclassifiedCount > 0) {
            // Persist the corrected classifications to IndexedDB
            saveStocksToDatabase(contextualized).catch(e => console.warn('Could not auto-save reclassified sectors:', e));
          }
          const stats = await getDatabaseStats();
          if (stats.lastSaved) {
            setLastSavedTime(new Date(stats.lastSaved).toLocaleTimeString());
          }
          setUploadNotification(`✓ Restored ${contextualized.length} symbols with full DSE sector classifications.`);
          setTimeout(() => setUploadNotification(null), 5000);
        } else {
          setStocks(PRESEEDED_DSE_STOCKS);
        }
      } catch (err) {
        console.warn('Could not load database:', err);
        setStocks([]);
      } finally {
        setIsDbLoaded(true);
      }
    }
    initDatabase();
  }, []);

  // Save current stocks to IndexedDB
  const handleSaveDatabase = async () => {
    if (stocks.length === 0) {
      setUploadNotification('Database is clean (0 symbols). Nothing to save.');
      setTimeout(() => setUploadNotification(null), 4000);
      return;
    }
    setIsSavingDb(true);
    try {
      const res = await saveStocksToDatabase(stocks);
      const timeStr = new Date(res.savedAt).toLocaleTimeString();
      setLastSavedTime(timeStr);
      setUploadNotification(`✓ Database successfully saved locally (${res.count} symbols preserved).`);
    } catch (err: any) {
      setUploadNotification(`Failed to save database: ${err.message}`);
    } finally {
      setIsSavingDb(false);
      setTimeout(() => setUploadNotification(null), 6000);
    }
  };

  // Clean / Wipe stock database
  const handleConfirmCleanDatabase = async () => {
    await clearDatabase();
    setStocks([]);
    setSelectedStock(null);
    setLastSavedTime(null);
    setIsCleanModalOpen(false);
    const cleanBreadth: MarketBreadth = {
      ...marketBreadth,
      advancing: 0,
      declining: 0,
      unchanged: 0,
      turnoverCr: 0,
      tradeVolumeMn: 0,
      totalSharesTraded: 0,
      activeEquitiesCount: 0,
      staleEquitiesCount: 0,
      isManualOverride: false,
      regime: 'NEUTRAL',
      regimeNote: 'Database cleaned (0 symbols loaded).',
    };
    setMarketBreadth(cleanBreadth);
    try {
      localStorage.setItem('dse_portal_market_breadth', JSON.stringify(cleanBreadth));
    } catch {
      // ignore
    }
    setUploadNotification('✓ Stock database has been cleaned. 0 symbols loaded. Ready for fresh upload.');
    setTimeout(() => setUploadNotification(null), 6000);
  };

  // Export database backup as JSON
  const handleExportDatabase = () => {
    if (stocks.length === 0) {
      setUploadNotification('No stocks in database to export.');
      setTimeout(() => setUploadNotification(null), 4000);
      return;
    }
    exportDatabaseToJson(stocks);
    setUploadNotification(`✓ Exported database backup (${stocks.length} symbols).`);
    setTimeout(() => setUploadNotification(null), 4000);
  };

  // Import database backup from JSON
  const handleImportDatabaseBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rawImported = await importDatabaseFromJson(file);
      const imported = enrichUniverseMarketContext(rawImported.map(enrichStockAnalytics));
      setStocks(imported);
      const resetOverrideBreadth: MarketBreadth = { ...marketBreadth, isManualOverride: false };
      setMarketBreadth(resetOverrideBreadth);
      try {
        localStorage.setItem('dse_portal_market_breadth', JSON.stringify(resetOverrideBreadth));
      } catch {
        // ignore
      }
      await saveStocksToDatabase(imported);
      const timeStr = new Date().toLocaleTimeString();
      setLastSavedTime(timeStr);
      setUploadNotification(`✓ Restored and saved database from ${file.name} (${imported.length} symbols).`);
    } catch (err: any) {
      setUploadNotification(`Failed to import database backup: ${err.message}`);
    } finally {
      if (dbBackupInputRef.current) dbBackupInputRef.current.value = '';
      setTimeout(() => setUploadNotification(null), 8000);
    }
  };

  // Algorithmic execution alerts computed from live indicators
  const executionAlerts = useMemo(() => {
    return generateExecutionAlerts(stocks);
  }, [stocks]);

  // Database date metrics (Last Bar Date fed to database)
  const databaseDateInfo = useMemo(() => {
    if (stocks.length === 0) {
      return { lastBarDate: null, firstBarDate: null, totalBars: 0 };
    }
    let maxDate = '';
    let minDate = '9999-99-99';
    let totalBars = 0;
    for (const s of stocks) {
      totalBars += s.bars?.length || 0;
      if (s.latestBarDate) {
        if (s.latestBarDate > maxDate) maxDate = s.latestBarDate;
        if (s.latestBarDate < minDate) minDate = s.latestBarDate;
      }
      if (s.bars && s.bars.length > 0) {
        const first = s.bars[0].date;
        const last = s.bars[s.bars.length - 1].date;
        if (last && last > maxDate) maxDate = last;
        if (first && first < minDate) minDate = first;
      }
    }
    return {
      lastBarDate: maxDate || null,
      firstBarDate: minDate !== '9999-99-99' ? minDate : null,
      totalBars
    };
  }, [stocks]);

  // Scanned user universe breadth (computed strictly on the latest broad market session date)
  const scannedBreadth = useMemo(() => {
    const equities = stocks.filter(
      s => !s.isSectorIndex && !isSectorIndexSymbol(s.symbol) && !isBenchmarkSymbol(s.symbol) && s.sector !== 'Benchmark'
    );
    if (equities.length === 0) {
      return {
        advancing: 0,
        declining: 0,
        unchanged: 0,
        turnoverCr: 0,
        tradeValueCr: 0,
        totalSharesVolume: 0,
        tradeVolumeMn: 0,
        count: 0,
        activeCount: 0,
        staleCount: 0,
        sessionDate: undefined as string | undefined,
      };
    }

    const getLastDate = (s: DseStockItem): string => {
      if (s.latestBarDate) return s.latestBarDate;
      if (s.bars && s.bars.length > 0) return s.bars[s.bars.length - 1].date;
      return '';
    };

    const dateCounts = new Map<string, number>();
    for (const s of equities) {
      const d = getLastDate(s);
      if (d) dateCounts.set(d, (dateCounts.get(d) || 0) + 1);
    }

    const sortedDates = Array.from(dateCounts.keys()).sort();
    let sessionDate = sortedDates[sortedDates.length - 1] || '';
    // If >= 10 equities exist and the very newest date only has a tiny partial fragment (< 25%), pick the newest broad session date
    if (equities.length >= 10 && sortedDates.length > 1) {
      const minBroadCount = Math.max(3, Math.floor(equities.length * 0.25));
      for (let i = sortedDates.length - 1; i >= 0; i--) {
        if ((dateCounts.get(sortedDates[i]) || 0) >= minBroadCount) {
          sessionDate = sortedDates[i];
          break;
        }
      }
    }

    const onSession = sessionDate ? equities.filter(s => getLastDate(s) === sessionDate) : equities;
    const staleCount = Math.max(0, equities.length - onSession.length);

    // Exclude zero-volume non-traded placeholder rows only when the dataset actually has traded volume
    const hasVolumeData = onSession.some(s => (s.volume || 0) > 0);
    const activeTraded = hasVolumeData
      ? onSession.filter(s => (s.volume || 0) > 0 || (s.turnoverCr || 0) > 0 || Math.abs(s.changePercent) > 0.0001)
      : onSession;

    const advancing = activeTraded.filter(s => s.changePercent > 0.0001).length;
    const declining = activeTraded.filter(s => s.changePercent < -0.0001).length;
    const unchanged = Math.max(0, activeTraded.length - advancing - declining);

    // Accurate Trade Value (Turnover in Crore BDT) & Trade Volume (Shares) summed over active session rows
    const rawTurnoverSum = onSession.reduce((acc, s) => acc + (s.turnoverCr || 0), 0);
    const tradeValueCr = Math.round(rawTurnoverSum * 100) / 100;
    const totalSharesVolume = onSession.reduce((acc, s) => acc + (s.volume || 0), 0);
    const tradeVolumeMn = Math.round((totalSharesVolume / 1000000) * 100) / 100;

    return {
      advancing,
      declining,
      unchanged,
      turnoverCr: tradeValueCr,
      tradeValueCr,
      totalSharesVolume,
      tradeVolumeMn,
      count: equities.length,
      activeCount: activeTraded.length,
      staleCount,
      sessionDate: sessionDate || undefined,
    };
  }, [stocks]);

  // Live Market Breadth & Benchmark computation (derives dynamically from dataset unless explicitly manually overridden)
  const displayMarketBreadth = useMemo(() => {
    const dsexItem =
      stocks.find(s => isDsexSymbol(s.symbol)) ||
      stocks.find(s => s.symbol === '00_DSEX' || s.symbol === 'DSEX' || s.symbol === 'INDEX');

    const ds30Item =
      stocks.find(s => isDs30Symbol(s.symbol)) ||
      stocks.find(s => s.symbol === '00_DS30' || s.symbol === 'DS30' || s.symbol === 'DSE30');

    const benchmarkItem = dsexItem || ds30Item;

    // Guard DSEX index: Must be > 3000 to prevent DS30 (~2068) or DSES (~1200) from leaking in
    const resolvedDsexIndex =
      dsexItem && dsexItem.lastPrice > 3000
        ? dsexItem.lastPrice
        : marketBreadth.dsexIndex > 3000
        ? marketBreadth.dsexIndex
        : 5450.63;

    const resolvedDsexChange = dsexItem ? dsexItem.change : marketBreadth.dsexChange;
    const resolvedDsexChangePct = dsexItem ? dsexItem.changePercent : marketBreadth.dsexChangePct;

    const resolvedDs30Index = ds30Item ? ds30Item.lastPrice : (marketBreadth.ds30Index || 2068.63);
    const resolvedDs30Change = ds30Item ? ds30Item.change : (marketBreadth.ds30Change ?? 12.45);
    const resolvedDs30ChangePct = ds30Item ? ds30Item.changePercent : (marketBreadth.ds30ChangePct ?? 0.60);

    // Respect explicit manual override from DsePortalDataModal
    if (marketBreadth.isManualOverride) {
      return {
        ...marketBreadth,
        dsexIndex: marketBreadth.dsexIndex > 3000 ? marketBreadth.dsexIndex : resolvedDsexIndex,
        ds30Index: marketBreadth.ds30Index || resolvedDs30Index,
        activeEquitiesCount: scannedBreadth.activeCount,
        staleEquitiesCount: scannedBreadth.staleCount,
      };
    }

    // No stocks loaded and not manually overridden -> show clean zeros
    if (stocks.length === 0) {
      return {
        ...marketBreadth,
        advancing: 0,
        declining: 0,
        unchanged: 0,
        turnoverCr: 0,
        tradeVolumeMn: 0,
        totalSharesTraded: 0,
        activeEquitiesCount: 0,
        staleEquitiesCount: 0,
        regime: 'NEUTRAL' as const,
      };
    }

    // Determine exact Trade Value (Crore BDT) & Trade Volume (Shares):
    // Prefer exact equity sum whenever >= 20 equities are present and have turnover; fallback to benchmark row for small watchlists
    let effectiveTradeValueCr = scannedBreadth.tradeValueCr;
    let effectiveTotalShares = scannedBreadth.totalSharesVolume;
    let effectiveTradeVolumeMn = scannedBreadth.tradeVolumeMn;

    if (scannedBreadth.count < 20 && benchmarkItem && benchmarkItem.turnoverCr >= 5 && benchmarkItem.turnoverCr <= 10000) {
      effectiveTradeValueCr = Math.round(benchmarkItem.turnoverCr * 100) / 100;
      if (benchmarkItem.volume > 0) {
        effectiveTotalShares = benchmarkItem.volume;
        effectiveTradeVolumeMn = Math.round((benchmarkItem.volume / 1000000) * 100) / 100;
      }
    } else if (effectiveTradeValueCr <= 0 && benchmarkItem && benchmarkItem.turnoverCr > 0) {
      effectiveTradeValueCr = Math.round(benchmarkItem.turnoverCr * 100) / 100;
    }

    if (effectiveTotalShares <= 0 && benchmarkItem && benchmarkItem.volume > 0) {
      effectiveTotalShares = benchmarkItem.volume;
      effectiveTradeVolumeMn = Math.round((benchmarkItem.volume / 1000000) * 100) / 100;
    }

    const adv = scannedBreadth.advancing;
    const dec = scannedBreadth.declining;
    const unch = scannedBreadth.unchanged;
    const adRatio = dec > 0 ? adv / dec : adv > 0 ? 2.0 : 1.0;

    const liveRegime: MarketBreadth['regime'] =
      adRatio >= 1.25 && resolvedDsexChange >= 0
        ? 'BULLISH'
        : adRatio >= 0.9
        ? 'NEUTRAL'
        : adRatio >= 0.65
        ? 'CAUTION'
        : 'BEARISH';

    return {
      ...marketBreadth,
      dsexIndex: resolvedDsexIndex,
      dsexChange: resolvedDsexChange,
      dsexChangePct: resolvedDsexChangePct,
      ds30Index: resolvedDs30Index,
      ds30Change: resolvedDs30Change,
      ds30ChangePct: resolvedDs30ChangePct,
      advancing: adv,
      declining: dec,
      unchanged: unch,
      turnoverCr: effectiveTradeValueCr,
      tradeVolumeMn: effectiveTradeVolumeMn,
      totalSharesTraded: effectiveTotalShares,
      sessionDate: scannedBreadth.sessionDate || marketBreadth.sessionDate,
      activeEquitiesCount: scannedBreadth.activeCount,
      staleEquitiesCount: scannedBreadth.staleCount,
      isManualOverride: false,
      regime: liveRegime,
      regimeNote: `Computed from ${scannedBreadth.activeCount} active scrips${scannedBreadth.sessionDate ? ` (${scannedBreadth.sessionDate})` : ''}: ${adv} Adv / ${dec} Dec / ${unch} Unch | Trade Value: ৳${effectiveTradeValueCr.toFixed(2)} Cr.`,
    };
  }, [stocks, marketBreadth, scannedBreadth]);

  // Count individual company stocks vs sector indices & boards
  const { individualStocksCount, sectorIndicesCount, mainBoardCount, smeBoardCount } = useMemo(() => {
    let stocksCount = 0;
    let sectorsCount = 0;
    let mainCount = 0;
    let smeCount = 0;
    for (const s of stocks) {
      if (isBenchmarkSymbol(s.symbol) || s.sector === 'Benchmark') {
        continue;
      }
      if (s.isSectorIndex || isSectorIndexSymbol(s.symbol)) {
        sectorsCount++;
      } else {
        stocksCount++;
        if (s.isSme || isSmeSymbol(s.symbol)) {
          smeCount++;
        } else {
          mainCount++;
        }
      }
    }
    return {
      individualStocksCount: stocksCount,
      sectorIndicesCount: sectorsCount,
      mainBoardCount: mainCount,
      smeBoardCount: smeCount,
    };
  }, [stocks]);

  // Clean sectors list (company sectors only, excluding benchmark and raw sector codes)
  const sectorsList = useMemo(() => {
    const set = new Set<string>();
    stocks.forEach(s => {
      if (s.isSectorIndex || isSectorIndexSymbol(s.symbol) || isBenchmarkSymbol(s.symbol) || s.sector === 'Benchmark') return;
      if (s.sector && !isUnclassifiedSector(s.sector)) set.add(s.sector);
    });
    return ['All', ...Array.from(set).sort()];
  }, [stocks]);

  // Filtered and intelligently ranked stocks based on active screener mode, asset class, and ML edge
  const filteredStocks = useMemo(() => {
    const list = stocks.filter(stock => {
      // Exclude benchmark indices (DSEX, DS30, CDSET, etc.) from standard screener cards entirely
      if (isBenchmarkSymbol(stock.symbol) || stock.sector === 'Benchmark') return false;

      const isSector = Boolean(stock.isSectorIndex || isSectorIndexSymbol(stock.symbol));

      // Asset Class separation: separate sector index files (01_BANK, 02_CEMENT...) from individual stocks
      if (assetFilter === 'stocks' && isSector) return false;
      if (assetFilter === 'sectors' && !isSector) return false;

      // Board filter (Main Board vs SME Growth Board)
      if (!isSector) {
        const isSmeStock = Boolean(stock.isSme || isSmeSymbol(stock.symbol) || stock.sector === 'SME Platform' || isUnclassifiedSector(stock.sector));
        if (boardFilter === 'MAIN' && isSmeStock) return false;
        if (boardFilter === 'SME' && !isSmeStock) return false;
      }

      // Trading Universe filter
      if (!isSector) {
        if (universe === 'liquid') {
          // Liquid Watchlist: minimum turnover floor of 10 Lakh Taka (0.10 Cr) or active volume
          if ((stock.turnoverCr ?? 0) < 0.10 && (stock.volume ?? 0) < 5000) return false;
        } else if (universe === 'curated') {
          // Curated Shortlist: algorithmic candidates with positive confluence, breakout or high ML edge
          if (stock.confluenceScore < 3 && stock.breakoutScore < 3 && (stock.mlProbability ?? 0) < 0.70) return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          stock.symbol.toLowerCase().includes(q) ||
          stock.name.toLowerCase().includes(q) ||
          (stock.sector && stock.sector.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Category filter (only applicable to company stocks)
      if (!isSector && category !== 'All' && stock.category !== category) return false;

      // Sector filter
      if (sector !== 'All' && stock.sector !== sector) return false;

      // Mode & Strategy Preset specific criteria
      const activePreset: ScreenerStrategyPreset =
        mode === 'screener'
          ? strategyPreset
          : mode === 'confluence'
          ? 'confluence'
          : mode === 'breakout'
          ? 'breakout'
          : mode === 'monthly'
          ? 'monthly'
          : mode === 'radar'
          ? 'coiling'
          : strategyPreset;

      if (activePreset === 'confluence') {
        if (stock.confluenceScore < 3 && stock.breakoutScore < 4) return false;
      } else if (activePreset === 'breakout') {
        if (stock.breakoutScore < 3) return false;
        if (stock.phase === 'distribution' || stock.phase === 'pullback') return false;
      } else if (activePreset === 'multi-day') {
        const mdm = stock.multiDayMomentum;
        const qualifiesMultiDay = Boolean(
          mdm?.isMultiDayClimber ||
          ((mdm?.consecutiveUpDays ?? 0) >= 2 && (mdm?.return5dPct ?? 0) >= 2.0)
        );
        if (!qualifiesMultiDay) return false;
        if (stock.phase === 'distribution' || stock.phase === 'pullback') return false;
      } else if (activePreset === 'coiling') {
        if (stock.squeezeBarCount < 3 && (!stock.technicalParams?.bbWidth || stock.technicalParams.bbWidth > 0.08) && stock.stage !== 1) return false;
      } else if (activePreset === 'monthly') {
        if (monthlyStateFilter === 'TRADE_READY') {
          if (!stock.dailyTradeReady && stock.confluenceScore < 4) return false;
        } else if (monthlyStateFilter === 'CONFIRMED+') {
          if (!stock.dailyConfirmed && !stock.dailyTradeReady && stock.breakoutScore < 5) return false;
        } else {
          const win = parseFloat(stock.monthlyWinRate || '0');
          if (win < 50 && !stock.dailyTradeReady && !stock.dailyConfirmed) return false;
        }
      }

      if (minScore > 0 && stock.confluenceScore < minScore && stock.breakoutScore < minScore) return false;

      return true;
    });

    // Intelligent Composite Alpha Ranking
    const activePreset: ScreenerStrategyPreset =
      mode === 'screener'
        ? strategyPreset
        : mode === 'confluence'
        ? 'confluence'
        : mode === 'breakout'
        ? 'breakout'
        : mode === 'monthly'
        ? 'monthly'
        : mode === 'radar'
        ? 'coiling'
        : strategyPreset;

    return list.sort((a, b) => {
      if (activePreset === 'breakout') {
        const rankA = (a.breakoutScore * 100) + (a.mlProbability * 100) + (a.confluenceScore * 10);
        const rankB = (b.breakoutScore * 100) + (b.mlProbability * 100) + (b.confluenceScore * 10);
        return rankB - rankA;
      }
      if (activePreset === 'confluence') {
        const rankA = (a.confluenceScore * 60) + (a.breakoutScore * 40) + (a.mlProbability * 100);
        const rankB = (b.confluenceScore * 60) + (b.breakoutScore * 40) + (b.mlProbability * 100);
        return rankB - rankA;
      }
      if (activePreset === 'multi-day') {
        const rankA =
          ((a.multiDayMomentum?.consecutiveUpDays ?? 0) * 35) +
          ((a.multiDayMomentum?.upDaysInLast5 ?? 0) * 12) +
          ((a.multiDayMomentum?.return5dPct ?? 0) * 6) +
          (a.mlProbability * 50);
        const rankB =
          ((b.multiDayMomentum?.consecutiveUpDays ?? 0) * 35) +
          ((b.multiDayMomentum?.upDaysInLast5 ?? 0) * 12) +
          ((b.multiDayMomentum?.return5dPct ?? 0) * 6) +
          (b.mlProbability * 50);
        return rankB - rankA;
      }
      if (activePreset === 'coiling') {
        if ((a.squeezeBarCount || 0) !== (b.squeezeBarCount || 0)) {
          return (b.squeezeBarCount || 0) - (a.squeezeBarCount || 0);
        }
        return b.mlProbability - a.mlProbability;
      }
      if (activePreset === 'monthly') {
        const winA = parseFloat(a.monthlyWinRate || '0');
        const winB = parseFloat(b.monthlyWinRate || '0');
        if (winA !== winB) return winB - winA;
        return b.mlProbability - a.mlProbability;
      }
      // 'all' composite alpha ranking
      const rankA = (a.confluenceScore * 40) + (a.breakoutScore * 30) + (a.mlProbability * 100) + (a.riskRewardRatio * 10);
      const rankB = (b.confluenceScore * 40) + (b.breakoutScore * 30) + (b.mlProbability * 100) + (b.riskRewardRatio * 10);
      return rankB - rankA;
    });
  }, [stocks, searchQuery, category, sector, minScore, mode, strategyPreset, monthlyStateFilter, assetFilter, boardFilter, universe]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleUpdateStockSector = (symbol: string, newSector: string) => {
    setStocks(prev => {
      const updated = prev.map(s => (s.symbol === symbol ? { ...s, sector: newSector } : s));
      saveStocksToDatabase(updated).catch(() => {});
      return updated;
    });
    if (selectedStock && selectedStock.symbol === symbol) {
      setSelectedStock(prev => (prev ? { ...prev, sector: newSector } : null));
    }
  };

  const handleDataLoaded = (newStocks: DseStockItem[], summary: UploadedDataSummary) => {
    // Ensure all incoming stocks have their precise DSE company sector resolved and benchmarks segregated
    const upgraded: DseStockItem[] = newStocks.map(s => {
      const isBench = isBenchmarkSymbol(s.symbol) || s.sector === 'Benchmark';
      if (isBench) {
        return { ...s, sector: 'Benchmark', isSectorIndex: true, category: 'N/A' };
      }
      if (isSectorIndexSymbol(s.symbol)) {
        const res = resolveSectorIndexInfo(s.symbol);
        return { ...s, sector: res.sector, isSectorIndex: true, name: res.name };
      }
      const res = resolveCompanySector(s.symbol, s.name);
      const isSme = isSmeSymbol(s.symbol) || Boolean(s.isSme) || res.sector === 'SME Platform' || isUnclassifiedSector(s.sector);
      const assignedSector = isSme ? 'SME Platform' : res.sector;
      return {
        ...s,
        sector: assignedSector,
        name: s.name && s.name !== s.symbol ? s.name : res.name,
        isSme,
        isSectorIndex: false,
        marketBoard: isSme ? 'SME' : (s.marketBoard || 'MAIN'),
      };
    });

    setStocks(upgraded);
    // Auto-save to IndexedDB so user doesn't lose uploaded data
    saveStocksToDatabase(upgraded).then(res => {
      setLastSavedTime(new Date(res.savedAt).toLocaleTimeString());
    }).catch(() => {});

    // Automatically synchronize index & live breadth from uploaded scrips (clearing any stale manual override)
    const dsexItem =
      upgraded.find(s => isDsexSymbol(s.symbol)) ||
      upgraded.find(s => s.symbol === '00_DSEX' || s.symbol === 'DSEX' || s.symbol === 'INDEX');
    const ds30Item =
      upgraded.find(s => isDs30Symbol(s.symbol)) ||
      upgraded.find(s => s.symbol === '00_DS30' || s.symbol === 'DS30' || s.symbol === 'DSE30');
    const nonSectors = upgraded.filter(
      s => !s.isSectorIndex && !isSectorIndexSymbol(s.symbol) && !isBenchmarkSymbol(s.symbol) && s.sector !== 'Benchmark'
    );

    if (dsexItem || ds30Item || nonSectors.length > 0) {
      const getLastD = (item: DseStockItem) =>
        item.latestBarDate || (item.bars && item.bars.length > 0 ? item.bars[item.bars.length - 1].date : '');
      const dateCountMap = new Map<string, number>();
      for (const s of nonSectors) {
        const d = getLastD(s);
        if (d) dateCountMap.set(d, (dateCountMap.get(d) || 0) + 1);
      }
      const sortedDates = Array.from(dateCountMap.keys()).sort();
      let sessionDate = sortedDates[sortedDates.length - 1] || '';
      if (nonSectors.length >= 10 && sortedDates.length > 1) {
        const minBroad = Math.max(3, Math.floor(nonSectors.length * 0.25));
        for (let i = sortedDates.length - 1; i >= 0; i--) {
          if ((dateCountMap.get(sortedDates[i]) || 0) >= minBroad) {
            sessionDate = sortedDates[i];
            break;
          }
        }
      }

      const onSession = sessionDate ? nonSectors.filter(s => getLastD(s) === sessionDate) : nonSectors;
      const hasVolData = onSession.some(s => (s.volume || 0) > 0);
      const activeTraded = hasVolData
        ? onSession.filter(s => (s.volume || 0) > 0 || (s.turnoverCr || 0) > 0 || Math.abs(s.changePercent) > 0.0001)
        : onSession;

      const activeAdv = activeTraded.filter(s => s.changePercent > 0.0001).length;
      const activeDec = activeTraded.filter(s => s.changePercent < -0.0001).length;
      const activeUnch = Math.max(0, activeTraded.length - activeAdv - activeDec);
      const scannedTurnoverCr = Math.round(onSession.reduce((acc, s) => acc + (s.turnoverCr || 0), 0) * 100) / 100;
      const scannedVolumeShares = onSession.reduce((acc, s) => acc + (s.volume || 0), 0);
      const scannedVolumeMn = Math.round((scannedVolumeShares / 1000000) * 100) / 100;

      const benchmarkItem = dsexItem || ds30Item;
      const syncedTurnoverCr =
        nonSectors.length >= 20 && scannedTurnoverCr > 0
          ? scannedTurnoverCr
          : benchmarkItem && benchmarkItem.turnoverCr > 0
          ? Math.round(benchmarkItem.turnoverCr * 100) / 100
          : scannedTurnoverCr;
      const syncedVolumeShares =
        nonSectors.length >= 20 && scannedVolumeShares > 0
          ? scannedVolumeShares
          : benchmarkItem && benchmarkItem.volume > 0
          ? benchmarkItem.volume
          : scannedVolumeShares;
      const syncedVolumeMn =
        syncedVolumeShares > 0 ? Math.round((syncedVolumeShares / 1000000) * 100) / 100 : scannedVolumeMn;

      const finalDsexPrice =
        dsexItem && dsexItem.lastPrice > 3000
          ? dsexItem.lastPrice
          : marketBreadth.dsexIndex > 3000
          ? marketBreadth.dsexIndex
          : 5450.63;
      const finalDsexChange = dsexItem ? dsexItem.change : marketBreadth.dsexChange;
      const finalDsexChangePct = dsexItem ? dsexItem.changePercent : marketBreadth.dsexChangePct;

      const finalDs30Price = ds30Item ? ds30Item.lastPrice : (marketBreadth.ds30Index || 2068.63);
      const finalDs30Change = ds30Item ? ds30Item.change : (marketBreadth.ds30Change ?? 12.45);
      const finalDs30ChangePct = ds30Item ? ds30Item.changePercent : (marketBreadth.ds30ChangePct ?? 0.60);

      const adRatio = activeDec > 0 ? activeAdv / activeDec : activeAdv > 0 ? 2.0 : 1.0;
      const liveRegime: MarketBreadth['regime'] =
        adRatio >= 1.25 && finalDsexChange >= 0
          ? 'BULLISH'
          : adRatio >= 0.9
          ? 'NEUTRAL'
          : adRatio >= 0.65
          ? 'CAUTION'
          : 'BEARISH';

      const updatedBreadth: MarketBreadth = {
        ...marketBreadth,
        dsexIndex: finalDsexPrice,
        dsexChange: finalDsexChange,
        dsexChangePct: finalDsexChangePct,
        ds30Index: finalDs30Price,
        ds30Change: finalDs30Change,
        ds30ChangePct: finalDs30ChangePct,
        advancing: activeAdv,
        declining: activeDec,
        unchanged: activeUnch,
        turnoverCr: syncedTurnoverCr,
        tradeVolumeMn: syncedVolumeMn,
        totalSharesTraded: syncedVolumeShares,
        sessionDate: sessionDate || summary.dateRange.end,
        activeEquitiesCount: activeTraded.length,
        staleEquitiesCount: Math.max(0, nonSectors.length - onSession.length),
        isManualOverride: false,
        regime: liveRegime,
        regimeNote: `Synchronized from ${summary.fileName}: ${activeAdv} Adv / ${activeDec} Dec / ${activeUnch} Unch | Turnover: ৳${syncedTurnoverCr.toFixed(2)} Cr.`,
      };
      setMarketBreadth(updatedBreadth);
      try {
        localStorage.setItem('dse_portal_market_breadth', JSON.stringify(updatedBreadth));
      } catch {
        // storage quota fallback
      }
    }

    if (summary.mergeReport && summary.mergeReport.strategy === 'incremental_merge') {
      setUploadNotification(
        `✓ Incremental data stitched & saved: +${summary.mergeReport.newIncrementalBarsAdded} new bars added across ${summary.symbolsCount} symbols (${summary.fileName}).`
      );
    } else {
      setUploadNotification(`✓ Loaded & saved ${summary.symbolsCount} symbols (${summary.totalBarsCount.toLocaleString()} bars) from ${summary.fileName}`);
    }
    setTimeout(() => setUploadNotification(null), 9000);
  };

  const handleRestorePreseeded = () => {
    setStocks(PRESEEDED_DSE_STOCKS);
    const resetOverride: MarketBreadth = { ...marketBreadth, isManualOverride: false };
    setMarketBreadth(resetOverride);
    try {
      localStorage.setItem('dse_portal_market_breadth', JSON.stringify(resetOverride));
    } catch {
      // ignore
    }
    saveStocksToDatabase(PRESEEDED_DSE_STOCKS).then(() => {
      setLastSavedTime(new Date().toLocaleTimeString());
    });
    setUploadNotification('Loaded sample demonstration dataset and saved to local database.');
    setTimeout(() => setUploadNotification(null), 5000);
  };

  const handleApplyFundamentals = (records: UserFundamentalAndActionRecord[]) => {
    const existingMap = loadUserFundamentalsMap();
    const nextMap: Record<string, UserFundamentalAndActionRecord> = { ...existingMap };
    for (const r of records) {
      const sym = r.symbol.toUpperCase();
      nextMap[sym] = { ...(nextMap[sym] || { symbol: sym }), ...r, symbol: sym };
    }
    saveUserFundamentalsMap(nextMap);

    if (stocks.length > 0) {
      const updated = enrichUniverseMarketContext(
        stocks.map(s => enrichStockAnalytics(mergeUserFundamentalsIntoStock(s, nextMap)))
      );
      setStocks(updated);
      saveStocksToDatabase(updated).then(() => {
        setLastSavedTime(new Date().toLocaleTimeString());
      });
    }
    setUploadNotification(`✓ Saved & merged ${records.length} DSE fundamental / record-date records across active database.`);
    setTimeout(() => setUploadNotification(null), 6000);
  };

  const handleClearFundamentals = () => {
    clearUserFundamentalsMap();
    if (stocks.length > 0) {
      const preseededSet = new Set(PRESEEDED_DSE_STOCKS.map(p => p.symbol));
      const updated = enrichUniverseMarketContext(
        stocks.map(s =>
          enrichStockAnalytics({
            ...s,
            fundamentalsSource: preseededSet.has(s.symbol) ? 'PRESEEDED' : 'DEFAULT_ESTIMATE',
          })
        )
      );
      setStocks(updated);
      saveStocksToDatabase(updated).catch(() => {});
    }
    setUploadNotification('Cleared user-imported fundamental & record-date overrides.');
    setTimeout(() => setUploadNotification(null), 5000);
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Top Global Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-[#0b111e]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 font-mono">
          
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 shadow-md shadow-emerald-500/20">
              <div className="h-full w-full bg-[#0b111e] rounded-[10px] flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  G2-Advisor2
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  DSE QUANT ENGINE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans hidden sm:block">
                Dhaka Stock Exchange Quantitative &bull; ML Confluence Screener
              </p>
            </div>
          </div>

          {/* Header Actions: Upload Stock Data & Execution Radar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Execution Radar Trigger */}
            <button
              onClick={() => setIsAlertsModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-[#070b13] border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-950/20"
            >
              <Bell className="h-4 w-4 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">Execution Radar</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                {executionAlerts.length} Triggers
              </span>
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Upload Stock Data (Folder / ZIP / Excel / CSV)</span>
            </button>

            {/* Global ML Model Status Pill */}
            <button
              onClick={() => setMode('ml-studio')}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#070b13] border border-cyan-500/30 hover:border-cyan-400 text-xs transition-colors cursor-pointer"
            >
              <BrainCircuit className="h-4 w-4 text-cyan-400" />
              <span className="text-slate-300">ML:</span>
              <span className="text-emerald-400 font-bold">
                {mlStatus.sampleCount > 0 ? `${mlStatus.accuracyPct}% Win (${mlStatus.sampleCount})` : 'Awaiting Data'}
              </span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                mlStatus.dataSourceMode === 'EMPIRICAL_DATASET'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}>
                {mlStatus.state}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-5 w-full flex-1 space-y-5 font-mono">

        {/* Upload Notification Banner */}
        {uploadNotification && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-xs text-emerald-300 flex items-center justify-between gap-2 shadow-lg">
            <div className="flex items-center gap-2 font-sans">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{uploadNotification}</span>
            </div>
            <button
              onClick={() => setUploadNotification(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Database Storage & Persistence Toolbar */}
        <div className="p-3.5 rounded-2xl bg-[#0b111e] border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <HardDrive className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white">Database Storage:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      stocks.length > 0
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {stocks.length > 0 ? `${stocks.length} Symbols Stored` : 'Clean (0 Symbols)'}
                  </span>
                  {stocks.length > 0 && (
                    <span className="text-[11px] text-slate-400 font-sans hidden sm:inline">
                      ({individualStocksCount} company stocks &bull; {sectorIndicesCount} sector indices)
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Database Last Fed Bar Date */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs">
              <CalendarRange className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[11px] text-slate-300 font-sans">Database Last Bar Date:</span>
              <strong className="text-amber-300 font-bold">
                {databaseDateInfo.lastBarDate ? databaseDateInfo.lastBarDate : 'No Data (0 Bars)'}
              </strong>
              {databaseDateInfo.firstBarDate && (
                <span className="text-[10px] text-slate-400 font-sans hidden xl:inline">
                  (Range: {databaseDateInfo.firstBarDate} → {databaseDateInfo.lastBarDate})
                </span>
              )}
            </div>

            {lastSavedTime && (
              <span className="text-[11px] text-slate-400 font-sans hidden md:inline">
                &bull; Last Saved: <strong className="text-emerald-400 font-mono">{lastSavedTime}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Save Database Button */}
            <button
              onClick={handleSaveDatabase}
              disabled={isSavingDb || stocks.length === 0}
              title="Save all active stocks to local IndexedDB"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                stocks.length === 0
                  ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40 hover:border-emerald-400 shadow-sm'
              }`}
            >
              <Save className={`h-3.5 w-3.5 ${isSavingDb ? 'animate-spin' : ''}`} />
              <span>{isSavingDb ? 'Saving...' : 'Save Database'}</span>
            </button>

            {/* Export JSON Backup */}
            <button
              onClick={handleExportDatabase}
              disabled={stocks.length === 0}
              title="Export stock database as a JSON backup file"
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-500/30 hover:border-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export Backup</span>
            </button>

            {/* Import JSON Backup */}
            <button
              onClick={() => dbBackupInputRef.current?.click()}
              title="Restore stock database from a JSON backup file"
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-600"
            >
              <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Import Backup</span>
            </button>
            <input
              type="file"
              ref={dbBackupInputRef}
              accept=".json"
              onChange={handleImportDatabaseBackup}
              className="hidden"
            />

            {/* Clean Database Button */}
            <button
              onClick={() => setIsCleanModalOpen(true)}
              disabled={stocks.length === 0}
              title="Wipe database and reset to clean 0 symbols"
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border bg-rose-950/20 hover:bg-rose-900/40 text-rose-300 border-rose-500/30 hover:border-rose-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clean Database</span>
            </button>
          </div>
        </div>

        {/* Market Breadth & Regime Banner */}
        <div className="p-4 rounded-2xl bg-[#0b111e] border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {/* DSEX Broad Market Index */}
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">DSEX BROAD INDEX</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {databaseDateInfo.lastBarDate ? `As of ${databaseDateInfo.lastBarDate}` : 'Official Portal'}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-white text-base font-mono">
                  {displayMarketBreadth.dsexIndex.toFixed(2)}
                </span>
                <span
                  className={`font-bold font-mono ${
                    displayMarketBreadth.dsexChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {displayMarketBreadth.dsexChange >= 0 ? '+' : ''}
                  {displayMarketBreadth.dsexChange.toFixed(2)} ({displayMarketBreadth.dsexChangePct >= 0 ? '+' : ''}
                  {displayMarketBreadth.dsexChangePct.toFixed(2)}%)
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block" />

            {/* DS30 Blue-Chip Index */}
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">DS30 BLUE-CHIP</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  Top 30
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-white text-base font-mono">
                  {(displayMarketBreadth.ds30Index || 2068.63).toFixed(2)}
                </span>
                <span
                  className={`font-bold font-mono ${
                    (displayMarketBreadth.ds30Change ?? 12.45) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {(displayMarketBreadth.ds30Change ?? 12.45) >= 0 ? '+' : ''}
                  {(displayMarketBreadth.ds30Change ?? 12.45).toFixed(2)} (
                  {(displayMarketBreadth.ds30ChangePct ?? 0.60) >= 0 ? '+' : ''}
                  {(displayMarketBreadth.ds30ChangePct ?? 0.60).toFixed(2)}%)
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block" />

            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {displayMarketBreadth.isManualOverride ? 'OFFICIAL PORTAL OVERRIDE' : 'MARKET BREADTH (LIVE DATA)'}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  A/D: {displayMarketBreadth.declining > 0
                    ? (displayMarketBreadth.advancing / displayMarketBreadth.declining).toFixed(2)
                    : displayMarketBreadth.advancing > 0
                    ? '∞'
                    : '0.00'}x
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-emerald-400 font-bold">↑ {displayMarketBreadth.advancing} Adv</span>
                <span className="text-rose-400 font-bold">↓ {displayMarketBreadth.declining} Dec</span>
                <span className="text-slate-400 font-bold">→ {displayMarketBreadth.unchanged} Unch</span>
              </div>
              {(displayMarketBreadth.staleEquitiesCount ?? 0) > 0 && (
                <div className="text-[9px] text-slate-500 font-sans mt-0.5">
                  Session {scannedBreadth.sessionDate} ({displayMarketBreadth.activeEquitiesCount} active, {displayMarketBreadth.staleEquitiesCount} stale excluded)
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block" />

            {/* Metric 1: Trade Value (Turnover) */}
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">TRADE VALUE (TURNOVER)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Crore BDT
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="font-bold text-amber-400 text-base">
                  ৳{displayMarketBreadth.turnoverCr.toFixed(2)} Cr
                </span>
                <span className="text-[11px] text-slate-400">
                  ({(displayMarketBreadth.turnoverCr * 10).toFixed(1)} mn BDT)
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden md:block" />

            {/* Metric 2: Trade Volume (Number of Shares Traded) */}
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">TRADE VOLUME (SHARES)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Shares Traded
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="font-bold text-cyan-400 text-base">
                  {(displayMarketBreadth.tradeVolumeMn ?? 0).toFixed(2)}M Shs
                </span>
                <span className="text-[11px] text-slate-400">
                  ({(displayMarketBreadth.totalSharesTraded ?? Math.round((displayMarketBreadth.tradeVolumeMn ?? 0) * 1000000)).toLocaleString()})
                </span>
              </div>
            </div>

            {scannedBreadth.count > 0 && (
              <>
                <div className="h-8 w-px bg-slate-800 hidden lg:block" />
                <div className="hidden lg:block">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      SESSION UNIVERSE ({scannedBreadth.activeCount}/{scannedBreadth.count})
                    </span>
                  </div>
                  <div className="space-y-0.5 font-mono text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">{scannedBreadth.advancing} Adv</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-rose-400 font-bold">{scannedBreadth.declining} Dec</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-slate-400 font-bold">{scannedBreadth.unchanged} Unch</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="text-amber-300 font-bold">Val: ৳{scannedBreadth.tradeValueCr.toFixed(2)} Cr</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-cyan-300 font-bold">Vol: {scannedBreadth.tradeVolumeMn.toFixed(2)}M Shs</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] px-2.5 py-1 rounded-full border font-bold ${
                displayMarketBreadth.regime === 'BULLISH'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : displayMarketBreadth.regime === 'NEUTRAL'
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                  : displayMarketBreadth.regime === 'CAUTION'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              REGIME: {displayMarketBreadth.regime}
            </span>
            <button
              onClick={() => setIsPortalDataModalOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-400 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="View, edit, or synchronize official DSE portal benchmark and advance/decline breadth data"
            >
              <Globe className="h-3.5 w-3.5 text-cyan-400" />
              <span>Official DSE Data</span>
            </button>
          </div>
        </div>

        {/* Consolidated 2-Tier Navigation Bar: Core Trade Execution vs Quant Analysis Studios */}
        <div className="bg-[#0b111e] border border-slate-800 rounded-2xl p-2.5 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Group 1: Core Trade Execution */}
            <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1 lg:pb-0">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-1 shrink-0">
                Trade Execution:
              </span>

              {/* High Conviction Trade Decision Engine */}
              <button
                onClick={() => setMode('high-conviction')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  mode === 'high-conviction'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-950/50'
                    : 'text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
                }`}
              >
                <Sparkles className="w-4 h-4 fill-amber-400/30" />
                <span>High Conviction Picks</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-950 text-amber-300 font-bold font-mono">
                  ★ TOP PICKS
                </span>
              </button>

              {/* Unified Market Setup Scanner */}
              <button
                onClick={() => setMode('screener')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  mode === 'screener' || mode === 'quality' || mode === 'breakout' || mode === 'confluence' || mode === 'monthly' || mode === 'radar'
                    ? 'bg-emerald-600 text-slate-950 border-emerald-400 shadow-md shadow-emerald-950'
                    : 'text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Market Setup Scanner</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-950 text-emerald-300 font-bold font-mono">
                  {filteredStocks.length} Setups
                </span>
              </button>
            </div>

            {/* Group 2: Quant Analysis Studios */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs pt-1 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-1 shrink-0">
                Quant Studios:
              </span>

              {/* Sector Rotation Matrix (RRG) Tab */}
              <button
                onClick={() => setMode('sector-rotation')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  mode === 'sector-rotation'
                    ? 'bg-cyan-600 text-slate-950 border-cyan-400 shadow-sm'
                    : 'text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Sector Rotation (RRG)</span>
              </button>

              {/* Profit & Risk Optimizer Tab (Monte Carlo & Kelly) */}
              <button
                onClick={() => setMode('profit-optimizer')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  mode === 'profit-optimizer'
                    ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                    : 'text-purple-400 border-purple-500/30 hover:bg-purple-500/10'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Profit &amp; Risk Optimizer</span>
              </button>

              {/* Quantitative Strategy Backtester */}
              <button
                onClick={() => setMode('backtester')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  mode === 'backtester'
                    ? 'bg-emerald-600 text-slate-950 border-emerald-400 shadow-sm'
                    : 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Backtester</span>
              </button>

              {/* Machine Learning Studio Tab */}
              <button
                onClick={() => setMode('ml-studio')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  mode === 'ml-studio'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                    : 'text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10'
                }`}
              >
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>23-Feature ML</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Routing Based on Selected Mode */}
        {mode === 'high-conviction' ? (
          <HighConvictionTradeSuggestions
            stocks={stocks}
            marketBreadth={displayMarketBreadth}
            onSelectStock={stock => setSelectedStock(stock)}
            onNavigateToScreener={() => setMode('quality')}
          />
        ) : mode === 'ml-studio' ? (
          <React.Suspense fallback={<div className="p-12 text-center text-slate-400 font-mono text-xs">Loading 23-Feature ML Studio...</div>}>
            <MachineLearningStudio
              stocks={stocks}
              mlStatus={mlStatus}
              empiricalSummary={empiricalMlSummary ?? undefined}
              onSelectStock={stock => setSelectedStock(stock)}
            />
          </React.Suspense>
        ) : mode === 'profit-optimizer' ? (
          <React.Suspense fallback={<div className="p-12 text-center text-slate-400 font-mono text-xs">Loading Profit Prediction Optimizer...</div>}>
            <ProfitPredictionOptimizer
              stocks={stocks}
              selectedStockSymbol={selectedStock?.symbol}
              onSelectStock={stock => setSelectedStock(stock)}
            />
          </React.Suspense>
        ) : mode === 'backtester' ? (
          <React.Suspense fallback={<div className="p-12 text-center text-slate-400 font-mono text-xs">Loading Strategy Backtester &amp; Accuracy Audit...</div>}>
            <StrategyBacktester
              stocks={stocks}
              onSelectStock={stock => setSelectedStock(stock)}
            />
          </React.Suspense>
        ) : mode === 'sector-rotation' ? (
          <React.Suspense fallback={<div className="p-12 text-center text-slate-400 font-mono text-xs">Loading Sector Rotation Matrix...</div>}>
            <SectorRotationMatrix
              stocks={stocks}
              onSelectSector={sec => {
                setSector(sec);
                setMode('screener');
              }}
              onSelectStock={stock => setSelectedStock(stock)}
              onUpdateStockSector={handleUpdateStockSector}
            />
          </React.Suspense>
        ) : (
          <>
            {/* Screener Description Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                  Market Setup Scanner
                </h2>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Unified algorithmic setup engine &bull; 8-Rule AmiBroker confluence &bull; 23-feature ML target hit scoring &bull; DSE T+2 &amp; Circuit headroom defense
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="font-bold text-white">{filteredStocks.length} SETUPS FOUND</span>
                </div>

                <button
                  onClick={handleManualRefresh}
                  title="Rescan market"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Inline Strategy Preset Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-[#0b111e] border border-slate-800 text-xs shadow-md">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mr-1">
                  Scanner Strategy:
                </span>
                {[
                  { id: 'all', label: 'All Setups', icon: TrendingUp },
                  { id: 'confluence', label: 'Confluence Breakout', icon: Sparkles },
                  { id: 'breakout', label: 'Fresh Breakout', icon: Zap },
                  { id: 'multi-day', label: 'Multi-Day Climbers', icon: Activity },
                  { id: 'coiling', label: 'Coiling Base (Radar)', icon: Radar },
                  { id: 'monthly', label: 'Monthly Proven', icon: CalendarRange },
                ].map(p => {
                  const Icon = p.icon;
                  const isActive = strategyPreset === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setStrategyPreset(p.id as ScreenerStrategyPreset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm font-black'
                          : 'bg-[#070b13] text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="text-[11px] text-slate-400 font-mono hidden md:block">
                Preset: <span className="text-emerald-400 font-bold capitalize">{strategyPreset}</span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-4 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-3.5 text-xs">
              {/* Asset Class Filter Tabs: Individual Stocks vs Sector Indices vs All */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 rounded-xl bg-[#070b13] border border-slate-800">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 text-[11px] font-sans px-1">Asset Class:</span>
                  <button
                    onClick={() => {
                      setAssetFilter('stocks');
                      setSector('All');
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      assetFilter === 'stocks'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-md shadow-emerald-950/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <span>🏢 Individual Stocks</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono">
                      {individualStocksCount}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setAssetFilter('sectors');
                      setSector('All');
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      assetFilter === 'sectors'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-md shadow-purple-950/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <span>📊 Sector Indices</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono">
                      {sectorIndicesCount}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setAssetFilter('all');
                      setSector('All');
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      assetFilter === 'all'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-950/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <span>🌐 All Assets</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono">
                      {stocks.length}
                    </span>
                  </button>
                </div>

                <div className="text-[11px] font-sans">
                  {assetFilter === 'stocks' && (
                    <span className="text-emerald-400/90 hidden sm:inline">
                      ✓ Sector indices (01_BANK, 02_CEMENT...) excluded from stock list
                    </span>
                  )}
                  {assetFilter === 'sectors' && (
                    <span className="text-purple-300 hidden sm:inline">
                      Viewing AmiBroker sector index benchmarks (01_BANK, 02_CEMENT, 14_PHARMA...)
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search DSE symbol (e.g. SQURPHARMA)..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>

                {/* Market Board Filter */}
                <div>
                  <select
                    value={boardFilter}
                    onChange={e => setBoardFilter(e.target.value as 'ALL' | 'MAIN' | 'SME')}
                    className="w-full bg-[#070b13] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer text-xs font-semibold"
                  >
                    <option value="ALL">Board: All Markets ({individualStocksCount})</option>
                    <option value="MAIN">Board: Main Board ({mainBoardCount})</option>
                    <option value="SME">Board: SME Platform ({smeBoardCount})</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as UiCategory)}
                    className="w-full bg-[#070b13] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer text-xs"
                  >
                    <option value="All">Category: All (A, B, Z)</option>
                    <option value="A">Category A (Regular Dividend)</option>
                    <option value="B">Category B (Occasional Dividend)</option>
                    <option value="Z">Category Z (Speculative / Default)</option>
                  </select>
                </div>

                {/* Sector Filter */}
                <div>
                  <select
                    value={sector}
                    onChange={e => setSector(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer text-xs"
                  >
                    {sectorsList.map(sec => (
                      <option key={sec} value={sec}>
                        Sector: {sec}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Score / State Threshold */}
                {mode === 'monthly' ? (
                  <div>
                    <select
                      value={monthlyStateFilter}
                      onChange={e => setMonthlyStateFilter(e.target.value as MonthlyStateFilter)}
                      className="w-full bg-[#070b13] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer text-xs"
                    >
                      <option value="All">Monthly State: All Setups</option>
                      <option value="CONFIRMED+">Confirmed+ (High Probability)</option>
                      <option value="TRADE_READY">Trade Ready Only</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <select
                      value={minScore}
                      onChange={e => setMinScore(Number(e.target.value))}
                      className="w-full bg-[#070b13] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer text-xs"
                    >
                      <option value={0}>Min Score: Any Score</option>
                      <option value={3}>Min Score: 3+</option>
                      <option value={4}>Min Score: 4+ (Recommended)</option>
                      <option value={5}>Min Score: 5+ (High Conviction)</option>
                      <option value={6}>Min Score: 6+ (Elite Setups)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Quick Universe Selector */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Trading Universe:</span>
                  {(['liquid', 'curated', 'full'] as const).map(u => (
                    <button
                      key={u}
                      onClick={() => setUniverse(u)}
                      className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                        universe === u ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-[#070b13] hover:text-white'
                      }`}
                    >
                      {u === 'liquid' && 'Liquid Watchlist (Turnover Floor)'}
                      {u === 'curated' && 'Curated Shortlist (Walk-Forward)'}
                      {u === 'full' && 'Full DSE Market Exploration'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setBoardFilter('ALL');
                      setCategory('All');
                      setSector('All');
                      setMinScore(0);
                      setUniverse('full');
                      setMonthlyStateFilter('All');
                    }}
                    className="text-slate-400 hover:text-white hover:underline"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Screener Cards Grid or Clean Database Onboarding */}
            {stocks.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-5">
                <div className="p-4 w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                  <Database className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-white">Stock Database is Clean (0 Symbols Loaded)</h3>
                  <p className="text-xs text-slate-400 max-w-lg mx-auto font-sans leading-relaxed">
                    Preloaded demonstration data has been removed. You have a clean database ready for your personal AmiBroker files, ZIP/RAR archives, Excel spreadsheets, or CSV quotations.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
                  >
                    <UploadCloud className="h-4 w-4" />
                    <span>Upload Stock Data (AmiBroker / ZIP / Excel / CSV)</span>
                  </button>

                  <button
                    onClick={() => dbBackupInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FolderOpen className="h-4 w-4 text-amber-400" />
                    <span>Import JSON Database Backup</span>
                  </button>

                  <button
                    onClick={handleRestorePreseeded}
                    className="px-4 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    <span>Load Sample Demo Data</span>
                  </button>
                </div>
              </div>
            ) : filteredStocks.length === 0 ? (
              <div className="text-center py-20 rounded-2xl bg-[#0b111e] border border-slate-800 space-y-3">
                <Filter className="h-8 w-8 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">No DSE setups matching current filters</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans">
                  Try lowering the minimum score, changing the sector filter, or toggling between Individual Stocks and Sector Indices.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setBoardFilter('ALL');
                    setCategory('All');
                    setSector('All');
                    setMinScore(0);
                    setUniverse('full');
                    setAssetFilter('stocks');
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-slate-950 font-bold text-xs cursor-pointer hover:bg-emerald-500"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredStocks.map(stock => (
                  <ScreenerCardItem
                    key={stock.symbol}
                    stock={stock}
                    mode={mode}
                    onSelect={s => setSelectedStock(s)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Interactive Modals (Lazy Loaded with Suspense) */}
      <React.Suspense fallback={null}>
        {selectedStock && (
          <StockDetailModal
            stock={selectedStock}
            onClose={() => setSelectedStock(null)}
            onUpdateStockSector={handleUpdateStockSector}
          />
        )}

        {isUploadModalOpen && (
          <DataUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            existingStocks={stocks}
            onDataLoaded={handleDataLoaded}
            onRestorePreseeded={handleRestorePreseeded}
            onApplyFundamentals={handleApplyFundamentals}
            onClearFundamentals={handleClearFundamentals}
          />
        )}

        {isAlertsModalOpen && (
          <ExecutionAlertsModal
            isOpen={isAlertsModalOpen}
            onClose={() => setIsAlertsModalOpen(false)}
            alerts={executionAlerts}
            stocks={stocks}
            onSelectStock={stock => setSelectedStock(stock)}
          />
        )}

        {isCleanModalOpen && (
          <CleanDatabaseModal
            isOpen={isCleanModalOpen}
            onClose={() => setIsCleanModalOpen(false)}
            onConfirmClean={handleConfirmCleanDatabase}
            onExportBackup={handleExportDatabase}
            symbolsCount={stocks.length}
          />
        )}

        {isPortalDataModalOpen && (
          <DsePortalDataModal
            isOpen={isPortalDataModalOpen}
            onClose={() => setIsPortalDataModalOpen(false)}
            currentBreadth={displayMarketBreadth}
            onUpdateBreadth={handleUpdateMarketBreadth}
            scannedStocksCount={scannedBreadth.activeCount}
            scannedAdvancing={scannedBreadth.advancing}
            scannedDeclining={scannedBreadth.declining}
            scannedUnchanged={scannedBreadth.unchanged}
            scannedTurnoverCr={scannedBreadth.tradeValueCr}
            scannedTradeVolumeMn={scannedBreadth.tradeVolumeMn}
            scannedTotalShares={scannedBreadth.totalSharesVolume}
          />
        )}
      </React.Suspense>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0b111e] py-4 text-xs font-mono text-slate-500 mt-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>G2-Advisor2 &bull; Dhaka Stock Exchange Quantitative Intelligence</span>
          <div className="flex items-center gap-3">
            <span>23-Feature Walk-Forward ML Engine</span>
            <span>&bull;</span>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="text-emerald-400 hover:underline cursor-pointer"
            >
              Upload Data (ZIP / CSV)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
