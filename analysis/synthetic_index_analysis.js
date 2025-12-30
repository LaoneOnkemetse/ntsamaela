const fs = require('fs');
const path = require('path');

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',').map(s => s.trim());
  const idx = {
    DateTime: header.indexOf('DateTime'),
    Open: header.indexOf('Open'),
    High: header.indexOf('High'),
    Low: header.indexOf('Low'),
    Close: header.indexOf('Close'),
    Volume: header.indexOf('Volume'),
  };
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 6) continue;
    const ts = parts[idx.DateTime].trim();
    const dt = parseMetaTraderDate(ts);
    if (!dt) continue;
    rows.push({
      timestamp: dt.getTime(),
      iso: dt.toISOString(),
      open: Number(parts[idx.Open]),
      high: Number(parts[idx.High]),
      low: Number(parts[idx.Low]),
      close: Number(parts[idx.Close]),
      volume: Number(parts[idx.Volume]),
    });
  }
  // Sort ascending by time
  rows.sort((a, b) => a.timestamp - b.timestamp);
  return rows;
}

function parseMetaTraderDate(s) {
  // Format like: 2025.10.31 10:54
  const m = s.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [_, y, mo, d, h, mi] = m;
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), 0));
}

function addReturns(data) {
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const cur = data[i];
    cur.ret = (cur.close - prev.close) / prev.close;
    cur.logRet = Math.log(cur.close / prev.close);
    cur.gap = (cur.open - prev.close) / prev.close;
    cur.range = (cur.high - cur.low) / cur.open;
  }
  return data;
}

function stats(arr) {
  const n = arr.length;
  if (n === 0) return { n: 0 };
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const varNum = arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (n - 1 || 1);
  const std = Math.sqrt(varNum);
  const m3 = arr.reduce((a, b) => a + Math.pow(b - mean, 3), 0) / n;
  const m4 = arr.reduce((a, b) => a + Math.pow(b - mean, 4), 0) / n;
  const skew = std > 0 ? m3 / Math.pow(std, 3) : 0;
  const kurt = std > 0 ? m4 / Math.pow(std, 4) - 3 : 0;
  return { n, mean, std, skew, kurt };
}

function autocorr(arr, maxLag = 10) {
  const n = arr.length;
  const mu = arr.reduce((a, b) => a + b, 0) / n;
  const denom = arr.reduce((a, b) => a + (b - mu) * (b - mu), 0);
  const ac = [];
  for (let lag = 1; lag <= maxLag; lag++) {
    let num = 0;
    for (let t = lag; t < n; t++) {
      num += (arr[t] - mu) * (arr[t - lag] - mu);
    }
    ac.push(denom !== 0 ? num / denom : 0);
  }
  return ac;
}

function groupByHour(data) {
  const buckets = new Map();
  for (const d of data) {
    const hour = new Date(d.timestamp).getUTCHours();
    const list = buckets.get(hour) || [];
    list.push(d);
    buckets.set(hour, list);
  }
  return buckets;
}

