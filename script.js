const WORKER_URL = 'https://coinbase-rank-tracker.johncruzrod.workers.dev';

let rankingChart;

// Replace the fetchLatestRanking function with this:
async function fetchLatestRanking() {
    console.log('Fetching latest ranking...');
    try {
        const response = await fetch(`${WORKER_URL}/api/latest`);
        const data = await response.json();
        console.log('Latest ranking data:', data);
        
        // Update all rankings
        document.getElementById('coinbaseRank').textContent = `#${data.Coinbase || '--'}`;
        document.getElementById('cryptocomRank').textContent = `#${data['Crypto.com'] || '--'}`;
        document.getElementById('binanceRank').textContent = `#${data.Binance || '--'}`;
        document.getElementById('lastUpdated').textContent = 
            `Last updated: ${new Date(data.timestamp).toLocaleString()}`;
    } catch (error) {
        console.error('Error fetching latest ranking:', error);
    }
}

async function fetchHistoricalData() {
    console.log('Fetching historical data...');
    try {
        const response = await fetch(`${WORKER_URL}/api/historical`);
        const data = await response.json();
        console.log('Historical data:', data);
        
        if (!Array.isArray(data)) {
            console.error('Historical data is not an array:', data);
            return;
        }

        if (data.length === 0) {
            console.log('No historical data available');
            return;
        }
        
        updateChart(data);
    } catch (error) {
        console.error('Error fetching historical data:', error);
    }
}

function updateChart(data) {
    console.log('Updating chart with data points:', data.length);
    const ctx = document.getElementById('rankingChart').getContext('2d');
    
    if (rankingChart) {
        rankingChart.destroy();
    }

    const chartData = {
        labels: data.map(d => new Date(d.timestamp).toLocaleTimeString()),
        datasets: [
            {
                label: 'Coinbase',
                data: data.map(d => d.Coinbase || 101),
                borderColor: '#1652f0',
                backgroundColor: 'rgba(22, 82, 240, 0.1)',
                fill: false
            },
            {
                label: 'Crypto.com',
                data: data.map(d => d['Crypto.com'] || 101),
                borderColor: '#1199fa',
                backgroundColor: 'rgba(17, 153, 250, 0.1)',
                fill: false
            },
            {
                label: 'Binance',
                data: data.map(d => d.Binance || 101),
                borderColor: '#f0b90b',
                backgroundColor: 'rgba(240, 185, 11, 0.1)',
                fill: false
            }
        ]
    };
    
    rankingChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    reverse: true,
                    min: 1,
                    max: 100,
                    ticks: {
                        stepSize: 10
                    },
                    title: {
                        display: true,
                        text: 'Ranking'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                }
            }
        }
    });
}

// Initial fetch
console.log('Starting initial data fetch...');
fetchLatestRanking();
fetchHistoricalData();

// Refresh data every minute
setInterval(() => {
    console.log('Refreshing data...');
    fetchLatestRanking();
    fetchHistoricalData();
}, 60000);