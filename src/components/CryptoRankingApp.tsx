import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  TooltipProps,
} from 'recharts';
import { format } from 'date-fns';
import { filterDataByTimeRange, RankingDataPoint } from '../utils/chartUtils';

// ============================================================================
// Types
// ============================================================================

type AppName = 'Coinbase' | 'Crypto.com' | 'Binance';
type TimeRange = '24h' | '7d' | '30d' | 'all';
type Category = 'finance' | 'global';
type Platform = 'ios' | 'android';

interface AppStats {
  average: number;
  volatility: number;
  best: number;
  worst: number;
  change_24h: number | null;
}

interface SummaryResponse {
  latest: {
    timestamp: string | null;
    Coinbase?: number | null;
    'Crypto.com'?: number | null;
    Binance?: number | null;
  };
  stats: Record<string, AppStats>;
  chartData: RankingDataPoint[];
}

// ============================================================================
// Constants
// ============================================================================

const APPS: { key: AppName; label: string; color: string; cssClass: string }[] = [
  { key: 'Coinbase', label: 'Coinbase', color: '#0052FF', cssClass: 'coinbase' },
  { key: 'Crypto.com', label: 'Crypto.com', color: '#7C3AED', cssClass: 'crypto-com' },
  { key: 'Binance', label: 'Binance', color: '#D97706', cssClass: 'binance' },
];

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: '24h', label: '24H' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: 'all', label: 'ALL' },
];

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'finance', label: 'Finance' },
  { key: 'global', label: 'All Apps' },
];

const PLATFORMS: { key: Platform; store: string; icon: string }[] = [
  { key: 'ios', store: 'App Store', icon: '/astore.png' },
  { key: 'android', store: 'Google Play', icon: '/gplay.png' },
];

// ============================================================================
// Custom Tooltip
// ============================================================================

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;

  const date = new Date(label);
  const formattedDate = format(date, 'MMM d, yyyy');
  const formattedTime = format(date, 'h:mm a');

  return (
    <div className="chart-tooltip">
      <div className="tooltip-date">
        {formattedDate} <span className="tooltip-time">{formattedTime}</span>
      </div>
      <div className="tooltip-items">
        {payload
          .filter((p) => p.value !== null && p.value !== undefined)
          .sort((a, b) => (a.value as number) - (b.value as number))
          .map((entry) => (
            <div key={entry.dataKey} className="tooltip-item">
              <span className="tooltip-dot" style={{ background: entry.color }} />
              <span className="tooltip-label">{entry.name}</span>
              <span className="tooltip-value">#{entry.value}</span>
            </div>
          ))}
      </div>
    </div>
  );
};

// ============================================================================
// Rank Display Component
// ============================================================================

interface RankDisplayProps {
  app: (typeof APPS)[number];
  rank: number | null | undefined;
  change: number | null | undefined;
  stats: AppStats | undefined;
}

