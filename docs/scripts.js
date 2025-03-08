// Analog Clock Function
function updateAnalogClock() {
    const now = new Date();
    const seconds = now.getSeconds();
    const minutes = now.getMinutes();
    const hours = now.getHours() % 12;
    
    // Calculate rotation angles
    const secondsDegrees = (seconds / 60) * 360;
    const minutesDegrees = ((minutes + seconds / 60) / 60) * 360;
    const hoursDegrees = ((hours + minutes / 60) / 12) * 360;
    
    // Apply rotations to clock hands
    document.querySelector('.second-hand').style.transform = `translateX(-50%) rotate(${secondsDegrees}deg)`;
    document.querySelector('.minute-hand').style.transform = `translateX(-50%) rotate(${minutesDegrees}deg)`;
    document.querySelector('.hour-hand').style.transform = `translateX(-50%) rotate(${hoursDegrees}deg)`;
}

// Update analog clock every second
setInterval(updateAnalogClock, 1000);
updateAnalogClock(); // Initial update

// Market Summary Widget functions
function updateMarketSummary() {
    // Fetch global market data from CoinGecko API
    $.ajax({
        url: 'https://api.coingecko.com/api/v3/global',
        method: 'GET',
        timeout: 10000,
        success: function(data) {
            if (data && data.data) {
                const marketData = data.data;
                
                // Format market cap
                const marketCap = marketData.total_market_cap.usd;
                const formattedMarketCap = formatCurrency(marketCap);
                $('#global-market-cap').text(formattedMarketCap);
                
                // Format 24h volume
                const volume = marketData.total_volume.usd;
                const formattedVolume = formatCurrency(volume);
                $('#global-volume').text(formattedVolume);
                
                // BTC dominance
                const btcDominance = marketData.market_cap_percentage.btc.toFixed(1) + '%';
                $('#btc-dominance').text(btcDominance);
                
                // Determine market sentiment
                const marketChange = marketData.market_cap_change_percentage_24h_usd;
                let sentiment, sentimentClass;
                
                if (marketChange > 2) {
                    sentiment = "Bullish";
                    sentimentClass = "";
                } else if (marketChange > 0) {
                    sentiment = "Mildly Bullish";
                    sentimentClass = "";
                } else if (marketChange > -2) {
                    sentiment = "Neutral";
                    sentimentClass = "neutral";
                } else {
                    sentiment = "Bearish";
                    sentimentClass = "bearish";
                }
                
                $('#market-sentiment').text(sentiment);
                
                // Update pulse indicator class
                const pulseIndicator = document.querySelector('.pulse-indicator');
                pulseIndicator.className = 'pulse-indicator'; // Reset classes
                if (sentimentClass) {
                    pulseIndicator.classList.add(sentimentClass);
                }
            }
        },
        error: function(xhr, status, error) {
            console.error("Error fetching market data:", status, error);
            $('#btc-dominance').text("Error loading");
            $('#global-market-cap').text("Error loading");
            $('#global-volume').text("Error loading");
            $('#market-sentiment').text("Unknown");
        }
    });
}

// Format large numbers as currency with abbreviations
function formatCurrency(value) {
    if (value >= 1e12) {
        return '$' + (value / 1e12).toFixed(2) + 'T';
    } else if (value >= 1e9) {
        return '$' + (value / 1e9).toFixed(2) + 'B';
    } else if (value >= 1e6) {
        return '$' + (value / 1e6).toFixed(2) + 'M';
    } else if (value >= 1e3) {
        return '$' + (value / 1e3).toFixed(2) + 'K';
    } else {
        return '$' + value.toFixed(2);
    }
}

// Update market summary every 2 minutes
updateMarketSummary(); // Initial update
setInterval(updateMarketSummary, 120000);

// Real-time clock function
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    $('#clock').text(`${hours}:${minutes}:${seconds}`);
}

// Update the clock every second
setInterval(updateClock, 1000);
updateClock();

// Cryptocurrency symbols - consider moving this to a configuration object
const symbols = ["BTC", "ETH", "SOL", "TRUMP", "XRP", "ADA", "DOGE", "AVAX", "BNB"];

// Create a configuration object for better maintainability
const config = {
    refreshInterval: 5000, // milliseconds between price updates
    decimalPlaces: 6,      // decimal places for price display
    apiBaseUrl: 'https://api.binance.com/api/v3'
};

// API URLs for prices
const apiUrls = symbols.reduce((acc, symbol) => {
    acc[symbol] = `${config.apiBaseUrl}/ticker/price?symbol=${symbol}USDT`;
    return acc;
}, {});

