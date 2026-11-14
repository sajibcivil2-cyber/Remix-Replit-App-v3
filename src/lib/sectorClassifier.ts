/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Known DSE sector code mappings from AmiBroker conventions
 */
export const KNOWN_SECTOR_MAP: Record<string, { sector: string; name: string }> = {
  // Standard 2-digit underscore formats and Market Benchmarks
  '00_DSEX': { sector: 'Benchmark', name: 'DSEX Broad Market Index' },
  '00.DSEX': { sector: 'Benchmark', name: 'DSEX Broad Market Index' },
  '00-DSEX': { sector: 'Benchmark', name: 'DSEX Broad Market Index' },
  '00DSEX': { sector: 'Benchmark', name: 'DSEX Broad Market Index' },
  'DSEX': { sector: 'Benchmark', name: 'DSEX Broad Market Index' },
  'DSE_X': { sector: 'Benchmark', name: 'DSEX Broad Market Index' },
  'DSE-X': { sector: 'Benchmark', name: 'DSEX Broad Market Index' },
  'DSEX_INDEX': { sector: 'Benchmark', name: 'DSEX Broad Market Index' },
  'DSEXINDEX': { sector: 'Benchmark', name: 'DSEX Broad Market Index' },
  'INDEX': { sector: 'Benchmark', name: 'DSEX Broad Market Index' },

  '00_DS30': { sector: 'Benchmark', name: 'DS30 Blue-Chip Index' },
  '00.DS30': { sector: 'Benchmark', name: 'DS30 Blue-Chip Index' },
  '00-DS30': { sector: 'Benchmark', name: 'DS30 Blue-Chip Index' },
  '00DS30': { sector: 'Benchmark', name: 'DS30 Blue-Chip Index' },
  'DS30': { sector: 'Benchmark', name: 'DS30 Blue-Chip Index' },
  'DSE30': { sector: 'Benchmark', name: 'DS30 Blue-Chip Index' },
  'DSE_30': { sector: 'Benchmark', name: 'DS30 Blue-Chip Index' },
  'DSE-30': { sector: 'Benchmark', name: 'DS30 Blue-Chip Index' },
  'DSE 30': { sector: 'Benchmark', name: 'DS30 Blue-Chip Index' },
  'DS30_INDEX': { sector: 'Benchmark', name: 'DS30 Blue-Chip Index' },
  'DS30INDEX': { sector: 'Benchmark', name: 'DS30 Blue-Chip Index' },

  'DSES': { sector: 'Benchmark', name: 'DSE Shariah Index' },
  'DSES_INDEX': { sector: 'Benchmark', name: 'DSE Shariah Index' },
  'CDSET': { sector: 'Benchmark', name: 'DSE DSEX Benchmark' },
  'DGEN': { sector: 'Benchmark', name: 'DSE General Index' },

  '00_DSMEX': { sector: 'Benchmark', name: 'DSMEX SME Market Index' },
  '00.DSMEX': { sector: 'Benchmark', name: 'DSMEX SME Market Index' },
  '00-DSMEX': { sector: 'Benchmark', name: 'DSMEX SME Market Index' },
  '00DSMEX': { sector: 'Benchmark', name: 'DSMEX SME Market Index' },
  'DSMEX': { sector: 'Benchmark', name: 'DSMEX SME Market Index' },
  'DSMEX_INDEX': { sector: 'Benchmark', name: 'DSMEX SME Market Index' },
  'DSMEXINDEX': { sector: 'Benchmark', name: 'DSMEX SME Market Index' },
  'DISSEMINAT': { sector: 'Benchmark', name: 'DSE Broadcast Feed (Dissemination)' },
  'DISSEMINATION': { sector: 'Benchmark', name: 'DSE Broadcast Feed (Dissemination)' },

  '01_BANK': { sector: 'Bank', name: 'Banking Sector Index' },
  '01_BANKING': { sector: 'Bank', name: 'Banking Sector Index' },
  '01.BANK': { sector: 'Bank', name: 'Banking Sector Index' },

  '02_CEMENT': { sector: 'Cement', name: 'Cement Sector Index' },
  '02.CEMENT': { sector: 'Cement', name: 'Cement Sector Index' },

  '03_CERAMICS': { sector: 'Ceramics', name: 'Ceramics Sector Index' },
  '03_CERAMIC': { sector: 'Ceramics', name: 'Ceramics Sector Index' },
  '03.CERAMIC': { sector: 'Ceramics', name: 'Ceramics Sector Index' },

  '04_ENGINEERING': { sector: 'Engineering', name: 'Engineering Sector Index' },
  '04_ENGG': { sector: 'Engineering', name: 'Engineering Sector Index' },
  '04.ENGG': { sector: 'Engineering', name: 'Engineering Sector Index' },

  '05_FOOD': { sector: 'Food & Allied', name: 'Food & Allied Sector Index' },
  '05_FOOD_ALLIED': { sector: 'Food & Allied', name: 'Food & Allied Sector Index' },
  '05.FOOD': { sector: 'Food & Allied', name: 'Food & Allied Sector Index' },

  '06_FUEL': { sector: 'Fuel & Power', name: 'Fuel & Power Sector Index' },
  '06_FUEL_POWER': { sector: 'Fuel & Power', name: 'Fuel & Power Sector Index' },
  '06.FUEL': { sector: 'Fuel & Power', name: 'Fuel & Power Sector Index' },

  '07_INSURANCE': { sector: 'General Insurance', name: 'General Insurance Sector Index' },
  '07_GENINS': { sector: 'General Insurance', name: 'General Insurance Sector Index' },
  '07.GENINS': { sector: 'General Insurance', name: 'General Insurance Sector Index' },

  '08_LIFEINS': { sector: 'Life Insurance', name: 'Life Insurance Sector Index' },
  '08_LIFE_INSURANCE': { sector: 'Life Insurance', name: 'Life Insurance Sector Index' },
  '08.LIFEINS': { sector: 'Life Insurance', name: 'Life Insurance Sector Index' },

  '08_IT': { sector: 'Information Technology', name: 'IT Sector Index' },
  '09_IT': { sector: 'Information Technology', name: 'IT Sector Index' },
  '08_IT_SECTOR': { sector: 'Information Technology', name: 'IT Sector Index' },
  '08.IT': { sector: 'Information Technology', name: 'IT Sector Index' },

  '09_JUTE': { sector: 'Jute', name: 'Jute Sector Index' },
  '10_JUTE': { sector: 'Jute', name: 'Jute Sector Index' },
  '09.JUTE': { sector: 'Jute', name: 'Jute Sector Index' },

  '10_MISC': { sector: 'Miscellaneous', name: 'Miscellaneous Sector Index' },
  '10_MISCELLANEOUS': { sector: 'Miscellaneous', name: 'Miscellaneous Sector Index' },
  '11_MISC': { sector: 'Miscellaneous', name: 'Miscellaneous Sector Index' },
  '10.MISC': { sector: 'Miscellaneous', name: 'Miscellaneous Sector Index' },

  '11_MUTUAL_FUND': { sector: 'Mutual Funds', name: 'Mutual Funds Sector Index' },
  '11_MF': { sector: 'Mutual Funds', name: 'Mutual Funds Sector Index' },
  '12_MF': { sector: 'Mutual Funds', name: 'Mutual Funds Sector Index' },
  '11.MF': { sector: 'Mutual Funds', name: 'Mutual Funds Sector Index' },

  '12_NBFI': { sector: 'Financial Institutions', name: 'Financial Institutions (NBFI) Sector Index' },
  '12_FINANCIAL_INSTITUTIONS': { sector: 'Financial Institutions', name: 'Financial Institutions Sector Index' },
  '13_NBFI': { sector: 'Financial Institutions', name: 'Financial Institutions Sector Index' },
  '12.NBFI': { sector: 'Financial Institutions', name: 'Financial Institutions Sector Index' },

  '13_PAPER': { sector: 'Paper & Printing', name: 'Paper & Printing Sector Index' },
  '13_PAPER_PRINTING': { sector: 'Paper & Printing', name: 'Paper & Printing Sector Index' },
  '14_PAPER': { sector: 'Paper & Printing', name: 'Paper & Printing Sector Index' },
  '13.PAPER': { sector: 'Paper & Printing', name: 'Paper & Printing Sector Index' },

  '14_PHARMA': { sector: 'Pharmaceuticals & Chemicals', name: 'Pharma & Chemicals Sector Index' },
  '14_PHARMACEUTICALS': { sector: 'Pharmaceuticals & Chemicals', name: 'Pharma & Chemicals Sector Index' },
  '15_PHARMA': { sector: 'Pharmaceuticals & Chemicals', name: 'Pharma & Chemicals Sector Index' },
  '14.PHARMA': { sector: 'Pharmaceuticals & Chemicals', name: 'Pharma & Chemicals Sector Index' },

  '15_SERVICES': { sector: 'Services & Real Estate', name: 'Services & Real Estate Sector Index' },
  '15_REAL_ESTATE': { sector: 'Services & Real Estate', name: 'Services & Real Estate Sector Index' },
  '16_SERVICES': { sector: 'Services & Real Estate', name: 'Services & Real Estate Sector Index' },
  '15.SERVICES': { sector: 'Services & Real Estate', name: 'Services & Real Estate Sector Index' },

  '16_TANNERY': { sector: 'Tannery Industries', name: 'Tannery Sector Index' },
  '17_TANNERY': { sector: 'Tannery Industries', name: 'Tannery Sector Index' },
  '16.TANNERY': { sector: 'Tannery Industries', name: 'Tannery Sector Index' },

  '17_TELECOM': { sector: 'Telecommunication', name: 'Telecommunication Sector Index' },
  '17_TELECOMMUNICATION': { sector: 'Telecommunication', name: 'Telecommunication Sector Index' },
  '18_TELECOM': { sector: 'Telecommunication', name: 'Telecommunication Sector Index' },
  '17.TELECOM': { sector: 'Telecommunication', name: 'Telecommunication Sector Index' },

  '18_TEXTILE': { sector: 'Textile', name: 'Textile Sector Index' },
  '19_TEXTILE': { sector: 'Textile', name: 'Textile Sector Index' },
  '18.TEXTILE': { sector: 'Textile', name: 'Textile Sector Index' },

  '19_TRAVEL': { sector: 'Travel & Leisure', name: 'Travel & Leisure Sector Index' },
  '19_TRAVEL_LEISURE': { sector: 'Travel & Leisure', name: 'Travel & Leisure Sector Index' },
  '20_TRAVEL': { sector: 'Travel & Leisure', name: 'Travel & Leisure Sector Index' },
  '19.TRAVEL': { sector: 'Travel & Leisure', name: 'Travel & Leisure Sector Index' },
};

/**
 * Checks if a given ticker symbol represents a broad market benchmark index
 * (such as DSEX, DS30, DSE30, 00_DSEX, 00_DS30, CDSET, DSES, etc.)
 */