function detectPatterns(data) {
  // Simple candlestick patterns and next-bar outcome
  const patterns = {
    bullishEngulfing: [],
    bearishEngulfing: [],
    pinBarBull: [],
    pinBarBear: [],
    insideBar: [],
  };
  for (let i = 1; i < data.length - 1; i++) {
    const a = data[i - 1];
    const b = data[i];
    const next = data[i + 1];
    const bodyA = Math.abs(a.close - a.open);
    const bodyB = Math.abs(b.close - b.open);
    const isBullA = a.close > a.open;
    const isBullB = b.close > b.open;
    const maxA = Math.max(a.open, a.close), minA = Math.min(a.open, a.close);
    const maxB = Math.max(b.open, b.close), minB = Math.min(b.open, b.close);

    // Engulfing
    if (!isBullA && isBullB && maxB >= maxA && minB <= minA && bodyB > bodyA * 0.8) {
      patterns.bullishEngulfing.push({ idx: i, retNext: next.ret });
    }
    if (isBullA && !isBullB && maxB >= maxA && minB <= minA && bodyB > bodyA * 0.8) {
      patterns.bearishEngulfing.push({ idx: i, retNext: next.ret });
    }

    // Pin bars: long wick vs body
    const upperWick = b.high - Math.max(b.open, b.close);
    const lowerWick = Math.min(b.open, b.close) - b.low;
    const body = bodyB;
    if (lowerWick > body * 2 && upperWick < body) {
      patterns.pinBarBull.push({ idx: i, retNext: next.ret });
    }
    if (upperWick > body * 2 && lowerWick < body) {
      patterns.pinBarBear.push({ idx: i, retNext: next.ret });
    }

    // Inside bar
    if (b.high <= a.high && b.low >= a.low) {
      patterns.insideBar.push({ idx: i, retNext: next.ret });
    }
  }
  return summarizePatternOutcomes(patterns);
}

function summarizePatternOutcomes(patterns) {
  const out = {};
  for (const [name, arr] of Object.entries(patterns)) {
    const n = arr.length;
    const wins = arr.filter(x => x.retNext > 0).length;
    const mean = n ? arr.reduce((a, b) => a + b.retNext, 0) / n : 0;
    out[name] = { count: n, winRate: n ? wins / n : 0, meanNextRet: mean };
  }
  return out;
}

function gapAnalysis(data, threshold = 0.002) { // 0.2%
  const gaps = data.filter(d => typeof d.gap === 'number');
  const big = gaps.filter(g => Math.abs(g.gap) >= threshold);
  const up = big.filter(g => g.gap > 0);
  const down = big.filter(g => g.gap < 0);
  const upFollow = up.map(g => g.ret).filter(v => !Number.isNaN(v));
  const downFollow = down.map(g => g.ret).filter(v => !Number.isNaN(v));
  return {
    total: gaps.length,
    bigCount: big.length,
    pctBig: gaps.length ? big.length / gaps.length : 0,
    upCount: up.length,
    downCount: down.length,
    upFollow: { count: upFollow.length, winRate: pctPos(upFollow), mean: mean(upFollow) },
    downFollow: { count: downFollow.length, winRate: pctPos(downFollow.map(x => -x)), mean: mean(downFollow) },
  };
}

function pctPos(arr) { return arr.length ? arr.filter(x => x > 0).length / arr.length : 0; }
function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

function backtestMeanReversion(data, lookback = 20, k = 2) {
  // Z-score of close vs rolling mean/stdev; fade extremes; exit next bar
  const closes = data.map(d => d.close);
  const trades = [];
  for (let i = lookback; i < data.length - 1; i++) {
    const window = closes.slice(i - lookback, i);
    const mu = mean(window);
    const sd = Math.sqrt(window.reduce((a, c) => a + (c - mu) * (c - mu), 0) / (lookback - 1));
    if (sd === 0) continue;
    const z = (closes[i] - mu) / sd;
    const nextRet = (closes[i + 1] - closes[i]) / closes[i];
    if (z > k) trades.push(-nextRet); // short mean reversion
    else if (z < -k) trades.push(nextRet); // long mean reversion
  }
  return summarizeTrades(trades);
}

function backtestBreakout(data, lookback = 20) {
  // Donchian breakout; enter on close breakout, exit next bar
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const closes = data.map(d => d.close);
  const trades = [];
  for (let i = lookback; i < data.length - 1; i++) {
    const hh = Math.max(...highs.slice(i - lookback, i));
    const ll = Math.min(...lows.slice(i - lookback, i));
    const c = closes[i];
    const nextRet = (closes[i + 1] - c) / c;
    if (c > hh) trades.push(nextRet);
    else if (c < ll) trades.push(-nextRet);
  }
  return summarizeTrades(trades);
}