// API URLs for klines with better interval mapping
const intervals = [2, 4, 6, 12, 24];
const intervalMapping = {
    2: { interval: '1m', limit: 120 },
    4: { interval: '15m', limit: 16 },
    6: { interval: '30m', limit: 12 },
    12: { interval: '1h', limit: 6 },
    24: { interval: '4h', limit: 6 }
};

const klineApiUrls = symbols.reduce((acc, symbol) => {
    acc[symbol] = intervals.reduce((innerAcc, interval) => {
        innerAcc[interval] = `${config.apiBaseUrl}/klines?symbol=${symbol}USDT&interval=${intervalMapping[interval].interval}&limit=${intervalMapping[interval].limit}`;
        return innerAcc;
    }, {});
    return acc;
}, {});

// jQuery selectors for elements
const priceElements = symbols.reduce((acc, symbol) => {
    acc[symbol] = $(`#${symbol.toLowerCase()}-price`);
    return acc;
}, {});

const percentageElements = symbols.reduce((acc, symbol) => {
    acc[symbol] = intervals.reduce((innerAcc, interval) => {
        innerAcc[interval] = $(`#${symbol.toLowerCase()}-percentage-${interval}h`);
        return innerAcc;
    }, {});
    return acc;
}, {});

// Fetch price with jQuery and better error handling
function fetchPrice(apiUrl, $priceElement, prevPrice) {
    return $.ajax({
        url: apiUrl,
        method: "GET",
        dataType: "json",
        timeout: 10000, // Add timeout to prevent hanging requests
        success: function (data) {
            if (!data || !data.price) {
                console.error("Invalid data format received:", data);
                $priceElement.text("Invalid data");
                return null;
            }
            
            const currentPrice = parseFloat(data.price);
            if (isNaN(currentPrice)) {
                console.error("Invalid price value:", data.price);
                $priceElement.text("Invalid price");
                return null;
            }
            
            $priceElement.text(`$${currentPrice.toFixed(config.decimalPlaces).replace(/\.?0+$/, '')}`);

            // Update the color based on price movement
            if (prevPrice !== null) {
                $priceElement.css("color", currentPrice > prevPrice ? "green" : currentPrice < prevPrice ? "red" : "gray");
            } else {
                $priceElement.css("color", "gray");
            }

            return currentPrice;
        },
        error: function (xhr, status, error) {
            console.error("Error fetching price:", status, error);
            $priceElement.text("Error fetching price");
            return null;
        },
    });
}

// Fetch percentage change with jQuery and improved error handling
function fetchPercentageChange(klineApiUrl, currentPrice, $percentageElement) {
    if (currentPrice === null) return Promise.resolve();

    return $.ajax({
        url: klineApiUrl,
        method: "GET",
        dataType: "json",
        timeout: 10000, // Add timeout
        success: function (data) {
            if (!Array.isArray(data) || data.length === 0 || !data[0] || data[0].length < 2) {
                console.error("Invalid kline data format:", data);
                $percentageElement.text("Invalid data");
                return;
            }
            
            const openingPrice = parseFloat(data[0][1]);
            if (isNaN(openingPrice)) {
                console.error("Invalid opening price:", data[0][1]);
                $percentageElement.text("Invalid price");
                return;
            }
            
            const percentageChange = ((currentPrice - openingPrice) / openingPrice) * 100;
            const percentageText = `${percentageChange.toFixed(2)}%`;

            $percentageElement.text(percentageText);
            $percentageElement.css("color", percentageChange > 0 ? "green" : percentageChange < 0 ? "red" : "white");
        },
        error: function (xhr, status, error) {
            console.error("Error fetching percentage change:", status, error);
            $percentageElement.text("Error");
        },
    });
}

// Update prices and percentages with better error handling and request management
function updatePricesAndPercentages() {
    const prevPrices = symbols.reduce((acc, symbol) => {
        acc[symbol] = null;
        return acc;
    }, {});
    
    // Track active requests to prevent overlapping updates
    let updateInProgress = false;

    function updateLoop() {
        if (updateInProgress) {
            console.log("Previous update still in progress, skipping this cycle");
            setTimeout(updateLoop, config.refreshInterval);
            return;
        }
        
        updateInProgress = true;
        
        // Fetch all prices concurrently
        const pricePromises = symbols.map(symbol => 
            fetchPrice(apiUrls[symbol], priceElements[symbol], prevPrices[symbol])
                .catch(error => {
                    console.error(`Failed to fetch price for ${symbol}:`, error);
                    return null;
                })
        );

        // Wait for prices to update
        $.when(...pricePromises)
            .then(function (...responses) {
                responses.forEach((response, index) => {
                    if (response && response[0] && response[0].price) {
                        prevPrices[symbols[index]] = parseFloat(response[0].price);
                    }
                });

                // Fetch percentage changes concurrently for all time intervals
                const intervalPromises = intervals.map(interval => {
                    return symbols.map(symbol => 
                        fetchPercentageChange(
                            klineApiUrls[symbol][interval], 
                            prevPrices[symbol], 
                            percentageElements[symbol][interval]
                        ).catch(error => {
                            console.error(`Failed to fetch percentage for ${symbol} at ${interval}h:`, error);
                            return null;
                        })
                    );
                }).flat();

                // Wait for all intervals to complete
                return $.when(...intervalPromises);
            })
            .always(() => {
                updateInProgress = false;
                // Refresh after configured interval
                setTimeout(updateLoop, config.refreshInterval);
            });
    }

    updateLoop(); // Start the loop
}

