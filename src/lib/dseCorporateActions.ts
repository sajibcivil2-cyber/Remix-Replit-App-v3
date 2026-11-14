/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DseStockItem, DseCorporateAction } from '../types/dse';

/**
 * Standard DSE Corporate Actions Seed Data
 * In DSE, companies declare dividends (cash & stock/bonus) along with an AGM & Record Date.
 * On Record Date, share trading remains SUSPENDED for that session.
 * On the following session (Ex-Date), price is adjusted downwards by the dividend value.
 */
export const DSE_CORPORATE_ACTIONS_DATABASE: Record<string, Omit<DseCorporateAction, 'lockoutRisk' | 'daysToRecordDate' | 'isRecordDateApproaching' | 'estimatedExPrice'>> = {
  SQURPHARMA: {
    recordDate: '2026-11-24',
    dividendCashPct: 110, // 110% = ৳11.00 / share
    dividendBonusPct: 0,
    agmDate: '2026-12-18',
    financialYear: '2025-2026',
    details: '110% Cash Dividend approved by Board. Book closure / Record Date: Nov 24, 2026.',
  },
  BATBC: {
    recordDate: '2026-11-18',
    dividendCashPct: 200, // 200% = ৳20.00 / share
    dividendBonusPct: 0,
    agmDate: '2026-12-10',
    financialYear: '2025-2026',
    details: '200% Final Cash Dividend. Trading will be suspended on Record Date Nov 18.',
  },
  GP: {
    recordDate: '2026-12-08',
    dividendCashPct: 125, // 125% = ৳12.50 / share
    dividendBonusPct: 0,
    agmDate: '2026-12-28',
    financialYear: '2025-2026',
    details: '125% Interim Cash Dividend declared. Record Date Dec 08.',
  },
  BRACBANK: {
    recordDate: '2026-11-26',
    dividendCashPct: 10,  // 10% cash = ৳1.00
    dividendBonusPct: 10, // 10% bonus shares
    agmDate: '2026-12-22',
    financialYear: '2025-2026',
    details: '10% Cash and 10% Stock Dividend. Share dilution on Ex-Date.',
  },
  OLYMPIC: {
    recordDate: '2026-11-17',
    dividendCashPct: 60, // 60% = ৳6.00 / share
    dividendBonusPct: 0,
    agmDate: '2026-12-12',
    financialYear: '2025-2026',
    details: '60% Cash Dividend. Record Date Nov 17; High T+2 lockout risk.',
  },
  RENATA: {
    recordDate: '2026-12-15',
    dividendCashPct: 92,
    dividendBonusPct: 8,
    agmDate: '2026-12-30',
    financialYear: '2025-2026',
    details: '92% Cash and 8% Bonus Dividend. Record Date Dec 15.',
  },
  MARICO: {
    recordDate: '2026-11-20',
    dividendCashPct: 450, // 450% = ৳45.00 / share
    dividendBonusPct: 0,
    agmDate: '2026-12-16',
    financialYear: '2025-2026',
    details: '450% 2nd Interim Cash Dividend. High dividend adjustment on Ex-date.',
  },
  UPGDCL: {
    recordDate: '2026-11-16',
    dividendCashPct: 140, // 140% = ৳14.00 / share
    dividendBonusPct: 0,
    agmDate: '2026-12-14',
    financialYear: '2025-2026',
    details: '140% Cash Dividend. Immediate T+2 Lockout Zone.',
  },
  LHBL: {
    recordDate: '2026-11-25',
    dividendCashPct: 36, // 36% = ৳3.60 / share
    dividendBonusPct: 0,
    agmDate: '2026-12-20',
    financialYear: '2025-2026',
    details: '36% Interim Cash Dividend declared by LafargeHolcim.',
  },
  SEAPEARL: {
    recordDate: '2026-11-15',
    dividendCashPct: 17, // 17% = ৳1.70 / share
    dividendBonusPct: 0,
    agmDate: '2026-12-08',
    financialYear: '2025-2026',
    details: '17% Cash Dividend. Trading halted on Nov 15 Record Date.',
  },
  MEGHNALIFE: {
    recordDate: '2026-11-19',
    dividendCashPct: 15,
    dividendBonusPct: 0,
    agmDate: '2026-12-15',
    financialYear: '2025-2026',
    details: '15% Cash Dividend for year ended Dec 2025.',
  },
  EBL: {
    recordDate: '2026-12-05',
    dividendCashPct: 12.5,
    dividendBonusPct: 12.5,
    agmDate: '2026-12-24',
    financialYear: '2025-2026',
    details: '12.5% Cash + 12.5% Stock Dividend.',
  },
  BEXIMCO: {
    recordDate: '2026-11-30',
    dividendCashPct: 5,
    dividendBonusPct: 0,
    agmDate: '2026-12-23',
    financialYear: '2025-2026',
    details: '5% Cash Dividend. Record Date Nov 30.',
  },
};

