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
            
            // Keep track of used positions
            const usedPositions = [];
            const size = 24; // Size of the logo
            const padding = 2; // Minimum padding between logos

            data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                const latestPoint = meta.data[meta.data.length - 1];

                if (latestPoint) {
                    const appLabel = dataset.label;
                    const latestY = dataset.data[dataset.data.length - 1].y;

                    // Only draw the logo if the latest ranking is valid
                    if (latestY !== null && images[appLabel]) {
                        const img = images[appLabel];
                        let xPos = latestPoint.x - size / 2;
                        let yPos = latestPoint.y - size / 2;

                        // Ensure the image is within chart boundaries
                        const maxX = right - size;
                        const minX = left;
                        const maxY = bottom - size;
                        const minY = top;

                        let finalX = Math.min(Math.max(xPos, minX), maxX);
                        let finalY = Math.min(Math.max(yPos, minY), maxY);

                        // Check for collisions with previously placed logos
                        let collision;
                        do {
                            collision = false;
                            for (const pos of usedPositions) {
                                if (Math.abs(finalX - pos.x) < size + padding && 
                                    Math.abs(finalY - pos.y) < size + padding) {
                                    // Collision detected, move down
                                    finalY += size + padding;
                                    // If moving down puts us out of bounds, wrap to top
                                    if (finalY > maxY) {
                                        finalY = minY;
                                        finalX += size + padding;
                                    }
                                    collision = true;
                                    break;
                                }
                            }
                        } while (collision && finalX <= maxX);

                        // Only draw if we found a valid position
                        if (finalX <= maxX) {
                            ctx.drawImage(img, finalX, finalY, size, size);
                            usedPositions.push({ x: finalX, y: finalY });
                        }
                    }
                }
            });
        }
    };

    // Register the plugin
    Chart.register(imagePlugin);

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
                            return new Date(date).toLocaleString('en-GB'); // DD/MM/YY format
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
                    suggestedMin: 1,
                    suggestedMax: 100,
                    ticks: {
                        stepSize: 10,
                        color: '#555'
                    },
                    grid: {
                        color: '#eee'
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
                            day: 'dd/MM/yy' // DDMMYY format
                        },
                        tooltipFormat: 'dd/MM/yy' // Tooltip date format
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
                    right: 40 // Added extra padding to accommodate logos
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