// Start updating prices and percentages
updatePricesAndPercentages();

// Fetch data from Binance API for 1 month (daily data) with better error handling
function fetchBinanceData(pair = "BTCUSDT") {
    const apiUrl = `${config.apiBaseUrl}/klines?symbol=${pair}&interval=1d&limit=30`;
    return new Promise((resolve, reject) => {
        $.ajax({
            url: apiUrl,
            method: "GET",
            dataType: "json",
            timeout: 15000, // Add timeout for long requests
            success: function (data) {
                if (!Array.isArray(data) || data.length === 0) {
                    reject("Invalid data format received from Binance API");
                    return;
                }
                
                try {
                    const labels = data.map(item => {
                        const timestamp = new Date(item[0]);
                        const day = timestamp.getDate();
                        const month = timestamp.getMonth() + 1;
                        const year = timestamp.getFullYear();
                        return `${month}/${day}/${year}`;
                    });

                    const prices = data.map(item => parseFloat(item[4])).filter(price => !isNaN(price));
                    
                    if (prices.length === 0) {
                        reject("No valid price data found");
                        return;
                    }
                    
                    resolve({ labels, prices });
                } catch (err) {
                    reject(`Error processing Binance data: ${err.message}`);
                }
            },
            error: function (xhr, status, error) {
                reject(`Error fetching data from Binance API: ${status} - ${error}`);
            }
        });
    });
}

// Toggle between the chart and price/percentage view for each pair
const pairs = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "TRUMPUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "BNBUSDT"]; // Add your pairs here

pairs.forEach(pair => {
    $(`.toggle-button[data-pair="${pair}"]`).on('click', function () {
        const $priceBox = $(`#price-percentage-box-${pair}`);
        const $chartBox = $(`#chart-box-${pair}`);
        const $button = $(this);
        
        if ($chartBox.css('display') === 'none') {
            // Switch to chart view
            $chartBox.show();
            $priceBox.hide();
            $button.text('Switch to Price/Percentage'); // Update button text
            $button.prop('disabled', true); // Disable button during loading

            // Fetch and render the chart data
            fetchBinanceData(pair)
                .then(({ labels, prices }) => {
                    renderChart(labels, prices, pair, 'line');
                })
                .catch(error => {
                    console.error(`Error loading chart for ${pair}:`, error);
                    $chartBox.html(`<div class="error-message">Failed to load chart: ${error}</div>`);
                })
                .finally(() => {
                    $button.prop('disabled', false); // Re-enable button
                });
        } else {
            // Switch to price/percentage view
            $chartBox.hide();
            $priceBox.show();
            $button.text('Switch to Chart'); // Update button text
        }
    });
    
    // Add candlestick chart toggle functionality
    $(`.candlestick-button[data-pair="${pair}"]`).on('click', function() {
        const $priceBox = $(`#price-percentage-box-${pair}`);
        const $chartBox = $(`#chart-box-${pair}`);
        const $lineButton = $(`.toggle-button[data-pair="${pair}"]`);
        const $candleButton = $(this);
        
        // Show chart box if it's not already visible
        if ($chartBox.css('display') === 'none') {
            $chartBox.show();
            $priceBox.hide();
            $lineButton.text('Switch to Price/Percentage');
        }
        
        $candleButton.prop('disabled', true); // Disable button during loading
        
        // Fetch candlestick data (OHLC)
        fetchCandlestickData(pair)
            .then((ohlcData) => {
                renderChart(null, ohlcData, pair, 'candlestick');
            })
            .catch(error => {
                console.error(`Error loading candlestick chart for ${pair}:`, error);
                $chartBox.html(`<div class="error-message">Failed to load candlestick chart: ${error}</div>`);
            })
            .finally(() => {
                $candleButton.prop('disabled', false); // Re-enable button
            });
    });
});