export function isBenchmarkSymbol(symbol: string): boolean {
  if (!symbol) return false;
  const upper = symbol.toUpperCase().trim();
  if (KNOWN_SECTOR_MAP[upper]?.sector === 'Benchmark') return true;
  return (
    /^(?:00[_. -]?)?(?:DSEX|DS30|DSE30|DSE_30|DSE-30|DSE 30|DSE_X|DSE-X|DSE X|DSES|DSMEX|CDSET|DGEN|CSE30|CASPI|INDEX)(?:[_ -]?INDEX)?$/i.test(upper) ||
    /^(DSEX|DS30|DSE30|DSE-30|DSE_30|DSMEX|00_DSEX|00_DS30|00_DSMEX|00.DSEX|00.DS30|00.DSMEX)$/i.test(upper) ||
    /^DISSEMINAT/i.test(upper) ||
    upper === 'BENCHMARK'
  );
}

/**
 * Specifically checks if a given ticker symbol represents the DSEX Broad Market Index
 * (e.g. "00_DSEX", "DSEX", "00.DSEX", "00-DSEX", "DSE_X", "DSE-X", "DSEXINDEX", "INDEX", "DGEN", "CDSET").
 * Strictly excludes DS30 and DSES to prevent cross-contamination.
 */
export function isDsexSymbol(symbol: string): boolean {
  if (!symbol) return false;
  const upper = symbol.toUpperCase().trim();
  // Strictly prevent DS30, DSMEX, or DSES from ever being treated as DSEX
  if (/DS30|DSE30|DSE_30|DSE-30|DSE 30|DSES|DSMEX/i.test(upper)) return false;
  return (
    /^(?:00[_. -]?)?(?:DSEX|DSE_X|DSE-X|DSE X|DSEXINDEX|INDEX|DGEN|CDSET)(?:[_ -]?INDEX)?$/i.test(upper) ||
    upper === '00_DSEX' ||
    upper === 'DSEX' ||
    upper === 'INDEX' ||
    upper === 'DSE_X' ||
    upper === 'DSE-X'
  );
}

/**
 * Specifically checks if a given ticker symbol represents the DS30 Blue-Chip Index
 * (e.g. "00_DS30", "DS30", "00.DS30", "00-DS30", "DSE30", "DSE_30", "DSE-30", "DSE 30", "DS30INDEX").
 */
export function isDs30Symbol(symbol: string): boolean {
  if (!symbol) return false;
  const upper = symbol.toUpperCase().trim();
  return (
    /^(?:00[_. -]?)?(?:DS30|DSE30|DSE_30|DSE-30|DSE 30|DS30INDEX)(?:[_ -]?INDEX)?$/i.test(upper) ||
    upper === '00_DS30' ||
    upper === 'DS30' ||
    upper === 'DSE30' ||
    upper === '00.DS30' ||
    upper === '00-DS30'
  );
}

/**
 * Specifically checks if a given ticker symbol represents the DSE Shariah Index (DSES).
 */
export function isDsesSymbol(symbol: string): boolean {
  if (!symbol) return false;
  const upper = symbol.toUpperCase().trim();
  return (
    /^(?:00[_. -]?)?(?:DSES)(?:[_ -]?INDEX)?$/i.test(upper) ||
    upper === '00_DSES' ||
    upper === 'DSES' ||
    upper === '00.DSES' ||
    upper === '00-DSES'
  );
}

/**
 * Specifically checks if a given ticker symbol represents the DSE SME Market Index (DSMEX).
 */
export function isSmeIndexSymbol(symbol: string): boolean {
  if (!symbol) return false;
  const upper = symbol.toUpperCase().trim();
  return (
    /^(?:00[_. -]?)?(?:DSMEX)(?:[_ -]?INDEX)?$/i.test(upper) ||
    upper === '00_DSMEX' ||
    upper === 'DSMEX' ||
    upper === '00.DSMEX' ||
    upper === '00-DSMEX'
  );
}

/**
 * Checks if a given ticker symbol represents a sector index or market benchmark
 * rather than an individual tradeable company stock.
 *
 * Handles patterns such as:
 * - "01_BANK", "02_CEMENT", "14_PHARMA", "01.BANK", "01-BANK", "01 BANK", "01BANK"
 * - "SECTOR_BANK", "SEC_PHARMA"
 * - "INDEX_ENGINEERING", "IDX_TEXTILE"
 * - "DSEX", "DS30", "DSE30", "00_DSEX", "00_DS30", "DSES", "CDSET"
 */
export function isSectorIndexSymbol(symbol: string): boolean {
  if (!symbol) return false;
  const upper = symbol.toUpperCase().trim();

  // 1. Direct benchmark index check
  if (isBenchmarkSymbol(upper)) return true;

  // 2. Direct match with known AmiBroker sector indices
  if (KNOWN_SECTOR_MAP[upper]) return true;

  // 3. Two digits followed by delimiter or sector name (e.g. 01_BANK, 18_TEXTILE, 04.ENGG, 01-BANK, 01 BANK)
  if (/^\d{2}[_. -]?[A-Za-z0-9_& -]+$/i.test(upper)) return true;

  // 4. Starts with common sector/index prefixes
  if (/^(SECTOR_|SEC_|INDEX_|IDX_)[A-Za-z0-9_& -]+$/i.test(upper)) return true;

  return false;
}

/**
 * Normalizes any variation of DSE sector nomenclature to the official canonical sector name.
 * Prevents fragmentation where slight naming differences create phantom sectors with 1 scrip.
 */
export function normalizeSectorName(rawSector?: string | null): string {
  if (!rawSector) return 'Unclassified Equities';
  const clean = rawSector.trim();
  const lower = clean.toLowerCase();

  if (isUnclassifiedSector(clean)) return 'Unclassified Equities';
  if (lower === 'benchmark') return 'Benchmark';

  // Canonical matching
  if (/^bank/i.test(lower)) return 'Bank';
  if (/^cement/i.test(lower)) return 'Cement';
  if (/^ceramic/i.test(lower)) return 'Ceramics';
  if (/^(engg|engineering)/i.test(lower)) return 'Engineering';
  if (/^food/i.test(lower)) return 'Food & Allied';
  if (/^(fuel|power|energy)/i.test(lower)) return 'Fuel & Power';
  if (/^(general\s*ins|gen\s*ins|non[- ]?life)/i.test(lower)) return 'General Insurance';
  if (lower === 'insurance') return 'General Insurance';
  if (/^life\s*ins/i.test(lower)) return 'Life Insurance';
  if (/^(it|it\s*sector|information\s*tech)/i.test(lower)) return 'Information Technology';
  if (/^jute/i.test(lower)) return 'Jute';
  if (/^(misc|miscellaneous)/i.test(lower)) return 'Miscellaneous';
  if (/^(mutual\s*fund|mf\b)/i.test(lower)) return 'Mutual Funds';
  if (/^(nbfi|financial\s*inst|finance|leasing)/i.test(lower)) return 'Financial Institutions';
  if (/^paper/i.test(lower)) return 'Paper & Printing';
  if (/^(pharma|pharmaceutical|chemical)/i.test(lower)) return 'Pharmaceuticals & Chemicals';
  if (/^(service|real\s*estate)/i.test(lower)) return 'Services & Real Estate';
  if (/^(tannery|leather|footwear)/i.test(lower)) return 'Tannery Industries';
  if (/^telecom/i.test(lower)) return 'Telecommunication';
  if (/^textile/i.test(lower)) return 'Textile';
  if (/^(travel|leisure|tourism|hotel)/i.test(lower)) return 'Travel & Leisure';
  if (/^sme/i.test(lower)) return 'SME Platform';
  if (/^(bond|debenture)/i.test(lower)) return 'Corporate Bond';

  return clean;
}

/**
 * Resolves a clean display name and sector title for a sector index symbol.
 */
export function resolveSectorIndexInfo(symbol: string): { sector: string; name: string } {
  const upper = symbol.toUpperCase().trim();

  if (KNOWN_SECTOR_MAP[upper]) {
    return KNOWN_SECTOR_MAP[upper];
  }

  // Extract suffix if formatted as 01_NAME, 01-NAME, 01.NAME, or SECTOR_NAME
  const cleanSuffix = upper
    .replace(/^\d{2}[_. -]?/, '')
    .replace(/^(SECTOR_|SEC_|INDEX_|IDX_)/, '')
    .replace(/_/g, ' ')
    .trim();

  const canonicalSector = normalizeSectorName(cleanSuffix);
  const formattedSector = canonicalSector !== 'Unclassified Equities'
    ? canonicalSector
    : cleanSuffix
        .toLowerCase()
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

  return {
    sector: formattedSector || 'Sector Index',
    name: `${formattedSector || upper} Sector Index`,
  };
}

/**
 * Official 19 Market Sectors of Dhaka Stock Exchange (DSE) + Corporate Bonds
 */
export const OFFICIAL_DSE_SECTORS = [
  'Bank',
  'Financial Institutions',
  'General Insurance',
  'Life Insurance',
  'Pharmaceuticals & Chemicals',
  'Fuel & Power',
  'Food & Allied',
  'Engineering',
  'Cement',
  'Textile',
  'Information Technology',
  'Ceramics',
  'Mutual Funds',
  'Services & Real Estate',
  'Tannery Industries',
  'Travel & Leisure',
  'Jute',
  'Paper & Printing',
  'Telecommunication',
  'Miscellaneous',
  'Corporate Bond',
  'SME Platform',
] as const;

export type OfficialDseSector = typeof OFFICIAL_DSE_SECTORS[number];

export function isUnclassifiedSector(sector?: string | null): boolean {
  if (!sector) return true;
  const s = sector.trim().toLowerCase();
  return s === 'general market' || s === 'general' || s === 'unclassified' || s === 'unclassified equities' || s === 'unmapped';
}

/**
 * LocalStorage management for User-Defined Sector Overrides
 * Allows traders to custom-remap any scrip directly in the app.
 */
const CUSTOM_SECTOR_OVERRIDES_KEY = 'dse_custom_sector_overrides';

