import React, { useState, useEffect, useRef } from 'react';
import { Chart } from 'react-chartjs-2';
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, TrendingUp, Clock } from 'lucide-react';
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
  Filler
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { format } from 'date-fns';
import _ from 'lodash';
import { filterDataByTimeRange, getTimeUnit, getTooltipFormat } from '../utils/chartUtils';

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

const WORKER_URL = 'https://coinbase-rank-tracker.johncruzrod.workers.dev';

const StatCard = ({ title, value, change, color, icon: Icon }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <Icon className="w-5 h-5 text-gray-400" />
    </div>
    <div className="flex items-baseline justify-between">
      <p className="text-4xl font-bold" style={{ color }}>
        {value}
      </p>
      {change && (
        <div className={`flex items-center space-x-1 ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change > 0 ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
          <span className="text-sm font-medium">{Math.abs(change)}</span>
        </div>
      )}
    </div>
  </div>
);

const TabButton = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
      active
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 transform scale-105'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    {children}
  </button>
);

export default function CryptoRankingDashboard() {
  const [currentCategory, setCurrentCategory] = useState('finance');
  const [latestRankings, setLatestRankings] = useState({});
  const [historicalData, setHistoricalData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const historicalDataCache = useRef({});
  const [stats, setStats] = useState({});

  const calculateStats = (data) => {
    const apps = ['Coinbase', 'Crypto.com', 'Binance'];
    const stats = {};
    
    apps.forEach(app => {
      const rankings = data.map(d => d[app]).filter(r => r !== null && r !== undefined && r <= 100);
      if (rankings.length > 0) {
        stats[app] = {
          average: _.mean(rankings).toFixed(1),
          volatility: _.round(_.std(rankings) || 0, 2),
          best: _.min(rankings),
          worst: _.max(rankings)
        };
      }
    });
    
    return stats;
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [rankingsRes, historicalRes] = await Promise.all([
          fetch(`${WORKER_URL}/api/latest?category=${currentCategory}`),
          fetch(`${WORKER_URL}/api/historical?category=${currentCategory}`)
        ]);
        
        const [rankingsData, historicalData] = await Promise.all([
          rankingsRes.json(),
          historicalRes.json()
        ]);

        setLatestRankings(rankingsData);
        setLastUpdated(rankingsData.timestamp ? new Date(rankingsData.timestamp) : null);
        
        if (Array.isArray(historicalData) && historicalData.length > 0) {
          historicalDataCache.current[currentCategory] = historicalData;
          setHistoricalData(historicalData);
          const calculatedStats = calculateStats(historicalData);
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
  }, [currentCategory]);

  const getChartOptions = () => {
    const { min, max } = getYAxisMinMax(filterDataByTimeRange(historicalData, timeRange));
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20,
            font: {
              size: 12,
              weight: '500'
            }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          titleColor: '#1f2937',
          bodyColor: '#4b5563',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          padding: 12,
          bodyFont: {
            size: 12
          },
          titleFont: {
            size: 14,
            weight: 'bold'
          }
        }
      },
      scales: {
        y: {
          reverse: true,
          min,
          max,
          ticks: {
            stepSize: Math.ceil((max - min) / 10),
            font: {
              size: 11
            },
            callback: function(value) {
              if (Math.floor(value) === value) {
                return value;
              }
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          type: 'time',
          time: {
            unit: getTimeUnit(timeRange),
            tooltipFormat: getTooltipFormat(timeRange),
            displayFormats: {
              hour: 'ha',
              day: 'MMM d',
              month: 'MMM yyyy'
            }
          },
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 11
            },
            maxRotation: 0
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    };
  };

  const getChartData = () => {
    const filteredData = filterDataByTimeRange(historicalData, timeRange);
    
    return {
      labels: filteredData.map(d => new Date(d.timestamp)),
      datasets: [
        {
          label: 'Coinbase',
          data: filteredData.map(d => ({
            x: new Date(d.timestamp),
            y: d.Coinbase > 100 ? null : d.Coinbase
          })),
          borderColor: '#1652f0',
          backgroundColor: 'rgba(22, 82, 240, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.4,
          spanGaps: true,
          fill: {
            target: 'origin',
            above: 'rgba(22, 82, 240, 0.1)'
          }
        },
        {
          label: 'Crypto.com',
          data: filteredData.map(d => ({
            x: new Date(d.timestamp),
            y: d['Crypto.com'] > 100 ? null : d['Crypto.com']
          })),
          borderColor: '#1199fa',
          backgroundColor: 'rgba(17, 153, 250, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.4,
          spanGaps: true,
          fill: {
            target: 'origin',
            above: 'rgba(17, 153, 250, 0.1)'
          }
        },
        {
          label: 'Binance',
          data: filteredData.map(d => ({
            x: new Date(d.timestamp),
            y: d.Binance > 100 ? null : d.Binance
          })),
          borderColor: '#f0b90b',
          backgroundColor: 'rgba(240, 185, 11, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.4,
          spanGaps: true,
          fill: {
            target: 'origin',
            above: 'rgba(240, 185, 11, 0.1)'
          }
        }
      ]
    };
  };

  const calculate24HourChange = (historicalData, app, latestRank) => {
    if (!historicalData?.length || !latestRank) return null;
    
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Find the closest data point to 24 hours ago
    const dayOldData = historicalData
      .filter(d => new Date(d.timestamp) <= twentyFourHoursAgo)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  
    if (!dayOldData) return null;
    
    const oldRank = dayOldData[app];
    if (!oldRank || oldRank > 100) return null;
    
    return oldRank - latestRank;
  };

  const getYAxisMinMax = (data) => {
    if (!data?.length) return { min: 1, max: 100 };
  
    // Get all valid rankings (≤ 100)
    const validRankings = data.flatMap(d => 
      ['Coinbase', 'Crypto.com', 'Binance']
        .map(app => d[app])
        .filter(rank => rank && rank <= 100)
    );
  
    if (!validRankings.length) return { min: 1, max: 100 };
  
    const min = Math.max(1, Math.floor(Math.min(...validRankings) / 10) * 10);
    const max = Math.min(100, Math.ceil(Math.max(...validRankings) / 10) * 10);
  
    // Ensure we have some padding and never go outside 1-100
    return {
      min: Math.max(1, min - 10),
      max: Math.min(100, max + 10)
    };
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return '--';
    try {
      return format(lastUpdated, 'PPp');
    } catch (error) {
      console.error('Error formatting date:', error);
      return '--';
    }
};

return (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Crypto Exchange Rankings
        </h1>
        <p className="text-gray-600">
          Track real-time App Store rankings for major cryptocurrency exchanges
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {[
        { name: 'Coinbase', color: '#1652f0', icon: TrendingUp },
        { name: 'Crypto.com', color: '#1199fa', icon: TrendingUp },
        { name: 'Binance', color: '#f0b90b', icon: TrendingUp }
        ].map((app) => (
        <StatCard
            key={app.name}
            title={app.name}
            value={latestRankings[app.name] || '--'}
            change={calculate24HourChange(historicalData, app.name, latestRankings[app.name])}
            color={app.color}
            icon={app.icon}
        />
        ))}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Last Updated</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-gray-900 text-sm">
            {formatLastUpdated()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
          <div className="flex space-x-4">
            <TabButton
              active={currentCategory === 'finance'}
              onClick={() => setCurrentCategory('finance')}
            >
              Finance
            </TabButton>
            <TabButton
              active={currentCategory === 'global'}
              onClick={() => setCurrentCategory('global')}
            >
              All Apps
            </TabButton>
          </div>
          <div className="flex space-x-4">
            {['24h', '7d', '30d', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                  timeRange === range
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {range === 'all' ? 'All Time' : range}
              </button>
            ))}
          </div>
        </div>
        
        <div className="h-[400px] relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <Chart type="line" data={getChartData()} options={getChartOptions()} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {Object.entries(stats).map(([app, stat]) => (
          <div key={app} className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{app} Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Average Rank</span>
                <span className="font-medium">{stat.average}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Volatility</span>
                <span className="font-medium">{stat.volatility}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Best Rank</span>
                <span className="font-medium text-green-600">{stat.best}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Worst Rank</span>
                <span className="font-medium text-red-600">{stat.worst}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
}