// Fetch candlestick data from Binance API
function fetchCandlestickData(pair = "BTCUSDT") {
    const apiUrl = `${config.apiBaseUrl}/klines?symbol=${pair}&interval=1d&limit=30`;
    return new Promise((resolve, reject) => {
        $.ajax({
            url: apiUrl,
            method: "GET",
            dataType: "json",
            timeout: 15000,
            success: function (data) {
                if (!Array.isArray(data) || data.length === 0) {
                    reject("Invalid data format received from Binance API");
                    return;
                }
                
                try {
                    // Format data for candlestick chart with proper timestamps
                    const ohlcData = data.map(item => {
                        const timestamp = new Date(item[0]);
                        return {
                            x: timestamp.getTime(),
                            o: parseFloat(item[1]), // open
                            h: parseFloat(item[2]), // high
                            l: parseFloat(item[3]), // low
                            c: parseFloat(item[4])  // close
                        };
                    });
                    
                    if (ohlcData.length === 0) {
                        reject("No valid candlestick data found");
                        return;
                    }
                    
                    resolve(ohlcData);
                } catch (err) {
                    reject(`Error processing Binance candlestick data: ${err.message}`);
                }
            },
            error: function (xhr, status, error) {
                reject(`Error fetching candlestick data from Binance API: ${status} - ${error}`);
            }
        });
    });
}

let chartInstances = {}; // Store chart instances for each pair

// Function to render the chart for each pair with better error handling
function renderChart(labels, data, pair, chartType = 'line') {
    const canvasId = `#${pair.toLowerCase()}Chart`;
    const canvas = $(canvasId)[0];
    
    if (!canvas) {
        console.error(`Canvas element not found: ${canvasId}`);
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error(`Failed to get 2D context for canvas: ${canvasId}`);
        return;
    }

    // If chart already exists for this pair, destroy it and create a new one
    if (chartInstances[pair]) {
        chartInstances[pair].destroy();
    }

    try {
        let chartConfig;
        
        if (chartType === 'line') {
            // Line chart configuration
            chartConfig = {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: `${pair} Price`,
                        data: data,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        borderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        fill: true,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            },
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: `Price (USDT)`
                            },
                            beginAtZero: false
                        }
                    }
                }
            };
        } else if (chartType === 'candlestick') {
            // Candlestick chart configuration
            chartConfig = {
                type: 'candlestick',
                data: {
                    datasets: [{
                        label: `${pair} OHLC`,
                        data: data,
                        color: {
                            up: 'rgba(0, 200, 83, 1)',
                            down: 'rgba(255, 82, 82, 1)',
                            unchanged: 'rgba(90, 90, 90, 1)',
                        }
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    const point = context.raw;
                                    return [
                                        `Open: $${point.o.toFixed(2)}`,
                                        `High: $${point.h.toFixed(2)}`,
                                        `Low: $${point.l.toFixed(2)}`,
                                        `Close: $${point.c.toFixed(2)}`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'day',
                                displayFormats: {
                                    day: 'MM/dd'
                                }
                            },
                            title: {
                                display: true,
                                text: 'Date'
                            },
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: `Price (USDT)`
                            },
                            beginAtZero: false
                        }
                    }
                }
            };
        }

        // Create the chart
        chartInstances[pair] = new Chart(ctx, chartConfig);

        // Force a resize when the chart is created
        chartInstances[pair].resize();
        chartInstances[pair].update();
    } catch (error) {
        console.error(`Error creating ${chartType} chart for ${pair}:`, error);
        $(`#chart-box-${pair}`).html(`<div class="error-message">Failed to create ${chartType} chart: ${error.message}</div>`);
    }
}

// Initialize the chart and hide it initially for each pair
$(document).ready(() => {
    // Load the candlestick chart plugin
    loadCandlestickPlugin();
    
    pairs.forEach(pair => {
        $(`#chart-box-${pair}`).hide();
    });
});

// Load the candlestick chart plugin
function loadCandlestickPlugin() {
    if (!Chart.controllers.candlestick) {
        // Add script to load the candlestick chart plugin if not already loaded
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chartjs-chart-financial@0.1.1/dist/chartjs-chart-financial.min.js';
        script.async = true;
        document.head.appendChild(script);
        
        script.onload = function() {
            console.log('Candlestick chart plugin loaded successfully');
        };
        
        script.onerror = function() {
            console.error('Failed to load candlestick chart plugin');
        };
    }
}

// Ensure the chart resizes when the window is resized with debounce
let resizeTimeout;
$(window).on('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        Object.keys(chartInstances).forEach(pair => {
            if (chartInstances[pair]) {
                chartInstances[pair].resize();
            }
        });
    }, 250); // Debounce resize events
});
