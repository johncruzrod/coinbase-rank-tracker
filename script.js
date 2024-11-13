const WORKER_URL = 'https://coinbase-rank-tracker.johncruzrod.workers.dev';

let rankingChart;
let currentCategory = 'finance'; // Default category

// URLs for app logos
const appLogos = {
    Coinbase: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/fa/f4/2f/faf42f54-e7b5-0164-116b-4535c85ccf0d/AppIcon-0-0-1x_U007ephone-0-0-85-220.png/460x0w.webp',
    'Crypto.com': 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/61/dd/ed/61ddedb0-491a-bb2f-a75d-4e847dc0c210/AppIcon-0-0-1x_U007emarketing-0-5-0-sRGB-85-220.png/434x0w.webp',
    Binance: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/a3/11/b9/a311b9cd-b4aa-b79c-e02b-818969110eea/AppIcon-0-0-1x_U007ephone-0-85-220.png/460x0w.webp'
};

// Function to load images
const loadImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // To prevent CORS issues
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.error(`Failed to load image: ${src}`);
            resolve(null); // Resolve with null to handle missing images gracefully
        };
    });
};

// Function to fetch the latest ranking based on category
async function fetchLatestRanking(category) {
    console.log(`Fetching latest ranking for ${category}...`);
    try {
        const response = await fetch(`${WORKER_URL}/api/latest?category=${category}`);
        const data = await response.json();
        console.log(`Latest ranking data for ${category}:`, data);
        
        // Update all rankings
        document.getElementById('coinbaseRank').textContent = data.Coinbase !== undefined && data.Coinbase !== null ? data.Coinbase : 'N/A';
        document.getElementById('cryptocomRank').textContent = data['Crypto.com'] !== undefined && data['Crypto.com'] !== null ? data['Crypto.com'] : 'N/A';
        document.getElementById('binanceRank').textContent = data.Binance !== undefined && data.Binance !== null ? data.Binance : 'N/A';
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
async function updateChart(data) {
    console.log('Updating chart with data points:', data.length);
    const ctx = document.getElementById('rankingChart').getContext('2d');

    // Load images for the apps
    const images = {};
    try {
        const loadPromises = Object.entries(appLogos).map(async ([app, src]) => {
            const img = await loadImage(src);
            if (img) {
                images[app] = img;
            }
        });
        await Promise.all(loadPromises);
    } catch (error) {
        console.error('Error loading images:', error);
    }

    // Identify the latest data point
    const latestData = data[data.length - 1];
    const latestTimestamp = latestData.timestamp;

    // Prepare datasets with gradient
    const gradientColors = {
        Coinbase: {
            start: 'rgba(22, 82, 240, 0.5)',
            end: 'rgba(22, 82, 240, 0)'
        },
        'Crypto.com': {
            start: 'rgba(17, 153, 250, 0.5)',
            end: 'rgba(17, 153, 250, 0)'
        },
        Binance: {
            start: 'rgba(240, 185, 11, 0.5)',
            end: 'rgba(240, 185, 11, 0)'
        }
    };

    const datasets = [
        {
            label: 'Coinbase',
            data: data.map(d => ({ x: new Date(d.timestamp), y: d.Coinbase || null })),
            borderColor: '#1652f0',
            backgroundColor: function(context) {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
                gradient.addColorStop(0, gradientColors.Coinbase.start);
                gradient.addColorStop(1, gradientColors.Coinbase.end);
                return gradient;
            },
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2
        },
        {
            label: 'Crypto.com',
            data: data.map(d => ({ x: new Date(d.timestamp), y: d['Crypto.com'] || null })),
            borderColor: '#1199fa',
            backgroundColor: function(context) {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
                gradient.addColorStop(0, gradientColors['Crypto.com'].start);
                gradient.addColorStop(1, gradientColors['Crypto.com'].end);
                return gradient;
            },
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2
        },
        {
            label: 'Binance',
            data: data.map(d => ({ x: new Date(d.timestamp), y: d.Binance || null })),
            borderColor: '#f0b90b',
            backgroundColor: function(context) {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
                gradient.addColorStop(0, gradientColors.Binance.start);
                gradient.addColorStop(1, gradientColors.Binance.end);
                return gradient;
            },
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2
        }
    ];

    // Destroy previous chart if exists
    if (rankingChart) {
        rankingChart.destroy();
    }

    // Define the custom plugin to draw images on latest data points
    const imagePlugin = {
        id: 'imagePlugin',
        afterDatasetsDraw: (chart, args, options) => {
            const { ctx, data, chartArea: { top, bottom, left, right }, scales: { x, y } } = chart;

            // Get the latest valid rankings for sorting
            const latestRankings = data.datasets.map((dataset, index) => {
                const lastDataPoint = dataset.data[dataset.data.length - 1];
                return {
                    index,
                    y: lastDataPoint ? lastDataPoint.y : null,
                    label: dataset.label
                };
            }).filter(item => item.y !== null && item.y !== undefined);

            // Sort by Y value (ranking)
            latestRankings.sort((a, b) => a.y - b.y);

            // Calculate spacing based on chart dimensions
            const size = 24; // Logo size
            const spacing = size + 8; // Minimum vertical spacing between logos
            const maxY = bottom - size;
            const minY = top;

            latestRankings.forEach((ranking, i) => {
                const dataset = data.datasets[ranking.index];
                const meta = chart.getDatasetMeta(ranking.index);
                const latestPoint = meta.data[meta.data.length - 1];

                if (latestPoint && images[ranking.label]) {
                    const img = images[ranking.label];
                    let xPos = latestPoint.x;
                    let yPos = latestPoint.y;

                    // If y position would result in logo being cut off at top
                    if (yPos - size/2 < minY) {
                        yPos = minY + size/2;
                    }
                    // If y position would result in logo being cut off at bottom
                    if (yPos + size/2 > maxY) {
                        yPos = maxY - size/2;
                    }

                    // Calculate final positions
                    const finalX = Math.min(xPos - size/2, right - size);
                    const finalY = Math.min(Math.max(yPos - size/2, minY), maxY);

                    // Draw the logo
                    ctx.drawImage(img, finalX, finalY, size, size);
                }
            });
        }
    };

    // Create the chart
    rankingChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#333',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#fff',
                    borderWidth: 1,
                    callbacks: {
                        title: (tooltipItems) => {
                            const date = tooltipItems[0].parsed.x;
                            return new Date(date).toLocaleString('en-GB');
                        },
                        label: (tooltipItem) => {
                            return `${tooltipItem.dataset.label}: ${tooltipItem.parsed.y || 'N/A'}`;
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            scales: {
                y: {
                    reverse: true,
                    suggestedMin: -2, // Add padding at top
                    suggestedMax: 100,
                    ticks: {
                        stepSize: 10,
                        color: '#555',
                        callback: function(value) {
                            // Don't show negative values in axis
                            return value <= 0 ? '' : value;
                        }
                    },
                    grid: {
                        color: '#eee',
                        drawOnChartArea: function(context) {
                            return context.tick.value > 0;
                        }
                    },
                    title: {
                        display: true,
                        text: 'Ranking',
                        color: '#555',
                        font: {
                            size: 14
                        }
                    }
                },
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'dd/MM/yy'
                        },
                        tooltipFormat: 'dd/MM/yy'
                    },
                    grid: {
                        color: '#eee'
                    },
                    title: {
                        display: true,
                        text: 'Date',
                        color: '#555',
                        font: {
                            size: 14
                        }
                    },
                    ticks: {
                        color: '#555',
                        autoSkip: true,
                        maxTicksLimit: 10
                    }
                }
            },
            elements: {
                line: {
                    borderCapStyle: 'round'
                },
                point: {
                    pointStyle: 'circle'
                }
            },
            layout: {
                padding: {
                    top: 20,
                    right: 40,
                    bottom: 10,
                    left: 10
                }
            }
        },
        plugins: [imagePlugin]
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
    if (selectedCategory === currentCategory) return;

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