const RankDisplay = ({ app, rank, change, stats }: RankDisplayProps) => {
  const changeType =
    change === null || change === undefined
      ? 'neutral'
      : change > 0
        ? 'positive'
        : change < 0
          ? 'negative'
          : 'neutral';

  return (
    <div className={`rank-display ${app.cssClass}`}>
      <div className="rank-number">
        {rank !== null && rank !== undefined ? (
          <>
            <span className="hash">#</span>
            {rank}
          </>
        ) : (
          <span className="rank-unranked">
            <span>Not in</span>
            <span>Top 100</span>
          </span>
        )}
      </div>

      <div className="rank-app-name">{app.label}</div>

      <div className={`rank-change ${changeType}`}>
        {changeType === 'positive' && '↑'}
        {changeType === 'negative' && '↓'}
        {changeType === 'neutral' && '—'}
        {change !== null && change !== undefined && change !== 0 && (
          <span>{Math.abs(change)}</span>
        )}
        {changeType !== 'neutral' && <span>24h</span>}
      </div>

      {stats && (
        <div className="rank-stats">
          <div className="rank-stat">
            <span className="rank-stat-label">Best</span>
            <span className="rank-stat-value">#{stats.best}</span>
          </div>
          <div className="rank-stat">
            <span className="rank-stat-label">Worst</span>
            <span className="rank-stat-value">#{stats.worst}</span>
          </div>
          <div className="rank-stat">
            <span className="rank-stat-label">Avg</span>
            <span className="rank-stat-value">#{stats.average.toFixed(0)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const CryptoRankingApp = () => {
  const [platform, setPlatform] = useState<Platform>('ios');
  const [category, setCategory] = useState<Category>('finance');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentPlatform = PLATFORMS.find((p) => p.key === platform)!;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const endpoint =
          platform === 'ios'
            ? `/api/apps/summary?category=${category}`
            : `/api/apps/android/summary?category=${category}`;
        const res = await fetch(endpoint);
        const json: SummaryResponse = await res.json();
        setData(json);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [category, platform]);

  // Process chart data
  const chartData = useMemo(() => {
    if (!data?.chartData) return [];
    const filtered = filterDataByTimeRange(data.chartData, timeRange);
    return filtered.map((d) => ({
      timestamp: new Date(d.timestamp).getTime(),
      Coinbase: d.Coinbase && d.Coinbase <= 100 ? d.Coinbase : null,
      'Crypto.com': d['Crypto.com'] && d['Crypto.com'] <= 100 ? d['Crypto.com'] : null,
      Binance: d.Binance && d.Binance <= 100 ? d.Binance : null,
    }));
  }, [data?.chartData, timeRange]);

  // Calculate Y-axis domain
  const yDomain = useMemo(() => {
    if (!chartData.length) return [1, 100];
    const allRanks = chartData.flatMap((d) =>
      [d.Coinbase, d['Crypto.com'], d.Binance].filter((r): r is number => r !== null)
    );
    if (!allRanks.length) return [1, 100];
    const min = Math.max(1, Math.floor(Math.min(...allRanks) / 10) * 10 - 10);
    const max = Math.min(100, Math.ceil(Math.max(...allRanks) / 10) * 10 + 10);
    return [min, max];
  }, [chartData]);

  const formattedTime = data?.latest?.timestamp
    ? format(new Date(data.latest.timestamp), 'MMM d, h:mm a')
    : '—';

  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    if (timeRange === '24h') return format(date, 'ha');
    if (timeRange === '7d') return format(date, 'EEE');
    return format(date, 'MMM d');
  };

  return (
    <div className="app-container">
      <div className="app-background" />

      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">Crypto App Rankings</h1>
          <p className="app-subtitle">US {currentPlatform.store} • Top Free Apps</p>
        </div>

        <div className="header-controls">
          <div className="platform-toggle">
            {PLATFORMS.map((p) => (
              <button
                key={p.key}
                className={`platform-btn ${platform === p.key ? 'active' : ''}`}
                onClick={() => setPlatform(p.key)}
                title={p.store}
              >
                <img src={p.icon} alt={p.store} className="platform-icon" />
              </button>
            ))}
          </div>

          <div className="category-toggle">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                className={`category-btn ${category === cat.key ? 'active' : ''}`}
                onClick={() => setCategory(cat.key)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="timestamp">
          <span className="timestamp-dot" />
          <span>{formattedTime}</span>
        </div>
      </header>

      {/* Main */}
      <main className="main-content">
        {/* Rankings */}
        <section className="rankings-strip">
          {APPS.map((app) => (
            <RankDisplay
              key={app.key}
              app={app}
              rank={data?.latest?.[app.key]}
              change={data?.stats?.[app.key]?.change_24h}
              stats={data?.stats?.[app.key]}
            />
          ))}
        </section>

        {/* Chart */}
        <section className="chart-section">
          <div className="chart-header">
            <div className="chart-legend">
              {APPS.map((app) => (
                <div key={app.key} className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: app.color }} />
                  <span>{app.label}</span>
                </div>
              ))}
            </div>
            <div className="time-controls">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.key}
                  className={`time-btn ${timeRange === range.key ? 'active' : ''}`}
                  onClick={() => setTimeRange(range.key)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-container">
            {isLoading ? (
              <div className="loading-container">
                <div className="loading-spinner" />
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <defs>
                    {APPS.map((app) => (
                      <linearGradient key={app.key} id={`gradient-${app.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={app.color} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={app.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>

                  <CartesianGrid
                    stroke="rgba(0,0,0,0.06)"
                    strokeDasharray="0"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={formatXAxis}
                    stroke="rgba(0,0,0,0.1)"
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />

                  <YAxis
                    reversed
                    domain={yDomain}
                    stroke="rgba(0,0,0,0.1)"
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `#${v}`}
                    dx={-5}
                    width={45}
                  />

                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,0,0,0.1)' }} />

                  {APPS.map((app) => (
                    <Line
                      key={app.key}
                      type="monotone"
                      dataKey={app.key}
                      name={app.label}
                      stroke={app.color}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: '#fff',
                        stroke: app.color,
                        strokeWidth: 2,
                      }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">No data available</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default CryptoRankingApp;
