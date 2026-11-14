import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const rootDir = import.meta.dirname || path.resolve('.');

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'sync-imported-files',
        configureServer(server) {
          server.middlewares.use('/api/sync-files', (req, res) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => {
                body += chunk;
              });
              req.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  const importedDir = path.resolve(rootDir, 'imported');
                  if (!fs.existsSync(importedDir)) {
                    fs.mkdirSync(importedDir, { recursive: true });
                  }
                  if (Array.isArray(data.files)) {
                    for (const f of data.files) {
                      const safeName = f.path ? f.path.replace(/[/\\?%*:|"<>]/g, '_') : f.filename;
                      fs.writeFileSync(path.join(importedDir, safeName), f.content || '', 'utf-8');
                    }
                  }
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, count: data.files?.length || 0 }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } else {
              res.statusCode = 405;
              res.end('Method Not Allowed');
            }
          });

          server.middlewares.use('/api/list-imported', (req, res) => {
            const importedDir = path.resolve(rootDir, 'imported');
            if (!fs.existsSync(importedDir)) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ files: [] }));
              return;
            }
            const files = fs.readdirSync(importedDir);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ files }));
          });

          // Market Cache API
          server.middlewares.use('/api/market-cache', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                status: 'success',
                timestamp: new Date().toISOString(),
                data: [
                  { symbol: 'BTC/USDT', price: 92450.0, change24h: 3.42, volume24h: 34820100, high: 93200, low: 89500, cachedAt: '12s ago', status: 'fresh' },
                  { symbol: 'ETH/USDT', price: 3420.5, change24h: -1.15, volume24h: 18450300, high: 3510, low: 3380, cachedAt: '25s ago', status: 'fresh' },
                  { symbol: 'SOL/USDT', price: 184.2, change24h: 6.81, volume24h: 12100400, high: 188.5, low: 172.0, cachedAt: '8s ago', status: 'fresh' },
                  { symbol: 'NVDA', price: 138.25, change24h: 2.14, volume24h: 52140000, high: 139.8, low: 135.6, cachedAt: '45s ago', status: 'fresh' },
                  { symbol: 'AAPL', price: 232.1, change24h: 0.85, volume24h: 41200000, high: 234.0, low: 230.5, cachedAt: '1m ago', status: 'fresh' },
                  { symbol: 'TSLA', price: 264.4, change24h: -2.31, volume24h: 68400000, high: 272.0, low: 261.2, cachedAt: '2m ago', status: 'fresh' }
                ]
              })
            );
          });

          // Analysis Cache API
          server.middlewares.use('/api/analysis-cache', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                status: 'success',
                data: [
                  { symbol: 'BTC/USDT', rsi14: 68.4, macd: 'Bullish Crossover', ma50CrossMa200: 'Golden Cross', trendScore: 92, sentiment: 'Extreme Bullish', volatility: 'Moderate' },
                  { symbol: 'ETH/USDT', rsi14: 48.2, macd: 'Neutral', ma50CrossMa200: 'Consolidating', trendScore: 54, sentiment: 'Neutral', volatility: 'Low' },
                  { symbol: 'SOL/USDT', rsi14: 74.1, macd: 'Strong Bullish', ma50CrossMa200: 'Bullish Momentum', trendScore: 96, sentiment: 'Strong Buy', volatility: 'High' },
                  { symbol: 'NVDA', rsi14: 63.8, macd: 'Bullish', ma50CrossMa200: 'Above 200 EMA', trendScore: 84, sentiment: 'Bullish', volatility: 'Moderate' },
                  { symbol: 'TSLA', rsi14: 38.5, macd: 'Bearish Divergence', ma50CrossMa200: 'Testing Support', trendScore: 42, sentiment: 'Bearish', volatility: 'High' }
                ]
              })
            );
          });

          // Signal Outcomes API
          server.middlewares.use('/api/signal-outcomes', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                status: 'success',
                summary: { totalSignals: 142, winRate: '78.4%', totalPnL: '+248.6%', activeAlerts: 8 },
                data: [
                  { id: 'SIG-1042', symbol: 'BTC/USDT', type: 'Long Breakout', entryPrice: 89400, targetPrice: 94000, stopLoss: 87800, outcome: 'Target 1 Hit', pnl: '+5.14%', status: 'Won', date: 'Oct 18, 2026' },
                  { id: 'SIG-1043', symbol: 'SOL/USDT', type: 'Momentum Scalp', entryPrice: 172.5, targetPrice: 185.0, stopLoss: 168.0, outcome: 'Active', pnl: '+6.78%', status: 'Active', date: 'Oct 18, 2026' },
                  { id: 'SIG-1040', symbol: 'NVDA', type: 'Gap & Go', entryPrice: 135.2, targetPrice: 141.0, stopLoss: 132.8, outcome: 'Target 2 Hit', pnl: '+4.29%', status: 'Won', date: 'Oct 17, 2026' },
                  { id: 'SIG-1039', symbol: 'ETH/USDT', type: 'Range Reversal', entryPrice: 3480, targetPrice: 3620, stopLoss: 3410, outcome: 'Stopped Out', pnl: '-2.01%', status: 'Lost', date: 'Oct 16, 2026' },
                  { id: 'SIG-1038', symbol: 'TSLA', type: 'Bearish Short', entryPrice: 271.0, targetPrice: 258.0, stopLoss: 276.0, outcome: 'Target 1 Hit', pnl: '+4.79%', status: 'Won', date: 'Oct 15, 2026' }
                ]
              })
            );
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'lucide-react', 'recharts', 'motion'],
      exclude: ['node-unrar-js'],
    },
  };
});
