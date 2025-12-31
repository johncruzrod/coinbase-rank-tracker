import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chart } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, Clock, BarChart3, Activity, LucideIcon } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  ChartOptions,
  ChartData,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { format } from 'date-fns';
import _ from 'lodash';
import {
  filterDataByTimeRange,
  getTimeUnit,
  getTooltipFormat,
  RankingDataPoint,
} from '../utils/chartUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

// Types
type AppName = 'Coinbase' | 'Crypto.com' | 'Binance';
type TimeRange = '24h' | '7d' | '30d' | 'all';
type Category = 'finance' | 'global';

interface AppColor {
  primary: string;
  light: string;
}

interface AppStats {
  average: string;
  volatility: string;
  best: number;
  worst: number;
}

interface LatestRankings {
  timestamp?: string;
  Coinbase?: number | null;
  'Crypto.com'?: number | null;
  Binance?: number | null;
}

// App brand colors
const APP_COLORS: Record<AppName, AppColor> = {
  Coinbase: { primary: '#0052FF', light: 'rgba(0, 82, 255, 0.08)' },
  'Crypto.com': { primary: '#002D74', light: 'rgba(0, 45, 116, 0.08)' },
  Binance: { primary: '#F0B90B', light: 'rgba(240, 185, 11, 0.08)' },
};

const APPS: AppName[] = ['Coinbase', 'Crypto.com', 'Binance'];

// Rank Card Component
interface RankCardProps {
  name: AppName;
  rank: number | null | undefined;
  change: number | null;
  color: string;
}