/**
 * Calculates trading business days between two dates, skipping Friday & Saturday (DSE weekend)
 */
export function calculateDseTradingDaysBetween(startDateStr: string, endDateStr: string): number {
  try {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 999;
    if (start >= end) return 0;

    let count = 0;
    const cur = new Date(start);
    while (cur < end) {
      cur.setDate(cur.getDate() + 1);
      const day = cur.getDay();
      // Skip Friday (5) and Saturday (6)
      if (day !== 5 && day !== 6) {
        count++;
      }
    }
    return count;
  } catch {
    return 999;
  }
}

/**
 * Evaluates Corporate Action and Record Date Lockout Risk for a given stock
 */
export function evaluateCorporateActionLockout(
  stock: DseStockItem,
  referenceDateStr?: string
): DseCorporateAction | undefined {
  const sym = stock.symbol.toUpperCase();
  const rawAction = stock.corporateAction || DSE_CORPORATE_ACTIONS_DATABASE[sym];
  if (!rawAction || !rawAction.recordDate) {
    return undefined;
  }

  // Reference session date: either provided, latestBarDate, or today's date
  const todayStr = new Date().toISOString().split('T')[0];
  const sessionDate = referenceDateStr || stock.latestBarDate || todayStr;
  const daysToRecordDate = calculateDseTradingDaysBetween(sessionDate, rawAction.recordDate);

  let lockoutRisk: DseCorporateAction['lockoutRisk'] = 'SAFE_CLEAR';
  if (daysToRecordDate <= 2) {
    lockoutRisk = 'CRITICAL_T2_LOCKOUT';
  } else if (daysToRecordDate <= 6) {
    lockoutRisk = 'APPROACHING_CAUTION';
  } else {
    lockoutRisk = 'SAFE_CLEAR';
  }

  // DSE Ex-Dividend Price Adjustment formula:
  // Face value in Bangladesh is ৳10.
  // Cash dividend per share = 10 * (dividendCashPct / 100)
  // Dilution factor = 1 / (1 + (dividendBonusPct / 100))
  const cashPerShareBDT = rawAction.dividendCashPct ? (10 * (rawAction.dividendCashPct / 100)) : 0;
  const bonusFactor = rawAction.dividendBonusPct ? (1 + (rawAction.dividendBonusPct / 100)) : 1;
  const priceAfterCash = Math.max(1, stock.lastPrice - cashPerShareBDT);
  const estimatedExPrice = Math.round((priceAfterCash / bonusFactor) * 10) / 10;

  return {
    ...rawAction,
    daysToRecordDate,
    isRecordDateApproaching: daysToRecordDate <= 6,
    lockoutRisk,
    estimatedExPrice,
  };
}

/**
 * Enriches a stock item with evaluated corporate actions
 */
export function enrichStockWithCorporateAction(
  stock: DseStockItem,
  referenceDateStr?: string
): DseStockItem {
  const ca = evaluateCorporateActionLockout(stock, referenceDateStr);
  if (!ca) return stock;
  return {
    ...stock,
    corporateAction: ca,
  };
}