function summarizeTrades(trades) {
  const n = trades.length;
  const wr = pctPos(trades);
  const avg = mean(trades);
  const std = (() => {
    if (!n) return 0;
    const mu = avg;
    return Math.sqrt(trades.reduce((a, x) => a + (x - mu) * (x - mu), 0) / (n - 1 || 1));
  })();
  const sharpe = std ? (avg / std) * Math.sqrt(252) : 0;
  return { trades: n, winRate: wr, avgPerTrade: avg, sharpe };
}

function analyzeFile(label, filePath) {
  const data = addReturns(parseCsv(filePath));
  const rets = data.map(d => d.ret).filter(v => Number.isFinite(v));
  const logRets = data.map(d => d.logRet).filter(v => Number.isFinite(v));
  const retStats = stats(rets);
  const logStats = stats(logRets);
  const ac1 = autocorr(rets, 10);
  const ac2 = autocorr(rets.map(x => x * x), 10); // volatility clustering
  const hourly = groupByHour(data);
  const hourSummary = [];
  for (const [h, arr] of hourly.entries()) {
    const r = arr.map(x => x.ret).filter(v => Number.isFinite(v));
    const s = stats(r);
    hourSummary.push({ hour: h, n: s.n, mean: s.mean, std: s.std });
  }
  hourSummary.sort((a, b) => a.hour - b.hour);
  const patterns = detectPatterns(data);
  const gaps = gapAnalysis(data);
  const mr = backtestMeanReversion(data);
  const bo = backtestBreakout(data);
  return { label, count: data.length, retStats, logStats, acf: ac1, acfSq: ac2, hourSummary, patterns, gaps, mr, bo };
}

function main() {
  const files = [
    { label: 'M1', p: 'c:/Users/laone/AppData/Roaming/MetaQuotes/Terminal/CF89AB30ACB6DA0DBA14DA647C3517F8/MQL5/Files/HistoricalData_FX Vol 99_M1.csv' },
    { label: 'M15', p: 'c:/Users/laone/AppData/Roaming/MetaQuotes/Terminal/CF89AB30ACB6DA0DBA14DA647C3517F8/MQL5/Files/HistoricalData_FX Vol 99_M15.csv' },
    { label: 'H1', p: 'c:/Users/laone/AppData/Roaming/MetaQuotes/Terminal/CF89AB30ACB6DA0DBA14DA647C3517F8/MQL5/Files/HistoricalData_FX Vol 99_H1.csv' },
    { label: 'H4', p: 'c:/Users/laone/AppData/Roaming/MetaQuotes/Terminal/CF89AB30ACB6DA0DBA14DA647C3517F8/MQL5/Files/HistoricalData_FX Vol 99_H4.csv' },
  ];
  const results = [];
  for (const f of files) {
    if (!fs.existsSync(f.p)) {
      console.error(`Missing file: ${f.p}`);
      continue;
    }
    console.log(`Analyzing ${f.label} from ${f.p}`);
    const res = analyzeFile(f.label, f.p);
    results.push(res);
  }
  const out = { generatedAt: new Date().toISOString(), results };
  const outPath = path.join(process.cwd(), 'analysis', 'synthetic_index_report.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\nSaved JSON report to: ${outPath}`);
  // Also print concise summary
  for (const r of results) {
    console.log(`\n=== ${r.label} (${r.count} bars) ===`);
    console.log('Returns mean/std (dailyized naive):', r.retStats.mean.toFixed(6), r.retStats.std.toFixed(6));
    console.log('ACF(1..3):', r.acf.slice(0,3).map(x => x.toFixed(3)).join(', '));
    console.log('ACF sq (1..3):', r.acfSq.slice(0,3).map(x => x.toFixed(3)).join(', '));
    console.log('Patterns:', r.patterns);
    console.log('Gaps big pct:', (r.gaps.pctBig*100).toFixed(2)+'%');
    console.log('MeanReversion:', r.mr);
    console.log('Breakout:', r.bo);
  }
}

main();