const RankCard: React.FC<RankCardProps> = ({ name, rank, change, color }) => {
  const isPositive = change !== null && change > 0;
  const hasChange = change !== null && change !== undefined;

  return (
    <div className="glass-card group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-medium text-gray-500">{name}</span>
        </div>
        {hasChange && (
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              isPositive
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-rose-50 text-rose-600'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{Math.abs(change)}</span>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-semibold tracking-tight text-gray-900">
          {rank ?? '—'}
        </span>
        {rank && <span className="text-lg text-gray-400 font-medium">th</span>}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        {hasChange
          ? isPositive
            ? 'Moved up in 24h'
            : 'Moved down in 24h'
          : 'No change data'}
      </p>
    </div>
  );
};

// Stats Card Component
interface StatsCardProps {
  name: AppName;
  stats: AppStats | undefined;
  color: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ name, stats, color }) => {
  if (!stats) return null;

  return (
    <div className="glass-card">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm font-medium text-gray-900">{name}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">Average</p>
          <p className="text-lg font-semibold text-gray-900">{stats.average}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Volatility</p>
          <p className="text-lg font-semibold text-gray-900">{stats.volatility}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Best</p>
          <p className="text-lg font-semibold text-emerald-600">#{stats.best}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Worst</p>
          <p className="text-lg font-semibold text-rose-500">#{stats.worst}</p>
        </div>
      </div>
    </div>
  );
};

// Main Component
const CryptoRankingDashboard: React.FC = () => {
  const [currentCategory, setCurrentCategory] = useState<Category>('finance');
  const [latestRankings, setLatestRankings] = useState<LatestRankings>({});
  const [historicalData, setHistoricalData] = useState<RankingDataPoint[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const historicalDataCache = useRef<Record<Category, RankingDataPoint[]>>({} as Record<Category, RankingDataPoint[]>);
  const [stats, setStats] = useState<Record<AppName, AppStats>>({} as Record<AppName, AppStats>);

  const calculateStandardDeviation = useCallback((arr: number[]): number => {
    const mean = _.mean(arr);
    const squareDiffs = arr.map((value) => Math.pow(value - mean, 2));
    return Math.sqrt(_.mean(squareDiffs));
  }, []);

  const calculateStats = useCallback(
    (data: RankingDataPoint[]): Record<AppName, AppStats> => {
      const result: Partial<Record<AppName, AppStats>> = {};

      APPS.forEach((app) => {
        const rankings = data
          .map((d) => d[app])
          .filter((r): r is number => r !== null && r !== undefined && r <= 100);
        if (rankings.length > 0) {
          result[app] = {
            average: _.mean(rankings).toFixed(1),
            volatility: calculateStandardDeviation(rankings).toFixed(2),
            best: _.min(rankings) ?? 0,
            worst: _.max(rankings) ?? 0,
          };
        }
      });

      return result as Record<AppName, AppStats>;
    },
    [calculateStandardDeviation]
  );

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [rankingsRes, historicalRes] = await Promise.all([
          fetch(`/api/apps/latest?category=${currentCategory}`),
          fetch(`/api/apps/historical?category=${currentCategory}`),
        ]);

        const [rankingsData, historicalDataResponse] = await Promise.all([
          rankingsRes.json() as Promise<LatestRankings>,
          historicalRes.json() as Promise<RankingDataPoint[]>,
        ]);

        setLatestRankings(rankingsData);
        setLastUpdated(
          rankingsData.timestamp ? new Date(rankingsData.timestamp) : null
        );

        if (Array.isArray(historicalDataResponse) && historicalDataResponse.length > 0) {
          historicalDataCache.current[currentCategory] = historicalDataResponse;
          setHistoricalData(historicalDataResponse);
          const calculatedStats = calculateStats(historicalDataResponse);
          setStats(calculatedStats);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const rankingInterval = setInterval(fetchData, 60000);
    return () => clearInterval(rankingInterval);
  }, [currentCategory, calculateStats]);

  const calculate24HourChange = (
    data: RankingDataPoint[],
    app: AppName,
    latestRank: number | null | undefined
  ): number | null => {
    if (!data?.length || !latestRank) return null;

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const dayOldData = data
      .filter((d) => new Date(d.timestamp) <= twentyFourHoursAgo)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (!dayOldData) return null;

    const oldRank = dayOldData[app];
    if (!oldRank || oldRank > 100) return null;

    return oldRank - latestRank;
  };

  const getYAxisMinMax = (data: RankingDataPoint[]): { min: number; max: number } => {
    if (!data?.length) return { min: 1, max: 100 };

    const validRankings = data.flatMap((d) =>
      APPS.map((app) => d[app]).filter((rank): rank is number => rank !== null && rank <= 100)
    );

    if (!validRankings.length) return { min: 1, max: 100 };

    const minVal = Math.max(1, Math.floor(Math.min(...validRankings) / 10) * 10);
    const maxVal = Math.min(100, Math.ceil(Math.max(...validRankings) / 10) * 10);

    return {
      min: Math.max(1, minVal - 5),
      max: Math.min(100, maxVal + 5),
    };
  };

  const getChartOptions = (): ChartOptions<'line'> => {
    const { min, max } = getYAxisMinMax(filterDataByTimeRange(historicalData, timeRange));

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#1f2937',
          bodyColor: '#6b7280',
          borderColor: 'rgba(0, 0, 0, 0.05)',
          borderWidth: 1,
          cornerRadius: 12,
          padding: 16,
          boxPadding: 6,
          usePointStyle: true,
          titleFont: {
            size: 13,
            weight: 'bold',
          },
          bodyFont: {
            size: 12,
          },
        },
      },
      scales: {
        y: {
          reverse: true,
          min,
          max,
          ticks: {
            stepSize: Math.ceil((max - min) / 8),
            font: {
              size: 11,
              weight: 500,
            },
            color: '#9ca3af',
            padding: 8,
            callback: (value) => (Math.floor(value as number) === value ? value : ''),
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.03)',
          },
          border: {
            display: false,
          },
        },
        x: {
          type: 'time',
          time: {
            unit: getTimeUnit(timeRange),
            tooltipFormat: getTooltipFormat(timeRange),
            displayFormats: {
              hour: 'ha',
              day: 'MMM d',
              month: 'MMM yyyy',
            },
          },
          grid: {
            display: false,
          },
          border: {
            display: false,
          },
          ticks: {
            font: {
              size: 11,
              weight: 500,
            },
            color: '#9ca3af',
            maxRotation: 0,
            padding: 8,
          },
        },
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
      elements: {
        point: {
          radius: 0,
          hoverRadius: 5,
          hoverBorderWidth: 2,
          hoverBackgroundColor: '#fff',
        },
      },
    };
  };

  const getChartData = (): ChartData<'line'> => {
    const filteredData = filterDataByTimeRange(historicalData, timeRange);

    return {
      labels: filteredData.map((d) => new Date(d.timestamp)),
      datasets: [
        {
          label: 'Coinbase',
          data: filteredData.map((d) => ({
            x: new Date(d.timestamp).getTime(),
            y: d.Coinbase && d.Coinbase <= 100 ? d.Coinbase : null,
          })),
          borderColor: APP_COLORS.Coinbase.primary,
          backgroundColor: APP_COLORS.Coinbase.light,
          borderWidth: 2.5,
          tension: 0.4,
          spanGaps: true,
          fill: true,
        },
        {
          label: 'Crypto.com',
          data: filteredData.map((d) => ({
            x: new Date(d.timestamp).getTime(),
            y: d['Crypto.com'] && d['Crypto.com'] <= 100 ? d['Crypto.com'] : null,
          })),
          borderColor: APP_COLORS['Crypto.com'].primary,
          backgroundColor: APP_COLORS['Crypto.com'].light,
          borderWidth: 2.5,
          tension: 0.4,
          spanGaps: true,
          fill: true,
        },
        {
          label: 'Binance',
          data: filteredData.map((d) => ({
            x: new Date(d.timestamp).getTime(),
            y: d.Binance && d.Binance <= 100 ? d.Binance : null,
          })),
          borderColor: APP_COLORS.Binance.primary,
          backgroundColor: APP_COLORS.Binance.light,
          borderWidth: 2.5,
          tension: 0.4,
          spanGaps: true,
          fill: true,
        },
      ],
    };
  };

  const formatLastUpdated = (): string => {
    if (!lastUpdated) return '—';
    try {
      return format(lastUpdated, 'MMM d, h:mm a');
    } catch {
      return '—';
    }
  };

  const timeRanges: { key: TimeRange; label: string }[] = [
    { key: '24h', label: '24H' },
    { key: '7d', label: '7D' },
    { key: '30d', label: '30D' },
    { key: 'all', label: 'All' },
  ];

  const categories: { key: Category; label: string; icon: LucideIcon }[] = [
    { key: 'finance', label: 'Finance', icon: BarChart3 },
    { key: 'global', label: 'All Apps', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-header">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                App Store Rankings
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Crypto exchange performance tracker
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{formatLastUpdated()}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Category Tabs */}
        <div className="flex gap-2 mb-8">
          {categories.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setCurrentCategory(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                currentCategory === key
                  ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Rank Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {APPS.map((app) => (
            <RankCard
              key={app}
              name={app}
              rank={latestRankings[app]}
              change={calculate24HourChange(historicalData, app, latestRankings[app])}
              color={APP_COLORS[app].primary}
            />
          ))}
        </div>

        {/* Chart Section */}
        <div className="glass-card mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Ranking History
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Track position changes over time
              </p>
            </div>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              {timeRanges.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTimeRange(key)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                    timeRange === key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex gap-6 mb-6">
            {APPS.map((app) => (
              <div key={app} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: APP_COLORS[app].primary }}
                />
                <span className="text-sm text-gray-600">{app}</span>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="h-[360px] relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
              </div>
            ) : historicalData.length > 0 ? (
              <Chart type="line" data={getChartData()} options={getChartOptions()} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {APPS.map((app) => (
            <StatsCard
              key={app}
              name={app}
              stats={stats[app]}
              color={APP_COLORS[app].primary}
            />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 mt-8 border-t border-gray-100">
        <p className="text-center text-sm text-gray-400">
          Data sourced from App Store Top Charts. Updated hourly.
        </p>
      </footer>
    </div>
  );
};

export default CryptoRankingDashboard;