export interface UserFundamentalAndActionRecord {
  symbol: string;
  category?: 'A' | 'B' | 'Z' | 'N/A';
  pe?: number;
  freeFloatPct?: number;
  marketCapCr?: number;
  divYield?: number;
  recordDate?: string;
  dividendCashPct?: number;
  dividendBonusPct?: number;
  agmDate?: string;
  details?: string;
}

const USER_FUNDAMENTALS_STORAGE_KEY = 'dse_user_fundamentals_v1';

export function loadUserFundamentalsMap(): Record<string, UserFundamentalAndActionRecord> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = localStorage.getItem(USER_FUNDAMENTALS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveUserFundamentalsMap(map: Record<string, UserFundamentalAndActionRecord>): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(USER_FUNDAMENTALS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota errors
  }
}

export function clearUserFundamentalsMap(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.removeItem(USER_FUNDAMENTALS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function normalizeFlexibleDateStr(raw: string): string | undefined {
  const s = (raw || '').trim();
  if (!s || s === '-' || s.toLowerCase() === 'n/a') return undefined;
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const a = Number(dmyMatch[1]);
    const b = Number(dmyMatch[2]);
    const y = Number(dmyMatch[3]);
    // Prefer DD/MM/YYYY for DSE dates unless second part > 12
    const day = b > 12 ? b : a;
    const month = b > 12 ? a : b;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return undefined;
}

function parseOptionalNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[৳,%\sBDT]/gi, '').trim();
  if (!cleaned || cleaned === '-' || cleaned.toLowerCase() === 'n/a') return undefined;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : undefined;
}

/**
 * Parses CSV / TSV / pasted table rows containing DSE Category, P/E, Public Float %,
 * Market Cap, Dividend Yield, and Corporate Action Record Date / AGM info.
 */
