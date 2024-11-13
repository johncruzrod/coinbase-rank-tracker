const WORKER_URL = 'https://coinbase-rank-tracker.johncruzrod.workers.dev';

let rankingChart;
let currentCategory = 'finance'; // Default category

// Function to fetch the latest ranking based on category
async function fetchLatestRanking(category) {
    console.log(`Fetching latest ranking for ${category}...`);
    try {
        const response = await fetch(`${WORKER_URL}/api/latest?category=${category}`);
        const data = await response.json();
        console.log(`Latest ranking data for ${category}:`, data);
        
        // Update all rankings
        document.getElementById('coinbaseRank').textContent = data.Coinbase !== undefined ? data.Coinbase : 'N/A';
        document.getElementById('cryptocomRank').textContent = data['Crypto.com'] !== undefined ? data['Crypto.com'] : 'N/A';
        document.getElementById('binanceRank').textContent = data.Binance !== undefined ? data.Binance : 'N/A';
        document.getElementById('lastUpdated').textContent = 
            `Last updated: ${data.timestamp ? new Date(data.timestamp).toLocaleString() : '--'}`;
    } catch (error) {
        console.error(`Error fetching latest ranking for ${category}:`, error);
    }
}

// Function to fetch historical data based on category
async function fetchHistoricalData(category) {
    console.log(`Fetching historical data for ${category}...`);
    try {
        const response = await fetch(`${WORKER_URL}/api/historical?category=${category}`);
        const data = await response.json();
        console.log(`Historical data for ${category}:`, data);
        
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
        console.error(`Error fetching historical data for ${category}:`, error);
    }
}

// Function to update the Chart.js chart
function updateChart(data) {
    console.log('Updating chart with data points:', data.length);
    const ctx = document.getElementById('rankingChart').getContext('2d');
    
    if (rankingChart) {
        rankingChart.destroy();
    }

    const chartData = {
        labels: data.map(d => new Date(d.timestamp)),
        datasets: [
            {
                label: 'Coinbase',
                data: data.map(d => d.Coinbase || null),
                borderColor: '#1652f0',
                backgroundColor: 'rgba(22, 82, 240, 0.1)',
                fill: false,
                spanGaps: true
            },
            {
                label: 'Crypto.com',
                data: data.map(d => d['Crypto.com'] || null),
                borderColor: '#1199fa',
                backgroundColor: 'rgba(17, 153, 250, 0.1)',
                fill: false,
                spanGaps: true
            },
            {
                label: 'Binance',
                data: data.map(d => d.Binance || null),
                borderColor: '#f0b90b',
                backgroundColor: 'rgba(240, 185, 11, 0.1)',
                fill: false,
                spanGaps: true
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
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    reverse: true,
                    suggestedMin: 1,
                    suggestedMax: 100,
                    ticks: {
                        stepSize: 10
                    },
                    title: {
                        display: true,
                        text: 'Ranking'
                    }
                },
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        tooltipFormat: 'PPpp'
                    },
                    title: {
                        display: true,
                        text: 'Time'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Function to initialize data fetch
function initializeData() {
    fetchLatestRanking(currentCategory);
    fetchHistoricalData(currentCategory);
}

// Function to handle tab switching
function handleTabSwitch(event) {
    const selectedCategory = event.target.getAttribute('data-category');
    if (selectedCategory === currentCategory) return; // Do nothing if same category

    currentCategory = selectedCategory;

    // Update active tab
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.toggle('active', button.getAttribute('data-category') === currentCategory);
    });

    // Fetch and update data for the selected category
    initializeData();
}

// Add event listeners to tab buttons
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', handleTabSwitch);
});

// Initial fetch
console.log('Starting initial data fetch...');
initializeData();

// Refresh data every minute
setInterval(() => {
    console.log('Refreshing data...');
    initializeData();
}, 60000);
