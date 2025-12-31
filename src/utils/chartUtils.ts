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
  LineController,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

export interface RankingDataPoint {
  timestamp: string;
  Coinbase: number | null;
  'Crypto.com': number | null;
  Binance: number | null;
}

type TimeRange = '24h' | '7d' | '30d' | 'all';

export const filterDataByTimeRange = (
  data: RankingDataPoint[],
  range: TimeRange
): RankingDataPoint[] => {
  if (!data || !data.length) return [];

  const now = new Date();

  switch (range) {
    case '24h': {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return data.filter((d) => new Date(d.timestamp) >= oneDayAgo);
    }
    case '7d': {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return data.filter((d) => new Date(d.timestamp) >= sevenDaysAgo);
    }
    case '30d': {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return data.filter((d) => new Date(d.timestamp) >= thirtyDaysAgo);
    }
    case 'all':
    default:
      return data;
  }
};

export const getTimeUnit = (range: TimeRange): 'hour' | 'day' | 'month' => {
  switch (range) {
    case '24h':
      return 'hour';
    case '7d':
      return 'day';
    case '30d':
    case 'all':
      return 'month';
    default:
      return 'hour';
  }
};

export const getTooltipFormat = (range: TimeRange): string => {
  switch (range) {
    case '24h':
      return 'pp';
    case '7d':
      return 'MMM d, p';
    case '30d':
    case 'all':
      return 'MMM d';
    default:
      return 'pp';
  }
};