export function parseDseFundamentalsAndActionsText(text: string): {
  records: UserFundamentalAndActionRecord[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    return { records: [], warnings: ['No rows provided.'] };
  }

  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';
  const splitRow = (line: string): string[] => {
    if (delimiter !== ',') return line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const firstCells = splitRow(lines[0]).map(c => c.toLowerCase());
  const hasHeader = firstCells.some(c =>
    /(symbol|ticker|code|scrip|category|cat|p\/?e|float|public|market.?cap|record)/i.test(c)
  );

  let colMap = {
    symbol: 0,
    category: 1,
    pe: 2,
    freeFloatPct: 3,
    marketCapCr: 4,
    divYield: -1,
    recordDate: 5,
    dividendCashPct: 6,
    dividendBonusPct: 7,
    agmDate: 8,
  };

  let startIdx = 0;
  if (hasHeader) {
    startIdx = 1;
    colMap = {
      symbol: firstCells.findIndex(c => /(symbol|ticker|trading.?code|code|scrip)/i.test(c)),
      category: firstCells.findIndex(c => /(category|cat|group)/i.test(c)),
      pe: firstCells.findIndex(c => /^(p\/?e|pe|audited.?pe|price.?earnings)$/i.test(c.replace(/\s+/g, '')) || /\bp\/?e\b/i.test(c)),
      freeFloatPct: firstCells.findIndex(c => /(float|public|free.?float)/i.test(c)),
      marketCapCr: firstCells.findIndex(c => /(market.?cap|mcap|cap.?cr)/i.test(c)),
      divYield: firstCells.findIndex(c => /(yield|div.?yield)/i.test(c)),
      recordDate: firstCells.findIndex(c => /(record.?date|book.?closure|rec.?date)/i.test(c)),
      dividendCashPct: firstCells.findIndex(c => /(cash.?div|cash.?%|cash)/i.test(c)),
      dividendBonusPct: firstCells.findIndex(c => /(bonus|stock.?div)/i.test(c)),
      agmDate: firstCells.findIndex(c => /(agm)/i.test(c)),
    };
    if (colMap.symbol < 0) colMap.symbol = 0;
  }

  const records: UserFundamentalAndActionRecord[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const cells = splitRow(lines[i]);
    if (cells.length === 0) continue;
    const rawSym = (cells[colMap.symbol] || '').toUpperCase().replace(/[^A-Z0-9._-]/g, '');
    if (!rawSym || rawSym.length < 2) continue;

    const rec: UserFundamentalAndActionRecord = { symbol: rawSym };

    if (colMap.category >= 0 && cells[colMap.category]) {
      const catUpper = cells[colMap.category].toUpperCase().trim();
      if (catUpper === 'A' || catUpper === 'B' || catUpper === 'Z') {
        rec.category = catUpper;
      } else if (catUpper === 'N' || catUpper === 'N/A') {
        rec.category = 'B'; // N-category newly listed shares share B/transitional risk posture
      }
    }

    if (colMap.pe >= 0) rec.pe = parseOptionalNumber(cells[colMap.pe]);
    if (colMap.freeFloatPct >= 0) rec.freeFloatPct = parseOptionalNumber(cells[colMap.freeFloatPct]);
    if (colMap.marketCapCr >= 0) rec.marketCapCr = parseOptionalNumber(cells[colMap.marketCapCr]);
    if (colMap.divYield >= 0) rec.divYield = parseOptionalNumber(cells[colMap.divYield]);
    if (colMap.recordDate >= 0) rec.recordDate = normalizeFlexibleDateStr(cells[colMap.recordDate] || '');
    if (colMap.dividendCashPct >= 0) rec.dividendCashPct = parseOptionalNumber(cells[colMap.dividendCashPct]);
    if (colMap.dividendBonusPct >= 0) rec.dividendBonusPct = parseOptionalNumber(cells[colMap.dividendBonusPct]);
    if (colMap.agmDate >= 0) rec.agmDate = normalizeFlexibleDateStr(cells[colMap.agmDate] || '');

    if (rec.recordDate) {
      rec.details = `User-imported Corporate Action (${rec.dividendCashPct ?? 0}% cash, ${rec.dividendBonusPct ?? 0}% bonus). Record Date: ${rec.recordDate}.`;
    }

    if (
      rec.category ||
      rec.pe !== undefined ||
      rec.freeFloatPct !== undefined ||
      rec.marketCapCr !== undefined ||
      rec.divYield !== undefined ||
      rec.recordDate
    ) {
      records.push(rec);
    } else {
      warnings.push(`Row ${i + 1} (${rawSym}): no valid fundamental or record date fields detected.`);
    }
  }

  return { records, warnings };
}

/**
 * Applies imported fundamentals & corporate actions onto a stock item without mutating OHLCV history.
 */
export function mergeUserFundamentalsIntoStock(
  stock: DseStockItem,
  userMap?: Record<string, UserFundamentalAndActionRecord>
): DseStockItem {
  const map = userMap ?? loadUserFundamentalsMap();
  const sym = stock.symbol.toUpperCase();
  const rec = map[sym];

  if (!rec) {
    return enrichStockWithCorporateAction(stock);
  }

  const nextCorpAction = rec.recordDate
    ? {
        recordDate: rec.recordDate,
        dividendCashPct: rec.dividendCashPct ?? stock.corporateAction?.dividendCashPct ?? 0,
        dividendBonusPct: rec.dividendBonusPct ?? stock.corporateAction?.dividendBonusPct ?? 0,
        agmDate: rec.agmDate ?? stock.corporateAction?.agmDate,
        financialYear: stock.corporateAction?.financialYear ?? 'Current',
        details: rec.details ?? stock.corporateAction?.details,
      }
    : stock.corporateAction;

  const updated: DseStockItem = {
    ...stock,
    category: rec.category ?? stock.category,
    pe: rec.pe ?? stock.pe,
    freeFloatPct: rec.freeFloatPct ?? stock.freeFloatPct,
    marketCapCr: rec.marketCapCr ?? stock.marketCapCr,
    divYield: rec.divYield ?? stock.divYield,
    corporateAction: nextCorpAction,
    fundamentalsSource: 'USER_IMPORTED',
  };

  return enrichStockWithCorporateAction(updated);
}
