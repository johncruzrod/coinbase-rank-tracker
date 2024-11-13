// Replace with your Worker URL once deployed
const WORKER_URL = 'https://YOUR_WORKER_URL.workers.dev';

let rankingChart;

async function fetchLatestRanking() {
    try {
        const response = await fetch(`${WORKER_URL}/api/latest`);
        const data = await response.json();
        
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
        const response = await fetch(`${WORKER_URL}/api/historical`);
        const data = await response.json();
        
        updateChart(data);
    } catch (error) {
        console.error('Error fetching historical data:', error);
    }
}

function updateChart(data) {
    const ctx = document.getElementById('rankingChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (rankingChart) {
        rankingChart.destroy();
    }
    
    rankingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => new Date(d.timestamp).toLocaleDateString()),
            datasets: [{
                label: 'App Store Ranking',
                data: data.map(d => d.ranking),
                borderColor: '#1652f0',
                backgroundColor: 'rgba(22, 82, 240, 0.1)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    reverse: true,
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Ranking'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
}

// Initial fetch
fetchLatestRanking();
fetchHistoricalData();

// Refresh data every minute
setInterval(() => {
    fetchLatestRanking();
    fetchHistoricalData();
}, 60000);
