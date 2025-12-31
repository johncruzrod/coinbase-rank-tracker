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