export function getCustomSectorOverrides(): Record<string, string> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(CUSTOM_SECTOR_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setCustomSectorOverride(symbol: string, sector: string): void {
  if (typeof window === 'undefined' || !window.localStorage || !symbol) return;
  try {
    const current = getCustomSectorOverrides();
    const cleanSym = symbol.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    current[cleanSym] = sector;
    // Also save raw symbol
    current[symbol.toUpperCase().trim()] = sector;
    localStorage.setItem(CUSTOM_SECTOR_OVERRIDES_KEY, JSON.stringify(current));
  } catch {}
}

export function clearCustomSectorOverride(symbol: string): void {
  if (typeof window === 'undefined' || !window.localStorage || !symbol) return;
  try {
    const current = getCustomSectorOverrides();
    const cleanSym = symbol.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    delete current[cleanSym];
    delete current[symbol.toUpperCase().trim()];
    localStorage.setItem(CUSTOM_SECTOR_OVERRIDES_KEY, JSON.stringify(current));
  } catch {}
}

/**
 * Master official sector & company name dictionary for listed Dhaka Stock Exchange (DSE) equities.
 * Covers all 390+ listed scrips across 19 sectors and active corporate debentures.
 */
export const DSE_COMPANY_SECTOR_MAP: Record<string, { sector: string; name: string }> = {
  // ==========================================
  // --- 1. BANK (35 Listed Banks) ---
  // ==========================================
  'ABBANK': { sector: 'Bank', name: 'AB Bank PLC' },
  'ALARABANK': { sector: 'Bank', name: 'Al-Arafah Islami Bank PLC' },
  'AIBL': { sector: 'Bank', name: 'Al-Arafah Islami Bank PLC' },
  'BANKASIA': { sector: 'Bank', name: 'Bank Asia PLC' },
  'BRACBANK': { sector: 'Bank', name: 'BRAC Bank PLC' },
  'CITYBANK': { sector: 'Bank', name: 'The City Bank PLC' },
  'DHAKABANK': { sector: 'Bank', name: 'Dhaka Bank PLC' },
  'DUTCHBANGL': { sector: 'Bank', name: 'Dutch-Bangla Bank PLC' },
  'DBBL': { sector: 'Bank', name: 'Dutch-Bangla Bank PLC' },
  'EBL': { sector: 'Bank', name: 'Eastern Bank PLC' },
  'EXIMBANK': { sector: 'Bank', name: 'Export Import Bank of Bangladesh PLC' },
  'FIRSTSBANK': { sector: 'Bank', name: 'First Security Islami Bank PLC' },
  'FSIBL': { sector: 'Bank', name: 'First Security Islami Bank PLC' },
  'GIB': { sector: 'Bank', name: 'Global Islami Bank PLC' },
  'GLOBALISLAMI': { sector: 'Bank', name: 'Global Islami Bank PLC' },
  'ICBIBANK': { sector: 'Bank', name: 'ICB Islamic Bank Ltd.' },
  'IFIC': { sector: 'Bank', name: 'IFIC Bank PLC' },
  'ISLAMIBANK': { sector: 'Bank', name: 'Islami Bank Bangladesh PLC' },
  'IBBL': { sector: 'Bank', name: 'Islami Bank Bangladesh PLC' },
  'JAMUNABANK': { sector: 'Bank', name: 'Jamuna Bank PLC' },
  'MERCANBANK': { sector: 'Bank', name: 'Mercantile Bank PLC' },
  'MBL': { sector: 'Bank', name: 'Mercantile Bank PLC' },
  'MIDLANDBNK': { sector: 'Bank', name: 'Midland Bank Ltd.' },
  'MTBL': { sector: 'Bank', name: 'Mutual Trust Bank PLC' },
  'NBL': { sector: 'Bank', name: 'National Bank Ltd.' },
  'NCCBANK': { sector: 'Bank', name: 'NCC Bank PLC' },
  'NRBBANK': { sector: 'Bank', name: 'NRB Bank PLC' },
  'NRB': { sector: 'Bank', name: 'NRB Bank PLC' },
  'ONEBANKLTD': { sector: 'Bank', name: 'ONE Bank PLC' },
  'ONEBANK': { sector: 'Bank', name: 'ONE Bank PLC' },
  'PREMIERBAN': { sector: 'Bank', name: 'The Premier Bank PLC' },
  'PRIMEBANK': { sector: 'Bank', name: 'Prime Bank PLC' },
  'PUBALIBANK': { sector: 'Bank', name: 'Pubali Bank PLC' },
  'PBL': { sector: 'Bank', name: 'Pubali Bank PLC' },
  'RUPALIBANK': { sector: 'Bank', name: 'Rupali Bank PLC' },
  'SBACBANK': { sector: 'Bank', name: 'South Bangla Agriculture & Commerce Bank' },
  'SHAHJABANK': { sector: 'Bank', name: 'Shahjalal Islami Bank PLC' },
  'SJIBL': { sector: 'Bank', name: 'Shahjalal Islami Bank PLC' },
  'SIBL': { sector: 'Bank', name: 'Social Islami Bank PLC' },
  'SOUTHEASTB': { sector: 'Bank', name: 'Southeast Bank PLC' },
  'SOUTHEAST': { sector: 'Bank', name: 'Southeast Bank PLC' },
  'SEBANK': { sector: 'Bank', name: 'Southeast Bank PLC' },
  'STANDBANKL': { sector: 'Bank', name: 'Standard Bank PLC' },
  'TRUSTBANK': { sector: 'Bank', name: 'Trust Bank Ltd.' },
  'UCB': { sector: 'Bank', name: 'United Commercial Bank PLC' },
  'UNIONBANK': { sector: 'Bank', name: 'Union Bank PLC' },
  'UTTARABANK': { sector: 'Bank', name: 'Uttara Bank PLC' },

  // ==========================================
  // --- 2. FINANCIAL INSTITUTIONS / NBFI (23) ---
  // ==========================================
  'BAYLEASING': { sector: 'Financial Institutions', name: 'Bay Leasing & Investment Ltd.' },
  'BDFINANCE': { sector: 'Financial Institutions', name: 'Bangladesh Finance Ltd. (BD Finance)' },
  'BANGLAFIN': { sector: 'Financial Institutions', name: 'Bangladesh Finance Ltd. (BD Finance)' },
  'BIFC': { sector: 'Financial Institutions', name: 'Bangladesh Industrial Finance Company' },
  'DBH': { sector: 'Financial Institutions', name: 'DBH Finance PLC' },
  'FAREASTFIN': { sector: 'Financial Institutions', name: 'Fareast Finance & Investment' },
  'FASFIN': { sector: 'Financial Institutions', name: 'FAS Finance & Investment Ltd.' },
  'FIRSTFIN': { sector: 'Financial Institutions', name: 'First Finance Ltd.' },
  'GSPFIN': { sector: 'Financial Institutions', name: 'GSP Finance Company (BD) Ltd.' },
  'ICB': { sector: 'Financial Institutions', name: 'Investment Corporation of Bangladesh' },
  'IDLC': { sector: 'Financial Institutions', name: 'IDLC Finance PLC' },
  'ILFSL': { sector: 'Financial Institutions', name: 'Intl. Leasing & Financial Services' },
  'IPDC': { sector: 'Financial Institutions', name: 'IPDC Finance Ltd.' },
  'IPDCFIN': { sector: 'Financial Institutions', name: 'IPDC Finance Ltd.' },
  'ISLAMICFIN': { sector: 'Financial Institutions', name: 'Islamic Finance & Investment' },
  'LANKABAFIN': { sector: 'Financial Institutions', name: 'LankaBangla Finance PLC' },
  'LBFINANCE': { sector: 'Financial Institutions', name: 'LankaBangla Finance PLC' },
  'MIDASFIN': { sector: 'Financial Institutions', name: 'MIDAS Financing Ltd.' },
  'NHFIL': { sector: 'Financial Institutions', name: 'National Housing Finance and Investments' },
  'PEOPLESFIN': { sector: 'Financial Institutions', name: 'Peoples Leasing & Financial Services' },
  'PLFSL': { sector: 'Financial Institutions', name: 'Peoples Leasing & Financial Services' },
  'PHOENIXFIN': { sector: 'Financial Institutions', name: 'Phoenix Finance & Investments' },
  'PREMIERLEA': { sector: 'Financial Institutions', name: 'Premier Leasing & Finance Ltd.' },
  'PRIMEFIN': { sector: 'Financial Institutions', name: 'Prime Finance & Investment Ltd.' },
  'UNIONCAP': { sector: 'Financial Institutions', name: 'Union Capital Ltd.' },
  'UTTARAFIN': { sector: 'Financial Institutions', name: 'Uttara Finance & Investments' },

  // ==========================================
  // --- 3. GENERAL INSURANCE (42 Listed Insurers) ---
  // ==========================================
  'AGRANIINS': { sector: 'General Insurance', name: 'Agrani Insurance Company Ltd.' },
  'ASIAINS': { sector: 'General Insurance', name: 'Asia Insurance Ltd.' },
  'ASIAPACINS': { sector: 'General Insurance', name: 'Asia Pacific General Insurance Co.' },
  'BDGENINS': { sector: 'General Insurance', name: 'Bangladesh General Insurance Co. (BGIC)' },
  'BGIC': { sector: 'General Insurance', name: 'Bangladesh General Insurance Co.' },
  'BNICL': { sector: 'General Insurance', name: 'Bangladesh National Insurance Co. Ltd.' },
  'CENTRALINS': { sector: 'General Insurance', name: 'Central Insurance Company Ltd.' },
  'CITYGENINS': { sector: 'General Insurance', name: 'City General Insurance Co. Ltd.' },
  'CONTININS': { sector: 'General Insurance', name: 'Continental Insurance Ltd.' },
  'CRYSTALINS': { sector: 'General Insurance', name: 'Crystal Insurance Company Ltd.' },
  'DESHINSUR': { sector: 'General Insurance', name: 'Desh General Insurance Company Ltd.' },
  'DHAKAINS': { sector: 'General Insurance', name: 'Dhaka Insurance Ltd.' },
  'EASTERNINS': { sector: 'General Insurance', name: 'Eastern Insurance Company Ltd.' },
  'EASTLAND': { sector: 'General Insurance', name: 'Eastland Insurance Co. Ltd.' },
  'EXPRESSINS': { sector: 'General Insurance', name: 'Express Insurance Ltd.' },
  'FEDERALINS': { sector: 'General Insurance', name: 'Federal Insurance Company Ltd.' },
  'GLOBALINS': { sector: 'General Insurance', name: 'Global Insurance Ltd.' },
  'GREENDELT': { sector: 'General Insurance', name: 'Green Delta Insurance Co. Ltd.' },
  'ISLAMIINS': { sector: 'General Insurance', name: 'Islami Insurance Bangladesh Ltd.' },
  'JANATAINS': { sector: 'General Insurance', name: 'Janata Insurance Company Ltd.' },
  'KARNAPHULI': { sector: 'General Insurance', name: 'Karnaphuli Insurance Co. Ltd.' },
  'MEGHNAINS': { sector: 'General Insurance', name: 'Meghna Insurance Company Ltd.' },
  'MERCINS': { sector: 'General Insurance', name: 'Mercantile Insurance Co. Ltd.' },
  'NITOLINS': { sector: 'General Insurance', name: 'Nitol Insurance Company Ltd.' },
  'NORTHRNINS': { sector: 'General Insurance', name: 'Northern Islami Insurance Ltd.' },
  'PARAMOUNTI': { sector: 'General Insurance', name: 'Paramount Insurance Co. Ltd.' },
  'PARAMOUNTINS': { sector: 'General Insurance', name: 'Paramount Insurance Co. Ltd.' },
  'PEOPLESINS': { sector: 'General Insurance', name: 'Peoples Insurance Company Ltd.' },
  'PHENIXINS': { sector: 'General Insurance', name: 'Phoenix Insurance Company Ltd.' },
  'PIONEERINS': { sector: 'General Insurance', name: 'Pioneer Insurance Company Ltd.' },
  'PRAGATIINS': { sector: 'General Insurance', name: 'Pragati Insurance Ltd.' },
  'PRIMEINSUR': { sector: 'General Insurance', name: 'Prime Insurance Company Ltd.' },
  'PROVATIINS': { sector: 'General Insurance', name: 'Provati Insurance Company Ltd.' },
  'PURABIGEN': { sector: 'General Insurance', name: 'Purabi General Insurance Co. Ltd.' },
  'RELIANCINS': { sector: 'General Insurance', name: 'Reliance Insurance Ltd.' },
  'REPUBLIC': { sector: 'General Insurance', name: 'Republic Insurance Co. Ltd.' },
  'RUPALIINS': { sector: 'General Insurance', name: 'Rupali Insurance Company Ltd.' },
  'SENAKALYAN': { sector: 'General Insurance', name: 'Sena Kalyan Insurance Co. Ltd.' },
  'SKICL': { sector: 'General Insurance', name: 'Sena Kalyan Insurance Co. Ltd.' },
  'SICL': { sector: 'General Insurance', name: 'Standard Insurance Ltd.' },
  'SIBLINS': { sector: 'General Insurance', name: 'Standard Insurance Ltd.' },
  'SONARBAINS': { sector: 'General Insurance', name: 'Sonar Bangla Insurance Ltd.' },
  'SOUTHISL': { sector: 'General Insurance', name: 'South Asia Insurance Company Ltd.' },
  'SOUTHISLAMI': { sector: 'General Insurance', name: 'South Asia Insurance Company Ltd.' },
  'TAKAFULINS': { sector: 'General Insurance', name: 'Takaful Islami Insurance Ltd.' },
  'UNIONINS': { sector: 'General Insurance', name: 'Union Insurance Co. Ltd.' },
  'UNITEDINS': { sector: 'General Insurance', name: 'United Insurance Company Ltd.' },

  // ==========================================
  // --- 4. LIFE INSURANCE (15 Listed Insurers) ---
  // ==========================================
  'CHARTERED': { sector: 'Life Insurance', name: 'Chartered Life Insurance Co. Ltd.' },
  'DELTALIFE': { sector: 'Life Insurance', name: 'Delta Life Insurance Co. Ltd.' },
  'FAREASTLIF': { sector: 'Life Insurance', name: 'Fareast Islami Life Insurance Co.' },
  'MEGHNALIFE': { sector: 'Life Insurance', name: 'Meghna Life Insurance Co. Ltd.' },
  'NATLIFEINS': { sector: 'Life Insurance', name: 'National Life Insurance Co. Ltd.' },
  'NLI': { sector: 'Life Insurance', name: 'National Life Insurance Co. Ltd.' },
  'PADMALIFE': { sector: 'Life Insurance', name: 'Padma Islami Life Insurance Ltd.' },
  'POPULARLIF': { sector: 'Life Insurance', name: 'Popular Life Insurance Co. Ltd.' },
  'PRAGATILIF': { sector: 'Life Insurance', name: 'Pragati Life Insurance Ltd.' },
  'PRIME_LIFE': { sector: 'Life Insurance', name: 'Prime Islami Life Insurance Ltd.' },
  'PRIMELIFE': { sector: 'Life Insurance', name: 'Prime Islami Life Insurance Ltd.' },
  'PROGRESLIF': { sector: 'Life Insurance', name: 'Progressive Life Insurance Co.' },
  'RUPALILIFE': { sector: 'Life Insurance', name: 'Rupali Life Insurance Co. Ltd.' },
  'SANDHANILF': { sector: 'Life Insurance', name: 'Sandhani Life Insurance Co. Ltd.' },
  'SONALILIFE': { sector: 'Life Insurance', name: 'Sonali Life Insurance Co. Ltd.' },
  'SUNLIFEINS': { sector: 'Life Insurance', name: 'Sunlife Insurance Company Ltd.' },
  'TRUSTLIFE': { sector: 'Life Insurance', name: 'Trust Islami Life Insurance Ltd.' },

  // ==========================================
  // --- 5. PHARMACEUTICALS & CHEMICALS (35) ---
  // ==========================================
  'SQURPHARMA': { sector: 'Pharmaceuticals & Chemicals', name: 'Square Pharmaceuticals Ltd.' },
  'SQUAREPHAR': { sector: 'Pharmaceuticals & Chemicals', name: 'Square Pharmaceuticals Ltd.' },
  'SQUARE': { sector: 'Pharmaceuticals & Chemicals', name: 'Square Pharmaceuticals Ltd.' },
  'RENATA': { sector: 'Pharmaceuticals & Chemicals', name: 'Renata PLC' },
  'BXPHARMA': { sector: 'Pharmaceuticals & Chemicals', name: 'Beximco Pharmaceuticals Ltd.' },
  'BEXIMCOPHAR': { sector: 'Pharmaceuticals & Chemicals', name: 'Beximco Pharmaceuticals Ltd.' },
  'BEXIMCOPH': { sector: 'Pharmaceuticals & Chemicals', name: 'Beximco Pharmaceuticals Ltd.' },
  'BEACONPHAR': { sector: 'Pharmaceuticals & Chemicals', name: 'Beacon Pharmaceuticals PLC' },
  'BEACON': { sector: 'Pharmaceuticals & Chemicals', name: 'Beacon Pharmaceuticals PLC' },
  'IBNSINA': { sector: 'Pharmaceuticals & Chemicals', name: 'The Ibn Sina Pharmaceutical Industry' },
  'ORIONPHARM': { sector: 'Pharmaceuticals & Chemicals', name: 'Orion Pharma Ltd.' },
  'ORIONINFU': { sector: 'Pharmaceuticals & Chemicals', name: 'Orion Infusion Ltd.' },
  'ACI': { sector: 'Pharmaceuticals & Chemicals', name: 'Advanced Chemical Industries (ACI)' },
  'ACIFORMULA': { sector: 'Pharmaceuticals & Chemicals', name: 'ACI Formulations Ltd.' },
  'ACMELAB': { sector: 'Pharmaceuticals & Chemicals', name: 'The ACME Laboratories Ltd.' },
  'ACMEPL': { sector: 'Pharmaceuticals & Chemicals', name: 'The ACME Laboratories Ltd.' },
  'ACMEPEST': { sector: 'Pharmaceuticals & Chemicals', name: 'Acme Pesticides Ltd.' },
  'SILCOPHL': { sector: 'Pharmaceuticals & Chemicals', name: 'Silco Pharmaceuticals Ltd.' },
  'INDOBANGLA': { sector: 'Pharmaceuticals & Chemicals', name: 'Indo-Bangla Pharmaceuticals Ltd.' },
  'IBP': { sector: 'Pharmaceuticals & Chemicals', name: 'Indo-Bangla Pharmaceuticals Ltd.' },
  'ADVENT': { sector: 'Pharmaceuticals & Chemicals', name: 'Advent Pharma Ltd.' },
  'WATACHEM': { sector: 'Pharmaceuticals & Chemicals', name: 'Wata Chemicals Ltd.' },
  'MARICO': { sector: 'Pharmaceuticals & Chemicals', name: 'Marico Bangladesh Ltd.' },
  'KOHINOOR': { sector: 'Pharmaceuticals & Chemicals', name: 'Kohinoor Chemical Company (BD) Ltd.' },
  'SILVAPHL': { sector: 'Pharmaceuticals & Chemicals', name: 'Silva Pharmaceuticals Ltd.' },
  'PHARMAID': { sector: 'Pharmaceuticals & Chemicals', name: 'Pharma Aids Ltd.' },
  'FARMAPAK': { sector: 'Pharmaceuticals & Chemicals', name: 'Pharma Aids Ltd.' },
  'SALVOCHEM': { sector: 'Pharmaceuticals & Chemicals', name: 'Salvo Chemical Industry Ltd.' },
  'KEYACOSMET': { sector: 'Pharmaceuticals & Chemicals', name: 'Keya Cosmetics Ltd.' },
  'LIBRAINFU': { sector: 'Pharmaceuticals & Chemicals', name: 'Libra Infusions Ltd.' },
  'ACTIVEFINE': { sector: 'Pharmaceuticals & Chemicals', name: 'Active Fine Chemicals Ltd.' },
  'GLAXOSMITH': { sector: 'Pharmaceuticals & Chemicals', name: 'GlaxoSmithKline Bangladesh' },
  'GLAXO': { sector: 'Pharmaceuticals & Chemicals', name: 'GlaxoSmithKline Bangladesh' },
  'RECKITTBEN': { sector: 'Pharmaceuticals & Chemicals', name: 'Reckitt Benckiser (Bangladesh) PLC' },
  'JMIHOSPITL': { sector: 'Pharmaceuticals & Chemicals', name: 'JMI Hospital Requisite Manufacturing' },
  'JMISMDL': { sector: 'Pharmaceuticals & Chemicals', name: 'JMI Syringes & Medical Devices' },
  'NAVANAPHAR': { sector: 'Pharmaceuticals & Chemicals', name: 'Navana Pharmaceuticals Ltd.' },
  'ASIATICLAB': { sector: 'Pharmaceuticals & Chemicals', name: 'Asiatic Laboratories Ltd.' },
  'TECHNOFDR': { sector: 'Pharmaceuticals & Chemicals', name: 'Techno Drugs Ltd.' },
  'TECHNODRUG': { sector: 'Pharmaceuticals & Chemicals', name: 'Techno Drugs Ltd.' },
  'TECHNODRUGS': { sector: 'Pharmaceuticals & Chemicals', name: 'Techno Drugs Ltd.' },
  'AFCENTAGRO': { sector: 'Pharmaceuticals & Chemicals', name: 'AFC Agro Biotech Ltd.' },
  'AFCAGRO': { sector: 'Pharmaceuticals & Chemicals', name: 'AFC Agro Biotech Ltd.' },
  'CENTRALPHL': { sector: 'Pharmaceuticals & Chemicals', name: 'Central Pharmaceuticals Ltd.' },
  'CENTRALPH': { sector: 'Pharmaceuticals & Chemicals', name: 'Central Pharmaceuticals Ltd.' },
  'AMBEEPHA': { sector: 'Pharmaceuticals & Chemicals', name: 'Ambee Pharmaceuticals Ltd.' },

  // ==========================================
  // --- 6. TELECOMMUNICATION (3) ---
  // ==========================================
  'GP': { sector: 'Telecommunication', name: 'Grameenphone Ltd.' },
  'ROBI': { sector: 'Telecommunication', name: 'Robi Axiata PLC' },
  'BSCCL': { sector: 'Telecommunication', name: 'Bangladesh Submarine Cables PLC' },

  // ==========================================
  // --- 7. FUEL & POWER (23) ---
  // ==========================================
  'TITASGAS': { sector: 'Fuel & Power', name: 'Titas Gas Transmission & Distribution' },
  'SUMITPOWER': { sector: 'Fuel & Power', name: 'Summit Power Ltd.' },
  'UPGDCL': { sector: 'Fuel & Power', name: 'United Power Generation & Distribution' },
  'POWERGRID': { sector: 'Fuel & Power', name: 'Power Grid Company of Bangladesh' },
  'MJLBD': { sector: 'Fuel & Power', name: 'MJL Bangladesh PLC' },
  'LINDEBD': { sector: 'Fuel & Power', name: 'Linde Bangladesh Ltd.' },
  'DESCO': { sector: 'Fuel & Power', name: 'Dhaka Electric Supply Company Ltd.' },
  'KPCL': { sector: 'Fuel & Power', name: 'Khulna Power Company Ltd.' },
  'DOREENPWR': { sector: 'Fuel & Power', name: 'Doreen Power Generations & Systems' },
  'SHAHJIAPPR': { sector: 'Fuel & Power', name: 'Shahjibazar Power Company Ltd.' },
  'BARKAPWR': { sector: 'Fuel & Power', name: 'Baraka Power Ltd.' },
  'BARKAPOWER': { sector: 'Fuel & Power', name: 'Baraka Power Ltd.' },
  'BPL': { sector: 'Fuel & Power', name: 'Baraka Power Ltd.' },
  'BPPL': { sector: 'Fuel & Power', name: 'Baraka Patenga Power Ltd.' },
  'BARKAPAT': { sector: 'Fuel & Power', name: 'Baraka Patenga Power Ltd.' },
  'LUBRREF': { sector: 'Fuel & Power', name: 'Lub-rref (Bangladesh) Ltd.' },
  'LUB-RREF': { sector: 'Fuel & Power', name: 'Lub-rref (Bangladesh) Ltd.' },
  'EASTRNLUB': { sector: 'Fuel & Power', name: 'Eastern Lubricants Blenders Ltd.' },
  'EASTERNLUB': { sector: 'Fuel & Power', name: 'Eastern Lubricants Blenders Ltd.' },
  'ASSOCIATED': { sector: 'Fuel & Power', name: 'Associated Oxygen Ltd.' },
  'ASSOCOXY': { sector: 'Fuel & Power', name: 'Associated Oxygen Ltd.' },
  'EPGL': { sector: 'Fuel & Power', name: 'Energypac Power Generation PLC' },
  'MPETROLEUM': { sector: 'Fuel & Power', name: 'Meghna Petroleum Ltd.' },
  'PADMAOIL': { sector: 'Fuel & Power', name: 'Padma Oil Company Ltd.' },
  'JAMUNAOIL': { sector: 'Fuel & Power', name: 'Jamuna Oil Company Ltd.' },
  'CVOPRL': { sector: 'Fuel & Power', name: 'CVO Petrochemical Refinery Ltd.' },
  'INTRACO': { sector: 'Fuel & Power', name: 'Intraco Refueling Station Ltd.' },
  'GBBPOWER': { sector: 'Fuel & Power', name: 'GBB Power Ltd.' },
  'VLMEPETRO': { sector: 'Fuel & Power', name: 'VLME Petrochemical Ltd.' },

  // ==========================================
  // --- 8. FOOD & ALLIED (22) ---
  // ==========================================
  'BATBC': { sector: 'Food & Allied', name: 'British American Tobacco Bangladesh' },
  'OLYMPIC': { sector: 'Food & Allied', name: 'Olympic Industries Ltd.' },
  'UNILEVERCL': { sector: 'Food & Allied', name: 'Unilever Consumer Care Ltd.' },
  'INDEXAGRO': { sector: 'Food & Allied', name: 'Index Agro Industries Ltd.' },
  'BDTHAIFOOD': { sector: 'Food & Allied', name: 'BD Thai Food & Beverage Ltd.' },
  'GOLDENHARV': { sector: 'Food & Allied', name: 'Golden Harvest Agro Industries Ltd.' },
  'NTC': { sector: 'Food & Allied', name: 'National Tea Company Ltd.' },
  'APEXFOODS': { sector: 'Food & Allied', name: 'Apex Foods Ltd.' },
  'BANGAS': { sector: 'Food & Allied', name: 'Bangas Ltd.' },
  'AMCL(PRAN)': { sector: 'Food & Allied', name: 'Agricultural Marketing Co. (PRAN)' },
  'AMCLPRAN': { sector: 'Food & Allied', name: 'Agricultural Marketing Co. (PRAN)' },
  'PRAN': { sector: 'Food & Allied', name: 'Agricultural Marketing Co. (PRAN)' },
  'EMERALDOIL': { sector: 'Food & Allied', name: 'Emerald Oil Industries Ltd.' },
  'GEMINISEA': { sector: 'Food & Allied', name: 'Gemini Sea Food PLC' },
  'FUWANGFOOD': { sector: 'Food & Allied', name: 'Fu-Wang Food Ltd.' },
  'FINEFOODS': { sector: 'Food & Allied', name: 'Fine Foods Ltd.' },
  'RDFOOD': { sector: 'Food & Allied', name: 'Rangpur Dairy & Food Products' },
  'TAHFOO': { sector: 'Food & Allied', name: 'Taufika Foods & Lovello Ice-Cream' },
  'LOVELLO': { sector: 'Food & Allied', name: 'Taufika Foods and Lovello Ice-Cream' },
  'BEACHHATCH': { sector: 'Food & Allied', name: 'Beach Hatchery Ltd.' },
  'SHYAMPURS': { sector: 'Food & Allied', name: 'Shyampur Sugar Mills Ltd.' },
  'ZEALBANGLA': { sector: 'Food & Allied', name: 'Zeal Bangla Sugar Mills Ltd.' },
  'MEGHNAPET': { sector: 'Food & Allied', name: 'Meghna Pet Industries Ltd.' },
  'MEGHNACOND': { sector: 'Food & Allied', name: 'Meghna Condensed Milk Industries' },

  // ==========================================
  // --- 9. ENGINEERING (42) ---
  // ==========================================
  'BDAUTOCA': { sector: 'Engineering', name: 'Bangladesh Autocars Ltd.' },
  'BDWELDING': { sector: 'Engineering', name: 'Bangladesh Welding Electrodes Ltd.' },
  'WALTONHIL': { sector: 'Engineering', name: 'Walton Hi-Tech Industries PLC' },
  'WALTON': { sector: 'Engineering', name: 'Walton Hi-Tech Industries PLC' },
  'BSRMSTEEL': { sector: 'Engineering', name: 'BSRM Steels Ltd.' },
  'BSRMLTD': { sector: 'Engineering', name: 'Bangladesh Steel Re-Rolling Mills Ltd.' },
  'GPHISPAT': { sector: 'Engineering', name: 'GPH Ispat Ltd.' },
  'BBS': { sector: 'Engineering', name: 'Bangladesh Building Systems Ltd.' },
  'BBSCABLES': { sector: 'Engineering', name: 'BBS Cables Ltd.' },
  'SINGERBD': { sector: 'Engineering', name: 'Singer Bangladesh Ltd.' },
  'AFTABAUTO': { sector: 'Engineering', name: 'Aftab Automobiles Ltd.' },
  'RUNNERAUTO': { sector: 'Engineering', name: 'Runner Automobiles PLC' },
  'NAVANACNG': { sector: 'Engineering', name: 'Navana CNG Ltd.' },
  'ATLASBANG': { sector: 'Engineering', name: 'Atlas Bangladesh Ltd.' },
  'IFADAUTOS': { sector: 'Engineering', name: 'IFAD Autos PLC' },
  'APOLOISPAT': { sector: 'Engineering', name: 'Appollo Ispat Complex Ltd.' },
  'KAY&QUE': { sector: 'Engineering', name: 'Kay & Que (Bangladesh) Ltd.' },
  'KAYANDQUE': { sector: 'Engineering', name: 'Kay & Que (Bangladesh) Ltd.' },
  'KAY_QUE': { sector: 'Engineering', name: 'Kay & Que (Bangladesh) Ltd.' },
  'YEAKINPOLY': { sector: 'Engineering', name: 'Yeakin Polymer Ltd.' },
  'DOMINAGE': { sector: 'Engineering', name: 'Dominage Steel Building Systems' },
  'ANWARGALV': { sector: 'Engineering', name: 'Anwar Galvanizing Ltd.' },
  'AZIZPIPES': { sector: 'Engineering', name: 'Aziz Pipes Ltd.' },
  'BDLAMPS': { sector: 'Engineering', name: 'Bangladesh Lamps Ltd.' },
  'BDTHAI': { sector: 'Engineering', name: 'BD Thai Aluminum Ltd.' },
  'BENGALWTL': { sector: 'Engineering', name: 'Bengal Windsor Thermoplastics Ltd.' },
  'GOLDENSON': { sector: 'Engineering', name: 'Golden Son Ltd.' },
  'MONNOAGML': { sector: 'Engineering', name: 'Monno Agro & General Machinery' },
  'QUASEMIND': { sector: 'Engineering', name: 'Quasem Industries Ltd.' },
  'RANFOUNDRY': { sector: 'Engineering', name: 'Rangpur Foundry Ltd.' },
  'SSSTEEL': { sector: 'Engineering', name: 'S.S. Steel Ltd.' },
  'COPPERTECH': { sector: 'Engineering', name: 'Coppertech Industries Ltd.' },
  'WMSHIPYARD': { sector: 'Engineering', name: 'Western Marine Shipyard Ltd.' },
  'RSRMSTEEL': { sector: 'Engineering', name: 'Ratanpur Steel Re-Rolling Mills' },
  'RSRM': { sector: 'Engineering', name: 'Ratanpur Steel Re-Rolling Mills' },
  'S.ALAMCRST': { sector: 'Engineering', name: 'S. Alam Cold Rolled Steels Ltd.' },
  'SALAMCRST': { sector: 'Engineering', name: 'S. Alam Cold Rolled Steels Ltd.' },
  'DESHBANDHU': { sector: 'Engineering', name: 'Deshbandhu Polymer Ltd.' },
  'DESHBANDHUP': { sector: 'Engineering', name: 'Deshbandhu Polymer Ltd.' },
  'EASTERNCBL': { sector: 'Engineering', name: 'Eastern Cables Ltd.' },
  'ECABLES': { sector: 'Engineering', name: 'Eastern Cables Ltd.' },
  'CENTRALENG': { sector: 'Engineering', name: 'Central Engineering Ltd.' },
  'OIMEX': { sector: 'Engineering', name: 'Oimex Electrode Ltd.' },
  'OIMEXELECT': { sector: 'Engineering', name: 'Oimex Electrode Ltd.' },

  // ==========================================
  // --- 10. CEMENT (7) ---
  // ==========================================
  'LHBL': { sector: 'Cement', name: 'LafargeHolcim Bangladesh Ltd.' },
  'LAFARGE': { sector: 'Cement', name: 'LafargeHolcim Bangladesh Ltd.' },
  'HEIDELBCEM': { sector: 'Cement', name: 'Heidelberg Cement Bangladesh Ltd.' },
  'CROWNCEMNT': { sector: 'Cement', name: 'Crown Cement PLC' },
  'PREMIERCEM': { sector: 'Cement', name: 'Premier Cement Mills PLC' },
  'CONFIDCEM': { sector: 'Cement', name: 'Confidence Cement PLC' },
  'ARAMITCEM': { sector: 'Cement', name: 'Aramit Cement Ltd.' },
  'MEGHNACEM': { sector: 'Cement', name: 'Meghna Cement Mills Ltd.' },

  // ==========================================
  // --- 11. TEXTILE (58 Listed Equities) ---
  // ==========================================
  'AIL': { sector: 'Textile', name: 'Alif Industries Ltd.' },
  'ALIFIND': { sector: 'Textile', name: 'Alif Industries Ltd.' },
  'OLYMPICAC': { sector: 'Textile', name: 'Olympic Accessories Ltd.' },
  'OAL': { sector: 'Textile', name: 'Olympic Accessories Ltd.' },
  'ENVOYTEX': { sector: 'Textile', name: 'Envoy Textiles Ltd.' },
  'SQUARETEXT': { sector: 'Textile', name: 'Square Textiles Ltd.' },
  'MALEKSPIN': { sector: 'Textile', name: 'Malek Spinning Mills Ltd.' },
  'SHEPHERD': { sector: 'Textile', name: 'Shepherd Industries Ltd.' },
  'MAKSONSPIN': { sector: 'Textile', name: 'Maksons Spinning Mills Ltd.' },
  'QUEENSOU': { sector: 'Textile', name: 'Queen South Textile Mills Ltd.' },
  'QUEENSOUTH': { sector: 'Textile', name: 'Queen South Textile Mills PLC' },
  'ARGONDENIM': { sector: 'Textile', name: 'Argon Denims Ltd.' },
  'TOSRIFA': { sector: 'Textile', name: 'Tosrifa Industries Ltd.' },
  'SIMTEX': { sector: 'Textile', name: 'Simtex Industries Ltd.' },
  'PARAMOUNT': { sector: 'Textile', name: 'Paramount Textile PLC' },
  'PTL': { sector: 'Textile', name: 'Paramount Textile PLC' },
  'AL-HAJTEX': { sector: 'Textile', name: 'Al-Haj Textile Mills Ltd.' },
  'ALHAJTEX': { sector: 'Textile', name: 'Al-Haj Textile Mills Ltd.' },
  'AL-HAJ': { sector: 'Textile', name: 'Al-Haj Textile Mills Ltd.' },
  'ALLTEX': { sector: 'Textile', name: 'Alltex Industries Ltd.' },
  'APEXTEX': { sector: 'Textile', name: 'Apex Spinning & Knitting Mills' },
  'APEXSPINN': { sector: 'Textile', name: 'Apex Spinning & Knitting Mills' },
  'DSHGARME': { sector: 'Textile', name: 'Desh Garments Ltd.' },
  'GENEREX': { sector: 'Textile', name: 'Generation Next Fashions Ltd.' },
  'HWAWELL': { sector: 'Textile', name: 'Hwa Well Textiles (BD) Ltd.' },
  'KDSALTD': { sector: 'Textile', name: 'KDS Accessories Ltd.' },
  'MATINSPINN': { sector: 'Textile', name: 'Matin Spinning Mills Ltd.' },
  'NEWLINE': { sector: 'Textile', name: 'New Line Clothings Ltd.' },
  'NURANI': { sector: 'Textile', name: 'Nurani Dyeing & Agro Ltd.' },
  'PACIFIC': { sector: 'Textile', name: 'Pacific Denims Ltd.' },
  'SAFKOSPINN': { sector: 'Textile', name: 'Safko Spinning Mills Ltd.' },
  'SHASHATEX': { sector: 'Textile', name: 'Shasha Denims Ltd.' },
  'ZAHEENTEX': { sector: 'Textile', name: 'Zaheen Spinning Ltd.' },
  'ZAHINSPIN': { sector: 'Textile', name: 'Zahintex Industries Ltd.' },
  'VFSTDL': { sector: 'Textile', name: 'VFS Thread Dyeing Ltd.' },
  'TALLUSPIN': { sector: 'Textile', name: 'Tallu Spinning Mills Ltd.' },
  'RNSPIN': { sector: 'Textile', name: 'R.N. Spinning Mills Ltd.' },
  'RAHIMTEXT': { sector: 'Textile', name: 'Rahim Textile Mills Ltd.' },
  'PRIMETEX': { sector: 'Textile', name: 'Prime Textile Spinning Mills' },
  'METROSPIN': { sector: 'Textile', name: 'Metro Spinning Ltd.' },
  'HRTEX': { sector: 'Textile', name: 'H.R. Textile Ltd.' },
  'HAMIDFABR': { sector: 'Textile', name: 'Hamid Fabrics Ltd.' },
  'ESQUIRE': { sector: 'Textile', name: 'Esquire Knit Composite PLC' },
  'SAIHAMCOT': { sector: 'Textile', name: 'Saiham Cotton Mills Ltd.' },
  'SAIHAMTEX': { sector: 'Textile', name: 'Saiham Textile Mills Ltd.' },
  'SKTRIMS': { sector: 'Textile', name: 'SK Trims & Industries Ltd.' },
  'RINGSHINE': { sector: 'Textile', name: 'Ring Shine Textiles Ltd.' },
  'TAMIJTEX': { sector: 'Textile', name: 'Tamijuddin Textile Mills PLC' },
  'MITHUNKNIT': { sector: 'Textile', name: 'Mithun Knitting and Dyeing Ltd.' },
  'SONARGAON': { sector: 'Textile', name: 'Sonargaon Textiles Ltd.' },
  'DULAMIACOT': { sector: 'Textile', name: 'Dulamia Cotton Spinning Mills' },
  'EVINCE': { sector: 'Textile', name: 'Evince Textiles Ltd.' },
  'EVINCETEX': { sector: 'Textile', name: 'Evince Textiles Ltd.' },
  'DELTASPINN': { sector: 'Textile', name: 'Delta Spinners Ltd.' },
  'FAMILYTEX': { sector: 'Textile', name: 'Familytex (BD) Ltd.' },
  'ANLIMAYARN': { sector: 'Textile', name: 'Anlima Yarn Dyeing Ltd.' },
  'CNATEX': { sector: 'Textile', name: 'C&A Textiles Ltd.' },
  'C&ATEXTILES': { sector: 'Textile', name: 'C&A Textiles Ltd.' },
  'C&A': { sector: 'Textile', name: 'C&A Textiles Ltd.' },
  'TUNGHAI': { sector: 'Textile', name: 'Tunghai Knitting & Dyeing Ltd.' },
  'REGENTTEX': { sector: 'Textile', name: 'Regent Textile Mills Ltd.' },
  'SHURWID': { sector: 'Textile', name: 'Shurwid Industries Ltd.' },
  'SUHRID': { sector: 'Textile', name: 'Suhrid Industries Ltd.' },
  'DSSL': { sector: 'Textile', name: 'Dragon Sweater and Spinning Ltd.' },
  'DRS': { sector: 'Textile', name: 'Dragon Sweater and Spinning Ltd.' },
  'ALIF': { sector: 'Textile', name: 'Alif Manufacturing Company Ltd.' },

  // ==========================================
  // --- 12. INFORMATION TECHNOLOGY (11) ---
  // ==========================================
  'ITC': { sector: 'Information Technology', name: 'Information Technology Consultants PLC (Q-Cash)' },
  'AOL': { sector: 'Information Technology', name: 'aamra networks Ltd.' },
  'AAMRANET': { sector: 'Information Technology', name: 'aamra networks Ltd.' },
  'AAMRATECH': { sector: 'Information Technology', name: 'aamra technologies Ltd.' },
  'GENEXINFOS': { sector: 'Information Technology', name: 'Genex Infosys Ltd.' },
  'EGEN': { sector: 'Information Technology', name: 'eGeneration Ltd.' },
  'AGNI': { sector: 'Information Technology', name: 'Agni Systems Ltd.' },
  'AGNYSYSL': { sector: 'Information Technology', name: 'Agni Systems Ltd.' },
  'DAFODILCOM': { sector: 'Information Technology', name: 'Daffodil Computers Ltd.' },
  'INTECH': { sector: 'Information Technology', name: 'Intech Ltd.' },
  'BDCOM': { sector: 'Information Technology', name: 'BDCOM Online Ltd.' },
  'ISNLTD': { sector: 'Information Technology', name: 'Information Services Network' },
  'ADNTEL': { sector: 'Information Technology', name: 'ADN Telecom Ltd.' },

  // ==========================================
  // --- 13. CERAMICS (5) ---
  // ==========================================
  'MONNOCERA': { sector: 'Ceramics', name: 'Monno Ceramic Industries Ltd.' },
  'SHINEPUKUR': { sector: 'Ceramics', name: 'Shinepukur Ceramics Ltd.' },
  'RAKCERAMIC': { sector: 'Ceramics', name: 'RAK Ceramics (Bangladesh) Ltd.' },
  'FUWANGCER': { sector: 'Ceramics', name: 'Fu-Wang Ceramic Industries Ltd.' },
  'STANDARDCER': { sector: 'Ceramics', name: 'Standard Ceramic Industries Ltd.' },

  // ==========================================
  // --- 14. MUTUAL FUNDS (37 Listed Closed-End Funds) ---
  // ==========================================
  '1STICBAMCL': { sector: 'Mutual Funds', name: 'ICB AMCL First Mutual Fund' },
  '2NDICBAMCL': { sector: 'Mutual Funds', name: 'ICB AMCL Second Mutual Fund' },
  'AIBL1STIMF': { sector: 'Mutual Funds', name: 'AIBL 1st Islamic Mutual Fund' },
  'ATCSLGF': { sector: 'Mutual Funds', name: 'Asian Tiger Capital Shariah Fund' },
  'CAPMOB1UMF': { sector: 'Mutual Funds', name: 'CAPM IBBL Islamic Mutual Fund' },
  'CAPMBDBLMF': { sector: 'Mutual Funds', name: 'CAPM BDBL Mutual Fund 01' },
  'DBH1STMF': { sector: 'Mutual Funds', name: 'DBH First Mutual Fund' },
  'EBL1STMF': { sector: 'Mutual Funds', name: 'EBL First Mutual Fund' },
  'EBLNRBMF': { sector: 'Mutual Funds', name: 'EBL NRB Mutual Fund' },
  'EXIM1STMF': { sector: 'Mutual Funds', name: 'EXIM Bank 1st Mutual Fund' },
  'FBFIF': { sector: 'Mutual Funds', name: 'First Bangladesh Fixed Income Fund' },
  'FIRSTICB': { sector: 'Mutual Funds', name: 'First ICB Mutual Fund' },
  'GRAMEENS2': { sector: 'Mutual Funds', name: 'Grameen One : Scheme Two' },
  'GREENDELMF': { sector: 'Mutual Funds', name: 'Green Delta Mutual Fund' },
  'HPBLFMF': { sector: 'Mutual Funds', name: 'HPBL First Mutual Fund' },
  'ICB1STNRB': { sector: 'Mutual Funds', name: 'ICB AMCL 1st NRB Mutual Fund' },
  'ICB2NDNRB': { sector: 'Mutual Funds', name: 'ICB AMCL 2nd NRB Mutual Fund' },
  'ICB3RDNRB': { sector: 'Mutual Funds', name: 'ICB AMCL 3rd NRB Mutual Fund' },
  'ICBAMCL2ND': { sector: 'Mutual Funds', name: 'ICB AMCL 2nd Mutual Fund' },
  'ICBAGRANI1': { sector: 'Mutual Funds', name: 'ICB AMCL Agrani Bank 1st Mutual Fund' },
  'ICBEPMF1S1': { sector: 'Mutual Funds', name: 'ICB AMCL Converted First Unit Fund' },
  'ICBSONALI1': { sector: 'Mutual Funds', name: 'ICB AMCL Sonali Bank 1st Mutual Fund' },
  'IFILISLMF1': { sector: 'Mutual Funds', name: 'IFIL Islamic Mutual Fund-1' },
  'IFIC1STMF': { sector: 'Mutual Funds', name: 'IFIC Bank 1st Mutual Fund' },
  'LRGLOB1MF': { sector: 'Mutual Funds', name: 'LR Global Bangladesh Mutual Fund One' },
  'MBL1STMF': { sector: 'Mutual Funds', name: 'MBL 1st Mutual Fund' },
  'NCCBLMF1': { sector: 'Mutual Funds', name: 'NCCBL Mutual Fund-1' },
  'NLI1STMF': { sector: 'Mutual Funds', name: 'NLI First Mutual Fund' },
  'PF1STMF': { sector: 'Mutual Funds', name: 'Prime Finance First Mutual Fund' },
  'PHPMF1': { sector: 'Mutual Funds', name: 'PHP First Mutual Fund' },
  'POPULAR1MF': { sector: 'Mutual Funds', name: 'Popular Life First Mutual Fund' },
  'PRIME1ICBA': { sector: 'Mutual Funds', name: 'Prime Bank 1st ICB AMCL Mutual Fund' },
  'PRIMEPREMF': { sector: 'Mutual Funds', name: 'Prime Finance Second Mutual Fund' },
  'RELIANCE1': { sector: 'Mutual Funds', name: 'Reliance One Mutual Fund' },
  'SEBL1STMF': { sector: 'Mutual Funds', name: 'Southeast Bank 1st Mutual Fund' },
  'SEMLFBSLGF': { sector: 'Mutual Funds', name: 'SEML FBLSL Growth Fund' },
  'SEMLIBBLSF': { sector: 'Mutual Funds', name: 'SEML IBBL Shariah Fund' },
  'SEMLLECMF': { sector: 'Mutual Funds', name: 'SEML Lecture Equity Management Fund' },
  'TRUSTB1MF': { sector: 'Mutual Funds', name: 'Trust Bank 1st Mutual Fund' },
  'VAMLBDMF1': { sector: 'Mutual Funds', name: 'Vanguard AML BD Finance Mutual Fund One' },
  'VAMLRBBF': { sector: 'Mutual Funds', name: 'Vanguard AML Rupali Bank Balanced Fund' },

  // ==========================================
  // --- 15. SERVICES & REAL ESTATE (4) ---
  // ==========================================
  'SAIFPOWER': { sector: 'Services & Real Estate', name: 'Saif Powertec Ltd.' },
  'SAIFPOWR': { sector: 'Services & Real Estate', name: 'Saif Powertec Ltd.' },
  'EASTERNHSG': { sector: 'Services & Real Estate', name: 'Eastern Housing Ltd.' },
  'SAMORITA': { sector: 'Services & Real Estate', name: 'Samorita Hospital Ltd.' },
  'MIRAKHTER': { sector: 'Services & Real Estate', name: 'Mir Akhter Hossain Ltd.' },

  // ==========================================
  // --- 16. TANNERY INDUSTRIES (7) ---
  // ==========================================
  'BATASHOE': { sector: 'Tannery Industries', name: 'Bata Shoe Company (BD) Ltd.' },
  'APEXFOOT': { sector: 'Tannery Industries', name: 'Apex Footwear Ltd.' },
  'APEXTANRY': { sector: 'Tannery Industries', name: 'Apex Tannery Ltd.' },
  'SAMATALETH': { sector: 'Tannery Industries', name: 'Samata Leather Complex Ltd.' },
  'FORTUNE': { sector: 'Tannery Industries', name: 'Fortune Shoes Ltd.' },
  'LEGACYFOOT': { sector: 'Tannery Industries', name: 'Legacy Footwear Ltd.' },

  // ==========================================
  // --- 17. TRAVEL & LEISURE (4) ---
  // ==========================================
  'SEAPEARL': { sector: 'Travel & Leisure', name: 'Sea Pearl Beach Resort & Spa' },
  'UNIQUEHRL': { sector: 'Travel & Leisure', name: 'Unique Hotel & Resorts PLC' },
  'PENINSULA': { sector: 'Travel & Leisure', name: 'The Peninsula Chittagong Ltd.' },
  'BESTHLDNG': { sector: 'Travel & Leisure', name: 'Best Holdings Ltd.' },

  // ==========================================
  // --- 18. JUTE (3) ---
  // ==========================================
  'SONALIANSH': { sector: 'Jute', name: 'Sonali Aansh Industries Ltd.' },
  'NORTHERN': { sector: 'Jute', name: 'Northern Jute Manufacturing Co.' },
  'JUTESPINN': { sector: 'Jute', name: 'Jute Spinners Ltd.' },

  // ==========================================
  // --- 19. PAPER & PRINTING (6) ---
  // ==========================================
  'BPML': { sector: 'Paper & Printing', name: 'Bashundhara Paper Mills Ltd.' },
  'HAKKANIPUL': { sector: 'Paper & Printing', name: 'Hakkani Pulp & Paper Mills Ltd.' },
  'MONOSPOOL': { sector: 'Paper & Printing', name: 'Bangladesh Monospool Paper Mfg.' },
  'PAPERPROC': { sector: 'Paper & Printing', name: 'Paper Processing & Packaging' },
  'SONALIPAPR': { sector: 'Paper & Printing', name: 'Sonali Paper & Board Mills Ltd.' },
  'SONALIPAP': { sector: 'Paper & Printing', name: 'Sonali Paper & Board Mills Ltd.' },
  'MAGNUPAPER': { sector: 'Paper & Printing', name: 'Magnum Paper Mills Ltd.' },

  // ==========================================
  // --- 20. MISCELLANEOUS (Strictly Only the 11 Official DSE Miscellaneous Equities) ---
  // ==========================================
  'BEXIMCO': { sector: 'Miscellaneous', name: 'Bangladesh Export Import Co. (BEXIMCO)' },
  'BERGERPBL': { sector: 'Miscellaneous', name: 'Berger Paints Bangladesh Ltd.' },
  'BSC': { sector: 'Miscellaneous', name: 'Bangladesh Shipping Corporation' },
  'GQBALLPEN': { sector: 'Miscellaneous', name: 'GQ Ball Pen Industries Ltd.' },
  'ARAMIT': { sector: 'Miscellaneous', name: 'Aramit Ltd.' },
  'SINOBANGLA': { sector: 'Miscellaneous', name: 'Sinobangla Industries Ltd.' },
  'MIRACLEIND': { sector: 'Miscellaneous', name: 'Miracle Industries Ltd.' },
  'SAVAREFR': { sector: 'Miscellaneous', name: 'Savar Refractories Ltd.' },
  'USMANIAGL': { sector: 'Miscellaneous', name: 'Usmania Glass Sheet Factory Ltd.' },
  'BEXSYNTH': { sector: 'Miscellaneous', name: 'Beximco Synthetics Ltd.' },
  'ECOFIL': { sector: 'Miscellaneous', name: 'Eco Friendly Filaments Ltd.' },

  // ==========================================
  // --- 21. CORPORATE BONDS & DEBENTURES ---
  // ==========================================
  'APSCLBOND': { sector: 'Corporate Bond', name: 'Ashuganj Power Station Co. Bond' },
  'IBBLPBOND': { sector: 'Corporate Bond', name: 'IBBL Mudaraba Perpetual Bond' },
  'SJIBLPBOND': { sector: 'Corporate Bond', name: 'SJIBL Mudaraba Perpetual Bond' },
  'GPSTAR': { sector: 'Corporate Bond', name: 'GP Star Bond' },

  // ==========================================
  // --- 22. DSE SME GROWTH PLATFORM (ALL SME BOARD SECURITIES) ---
  // ==========================================
  'ACHIASEA': { sector: 'SME Platform', name: 'Achia Sea Foods Ltd. (SME)' },
  'ACHIATOSF': { sector: 'SME Platform', name: 'Achia Sea Foods Ltd. (SME)' },
  'AGROORGANIC': { sector: 'SME Platform', name: 'Agro Organica PLC (SME)' },
  'AL-FAROOQ': { sector: 'SME Platform', name: 'Al-Farooq Mannan Textile Mills Ltd. (SME)' },
  'ALFAROOQ': { sector: 'SME Platform', name: 'Al-Farooq Mannan Textile Mills Ltd. (SME)' },
  'APEXWEAV': { sector: 'SME Platform', name: 'Apex Weaving & Finishing Mills Ltd. (SME)' },
  'WEAVING': { sector: 'SME Platform', name: 'Apex Weaving & Finishing Mills Ltd. (SME)' },
  'ARMACERAM': { sector: 'SME Platform', name: 'Ar Man Ceramic Industries Ltd. (SME)' },
  'ASIANAGRO': { sector: 'SME Platform', name: 'Asian Agro Products Ltd. (SME)' },
  'BDPAINT': { sector: 'SME Platform', name: 'Bangladesh Paints Ltd. (SME)' },
  'BENGALBISC': { sector: 'SME Platform', name: 'Bengal Biscuits Ltd. (SME)' },
  'BENGALPOLY': { sector: 'SME Platform', name: 'Bengal Poly & Paper Sack Ltd. (SME)' },
  'CREATIVE': { sector: 'SME Platform', name: 'Creative Paper Mills Ltd. (SME)' },
  'HIMACHAL': { sector: 'SME Platform', name: 'Himachal Products Ltd. (SME)' },
  'KBSHIKDER': { sector: 'SME Platform', name: 'K&B Sikder Enterprise (SME)' },
  'KRISHIBID': { sector: 'SME Platform', name: 'Krishibid Feed Ltd. (SME)' },
  'KRISHISEED': { sector: 'SME Platform', name: 'Krishibid Seed Ltd. (SME)' },
  'MAMUNAGRO': { sector: 'SME Platform', name: 'Mamun Agro Products Ltd. (SME)' },
  'MASTERFEED': { sector: 'SME Platform', name: 'Master Feed Agrotec Ltd. (SME)' },
  'MODERNDYE': { sector: 'SME Platform', name: 'Modern Dyeing & Screen Printing Ltd. (SME)' },
  'MOSTFAMETA': { sector: 'SME Platform', name: 'Mostafa Metal Industries Ltd. (SME)' },
  'MOSTAFA': { sector: 'SME Platform', name: 'Mostafa Metal Industries Ltd. (SME)' },
  'NIALCO': { sector: 'SME Platform', name: 'Nialco Alloys Ltd. (SME)' },
  'ORYXPEST': { sector: 'SME Platform', name: 'Oryx Pesticides Ltd. (SME)' },
  'ORYXBIO': { sector: 'SME Platform', name: 'Oryx Bio-Tech Ltd. (SME)' },
  'PACKAGES': { sector: 'SME Platform', name: 'Paper Packages Ltd. (SME)' },
  'QSMEX': { sector: 'SME Platform', name: 'QSM Exim Ltd. (SME)' },
  'SUBVAL': { sector: 'SME Platform', name: 'Sub Valley Agro Industries Ltd. (SME)' },
  'STARADHE': { sector: 'SME Platform', name: 'Star Adhesives Ltd. (SME)' },
  'WONDERTOYS': { sector: 'SME Platform', name: 'Wonder Toys Ltd. (SME)' },
  'YUSUF': { sector: 'SME Platform', name: 'Yusuf Flour Mills Ltd. (SME)' },
  'YOUSUF': { sector: 'SME Platform', name: 'Yusuf Flour Mills Ltd. (SME)' },
  'SUPERSTA': { sector: 'SME Platform', name: 'Super Star Ltd. (SME)' },
  'SUPERSTAR': { sector: 'SME Platform', name: 'Super Star Ltd. (SME)' },
  'MEDIRX': { sector: 'SME Platform', name: 'Medirx Life Science (SME)' },
  'CAPITECGB': { sector: 'SME Platform', name: 'Capitec Grameen Bank Growth Fund (SME)' },
  'MKFOOTWEAR': { sector: 'SME Platform', name: 'MK Footwear PLC (SME)' },

  // ==========================================
  // --- 23. ADDITIONAL LISTED & HISTORICAL / OTC / ATB SECURITIES ---
  // ==========================================
  'DISSEMINAT': { sector: 'Benchmark', name: 'DSE Broadcast Feed (Dissemination)' },
  'DISSEMINATION': { sector: 'Benchmark', name: 'DSE Broadcast Feed (Dissemination)' },
  'KBPPWBIL': { sector: 'Engineering', name: 'Khan Brothers PP Woven Bag Industries' },
  'HEBRON': { sector: 'Textile', name: 'Hebron Chemical & Textile Ltd.' },
};

/**
 * Normalized key lookup table (symbols stripped of all punctuation)
 * e.g., 'SALAMCRST' finds 'S.ALAMCRST', 'KAYANDQUE' finds 'KAY&QUE'
 */
const NORMALIZED_SECTOR_LOOKUP: Record<string, { sector: string; name: string }> = {};
Object.entries(DSE_COMPANY_SECTOR_MAP).forEach(([key, val]) => {
  const clean = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
  NORMALIZED_SECTOR_LOOKUP[clean] = val;
});

/**
 * Official whitelist of Dhaka Stock Exchange (DSE) SME Platform (Growth Board) securities.
 * SME scrips operate under Qualified Investor (QI) rules with minimum portfolio value criteria.
 */
export const DSE_SME_SYMBOLS = new Set<string>([
  'ACHIASEA',
  'ACHIATOSF',
  'AGROORGANIC',
  'AL-FAROOQ',
  'ALFAROOQ',
  'APEXWEAV',
  'WEAVING',
  'ARMACERAM',
  'ASIANAGRO',
  'BDPAINT',
  'BENGALBISC',
  'BENGALPOLY',
  'CREATIVE',
  'HIMACHAL',
  'KBSHIKDER',
  'KRISHIBID',
  'KRISHISEED',
  'MAMUNAGRO',
  'MASTERFEED',
  'MODERNDYE',
  'MOSTFAMETA',
  'MOSTAFA',
  'NIALCO',
  'ORYXPEST',
  'ORYXBIO',
  'PACKAGES',
  'QSMEX',
  'SUBVAL',
  'STARADHE',
  'WONDERTOYS',
  'YUSUF',
  'YOUSUF',
  'SUPERSTA',
  'SUPERSTAR',
  'MEDIRX',
  'CAPITECGB',
  'MKFOOTWEAR',
]);

/**
 * Checks if a ticker belongs to the DSE SME Growth Board
 */
export function isSmeSymbol(symbol: string): boolean {
  if (!symbol) return false;
  const raw = symbol.toUpperCase().trim();
  const clean = raw.replace(/[^A-Z0-9]/g, '');
  return DSE_SME_SYMBOLS.has(raw) || DSE_SME_SYMBOLS.has(clean);
}

/**
 * Official whitelist of Dhaka Stock Exchange (DSE) listed companies in the Miscellaneous sector.
 * Only these 11 companies are officially categorized as Miscellaneous by DSE.
 * No other scrips should ever be classified into Miscellaneous.
 */
export const OFFICIAL_DSE_MISC_SYMBOLS = new Set<string>([
  'BEXIMCO',
  'BERGERPBL',
  'BSC',
  'GQBALLPEN',
  'ARAMIT',
  'SINOBANGLA',
  'MIRACLEIND',
  'SAVAREFR',
  'USMANIAGL',
  'BEXSYNTH',
  'ECOFIL',
]);

/**
 * Resolves a company stock ticker to its official DSE sector and corporate title.
 * Under official DSE categorization, 'Miscellaneous' is strictly reserved for the 11
 * official DSE Miscellaneous companies.
 * Unrecognized stocks fall back to 'Unclassified Equities' instead of 'General Market'.
 */
export function resolveCompanySector(symbol: string, companyName?: string): { sector: string; name: string } {
  if (!symbol) return { sector: 'SME Platform', name: 'DSE Stock Quotation' };
  const rawUpper = symbol.toUpperCase().trim();
  const upper = rawUpper.replace(/[^A-Z0-9_\-\.]/g, '');
  const alphanumeric = upper.replace(/[^A-Z0-9]/g, '');

  // 0. User Custom Override (highest priority)
  const overrides = getCustomSectorOverrides();
  if (overrides[rawUpper] || overrides[upper] || overrides[alphanumeric]) {
    const customSector = overrides[rawUpper] || overrides[upper] || overrides[alphanumeric];
    return {
      sector: customSector,
      name: companyName && companyName !== symbol ? companyName : `${upper} (${customSector})`,
    };
  }

  // 1. Explicit check for Benchmark indices (DSEX, DS30, CDSET, etc.)
  if (isBenchmarkSymbol(upper) || isBenchmarkSymbol(rawUpper)) {
    return { sector: 'Benchmark', name: KNOWN_SECTOR_MAP[upper]?.name || `${upper} Broad Market Index` };
  }

  // 2. Explicit check for AmiBroker sector index symbols (01_BANK, etc.)
  if (isSectorIndexSymbol(upper) || isSectorIndexSymbol(rawUpper)) {
    return resolveSectorIndexInfo(upper);
  }

  // 3. Direct match with master DSE stock dictionary
  if (DSE_COMPANY_SECTOR_MAP[upper]) {
    return DSE_COMPANY_SECTOR_MAP[upper];
  }

  // 3.1 Normalized alphanumeric match (ignores dots, dashes, ampersands, e.g. 'S.ALAMCRST' vs 'SALAMCRST')
  if (NORMALIZED_SECTOR_LOOKUP[alphanumeric]) {
    return NORMALIZED_SECTOR_LOOKUP[alphanumeric];
  }

  // 4. Strict Whitelist Check for Miscellaneous sector
  if (OFFICIAL_DSE_MISC_SYMBOLS.has(upper) || OFFICIAL_DSE_MISC_SYMBOLS.has(alphanumeric)) {
    return { sector: 'Miscellaneous', name: `${upper} Ltd.` };
  }

  // 5. Mutual Fund Pattern Matching (Catch any unmapped DSE closed-end or open-end fund tickers)
  if (
    /MF$|FMF$|1MF$|FUND/i.test(upper) ||
    /^(?:ICB|1STICB|2NDICB|FBFIF|ATCSLGF|GRAMEENS|RELIANCE1|CAPM|SEML|VAML|LRGLOB)/i.test(upper) ||
    /AMCL|NRBMF|ISLMF|SLGF|RBBF/i.test(upper) ||
    (companyName && /MUTUAL FUND|UNIT FUND/i.test(companyName))
  ) {
    return { sector: 'Mutual Funds', name: companyName || `${upper} Mutual Fund` };
  }

  // 6. Corporate Bond Pattern Matching
  if (/BOND|DEBENTURE|SUKUK|PERPETUAL/i.test(upper) || (companyName && /BOND|SUKUK/i.test(companyName))) {
    return { sector: 'Corporate Bond', name: companyName || `${upper} Corporate Bond` };
  }

  // Combined text for heuristic parsing (symbol + company title if provided)
  const searchText = `${upper} ${companyName || ''}`.toUpperCase();

  // 7. Bank Pattern Matching
  if (/BANK|BNK|ISLAMI BANK/i.test(searchText)) {
    return { sector: 'Bank', name: companyName || `${upper} Banking PLC` };
  }

  // 8. Textile Pattern Matching (Include yarns, fabrics, cotton, knitwear, trims)
  if (/TEX|TEXT|SPIN|YARN|COTTON|DENIM|FABRIC|KNIT|SWEATER|DYEING|TRIMS|GARMENT|FASHION|CLOTH/i.test(searchText)) {
    return { sector: 'Textile', name: companyName || `${upper} Textile & Apparel` };
  }

  // 9. Engineering Pattern Matching (Include steels, cables, auto, shipyard, foundry, electrodes)
  if (/ENG|STEEL|PIPE|AUTO|CABLE|METAL|MOTOR|ISPAT|SHIPYARD|FOUNDRY|ELECTRODE|POLYMER|GALV|MACHIN|CBL/i.test(searchText)) {
    return { sector: 'Engineering', name: companyName || `${upper} Engineering Ltd.` };
  }

  // 10. Pharmaceuticals & Chemicals
  if (/PHARM|PHAR|CHEM|DRUG|LAB|HEALTH|MEDIC|INFU|BIOTECH|PEST/i.test(searchText)) {
    return { sector: 'Pharmaceuticals & Chemicals', name: companyName || `${upper} Pharma & Chemicals` };
  }

  // 11. Life & General Insurance
  if (/LIFE/i.test(searchText)) {
    return { sector: 'Life Insurance', name: companyName || `${upper} Life Insurance Ltd.` };
  }
  if (/INS|INSUR|GENINS|GENERAL INSURANCE/i.test(searchText)) {
    return { sector: 'General Insurance', name: companyName || `${upper} General Insurance Ltd.` };
  }

  // 12. Fuel & Power (includes industrial gas & oxygen)
  if (/POWER|PWR|GAS|OIL|ENERGY|PETRO|LUB|OXY/i.test(searchText)) {
    return { sector: 'Fuel & Power', name: companyName || `${upper} Power & Energy PLC` };
  }

  // 13. Food & Allied
  if (/FOOD|BEV|SUGAR|TEA|AGRO|HATCH|FEED|SEAFOOD|DAIRY/i.test(searchText)) {
    return { sector: 'Food & Allied', name: companyName || `${upper} Food & Allied Ltd.` };
  }

  // 14. Cement
  if (/CEM|CEMENT/i.test(searchText)) {
    return { sector: 'Cement', name: companyName || `${upper} Cement Mills` };
  }

  // 15. Financial Institutions (NBFI)
  if (/FIN|LEAS|CAPITAL|INVEST|ASSET|FINANCE/i.test(searchText)) {
    return { sector: 'Financial Institutions', name: companyName || `${upper} Finance & Investment` };
  }

  // 16. Information Technology
  if (/NET|TECH|INFO|SOFT|TEL|DATA|COMM/i.test(searchText)) {
    return { sector: 'Information Technology', name: companyName || `${upper} Technology Ltd.` };
  }

  // 17. Ceramics
  if (/CERA|CERAMIC/i.test(searchText)) {
    return { sector: 'Ceramics', name: companyName || `${upper} Ceramics Ltd.` };
  }

  // 18. Travel & Leisure
  if (/HOTEL|RESORT|TOUR|TRAVEL|HLD/i.test(searchText)) {
    return { sector: 'Travel & Leisure', name: companyName || `${upper} Resort & Leisure` };
  }

  // 19. Tannery Industries
  if (/LEATH|SHOE|FOOT|TAN/i.test(searchText)) {
    return { sector: 'Tannery Industries', name: companyName || `${upper} Footwear & Leather` };
  }

  // 20. Paper & Printing
  if (/PAPER|PRINT|PULP/i.test(searchText)) {
    return { sector: 'Paper & Printing', name: companyName || `${upper} Paper & Printing` };
  }

  // 21. Jute
  if (/JUTE/i.test(searchText)) {
    return { sector: 'Jute', name: companyName || `${upper} Jute Industries` };
  }

  // 22. Services & Real Estate
  if (/HSG|ESTATE|CONSTR|HOUSING|AKHTER|HOSPITAL|POWERTEC/i.test(searchText)) {
    return { sector: 'Services & Real Estate', name: companyName || `${upper} Real Estate & Services` };
  }

  // 23. Default fallback: SME Platform (Unclassified equities on DSE are from the SME Growth Board)
  return { sector: 'SME Platform', name: companyName && companyName !== symbol ? companyName : `${upper} (SME Platform)` };
}
