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
    LineController
  } from 'chart.js';
  
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    LineController,  // Add this
    Title,
    Tooltip,
    Legend,
    TimeScale,
    Filler
  );

export const filterDataByTimeRange = (data, range) => {
    if (!data || !data.length) return [];
    
    const now = new Date();
    
    switch (range) {
      case '24h':
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return data.filter(d => new Date(d.timestamp) >= oneDayAgo);
      case '7d':
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return data.filter(d => new Date(d.timestamp) >= sevenDaysAgo);
      case '30d':
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return data.filter(d => new Date(d.timestamp) >= thirtyDaysAgo);
      case 'all':
        return data;
      default:
        return data;
    }
  };
  
  export const getTimeUnit = (range) => {
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
  
  export const getTooltipFormat = (range) => {
    switch (range) {
      case '24h':
        return 'pp'; // Shows time with AM/PM
      case '7d':
        return 'MMM d, p'; // Shows Month Day, Time
      case '30d':
      case 'all':
        return 'MMM d'; // Shows Month Day
      default:
        return 'pp';
    }
  };