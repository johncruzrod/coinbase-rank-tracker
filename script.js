// Replace with your actual Worker URL
const WORKER_URL = 'https://coinbase-rank-tracker.johncruzrod.workers.dev';

let rankingChart;

async function fetchLatestRanking() {
    try {
        const response = await fetch(`${WORKER_URL}/api/latest`);
        const data = await response.json();
        console.log('Latest ranking data:', data);
        
        if (data.ranking) {
            document.getElementById('currentRank').textContent = `#${data.ranking}`;
            document.getElementById('lastUpdated').textContent = 
                `Last updated: ${new Date(data.timestamp).toLocaleString()}`;
        }
    } catch (error) {
        console.error('Error fetching latest ranking:', error);
    }
}

async function fetchHistoricalData() {
    try {
        console.log('Fetching historical data...');
        const response = await fetch(`${WORKER_URL}/api/historical`);
        const data = await response.json();
        console.log('Historical data received:', data);
        
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
    console.log('Updating chart with data:', data);
    const ctx = document.getElementById('rankingChart').getContext('2d');
    
    // Process dates and rankings
    const chartData = data.map(d => ({
        date: new Date(d.timestamp),
        ranking: d.ranking
    }));
    
    console.log('Processed chart data:', chartData);
    
    // Destroy existing chart if it exists
    if (rankingChart) {
        console.log('Destroying existing chart');
        rankingChart.destroy();
    }
    
    // Configure chart options
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `Rank: #${context.raw}`;
                    }
                }
            }
        },
        scales: {
            y: {
                reverse: true,
                min: Math.max(1, Math.min(...data.map(d => d.ranking)) - 1),
                max: Math.min(10, Math.max(...data.map(d => d.ranking)) + 1),
                title: {
                    display: true,
                    text: 'Ranking'
                },
                ticks: {
                    stepSize: 1
                }
            },
            x: {
                type: 'time',
                time: {
                    unit: 'minute',
                    displayFormats: {
                        minute: 'HH:mm'
                    }
                },
                title: {
                    display: true,
                    text: 'Time'
                }
            }
        }
    };
    
    // Create new chart
    rankingChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'App Store Ranking',
                data: data.map(d => ({
                    x: new Date(d.timestamp),
                    y: d.ranking
                })),
                borderColor: '#1652f0',
                backgroundColor: 'rgba(22, 82, 240, 0.1)',
                fill: true,
                tension: 0.1
            }]
        },
        options: options
    });
    
    console.log('New chart created');
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