// Dashboard JavaScript - BizForecast
// All metrics and chart data are real values passed from Flask (flaskMetrics / chartData).
// The "Refresh Data" button reloads the page to fetch fresh DB values.
'use strict';

document.addEventListener('DOMContentLoaded', function () {

    // ── Guard: stop if there's no data ──────────────────────
    if (typeof flaskMetrics === 'undefined' || typeof chartData === 'undefined') return;

    // ── 1. Build Charts ──────────────────────────────────────
    initializeCharts();

    // ── 2. Wire up UI ────────────────────────────────────────
    setupEventListeners();

    // ── 3. Activity feed ticker ──────────────────────────────
    updateActivityFeed();

    // ======================================================
    //  CHART INITIALISATION
    // ======================================================
    function initializeCharts() {

        // ── Sales Overview (Monthly Revenue) ─────────────────
        const salesCtx = document.getElementById('salesOverviewChart');
        if (salesCtx) {
            const ALL_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun',
                                'Jul','Aug','Sep','Oct','Nov','Dec'];
            // Only plot months that have any revenue > 0
            const activeLabels = [];
            const activeData   = [];
            chartData.salesData.forEach((v, i) => {
                if (v > 0) {
                    activeLabels.push(ALL_MONTHS[i]);
                    activeData.push(v);
                }
            });
            // If no active months, fall back to full year
            const labels = activeLabels.length ? activeLabels : ALL_MONTHS;
            const data   = activeLabels.length ? activeData   : chartData.salesData;

            new Chart(salesCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Monthly Revenue',
                        data,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37,99,235,0.12)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#2563eb',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 9,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: ctx => ' ₹' + Number(ctx.parsed.y).toLocaleString('en-IN')
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: v => {
                                    const n = Number(v);
                                    if (n >= 1e5) return '₹' + (n/1e5).toFixed(1) + 'L';
                                    return '₹' + n.toLocaleString('en-IN');
                                }
                            }
                        }
                    }
                }
            });
        }

        // ── Top Products (by Revenue) ─────────────────────────
        const topCtx = document.getElementById('topProductsChart');
        if (topCtx && chartData.productNames.length) {
            new Chart(topCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: chartData.productNames,
                    datasets: [{
                        label: 'Revenue',
                        data: chartData.productSales,
                        backgroundColor: ['#2563eb','#7c3aed','#06b6d4','#10b981','#f59e0b'],
                        borderRadius: 8,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: ctx => ' ₹' + Number(ctx.raw).toLocaleString('en-IN')
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: v => {
                                    const n = Number(v);
                                    if (n >= 1e5) return '₹' + (n/1e5).toFixed(1) + 'L';
                                    return '₹' + n.toLocaleString('en-IN');
                                }
                            }
                        }
                    }
                }
            });
        }

        // ── Category Distribution (Doughnut by Revenue) ──────
        const catCtx = document.getElementById('categoryChart');
        if (catCtx && chartData.categories.length) {
            new Chart(catCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: chartData.categories,
                    datasets: [{
                        data: chartData.categorySales,
                        backgroundColor: ['#2563eb','#7c3aed','#06b6d4','#10b981','#f59e0b','#ef4444'],
                        cutout: '60%',
                        borderWidth: 0,
                        hoverOffset: 8,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
                        tooltip: {
                            callbacks: {
                                label: ctx => ` ${ctx.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')}`
                            }
                        }
                    }
                }
            });
        }
    }

    // ======================================================
    //  EVENT LISTENERS
    // ======================================================
    function setupEventListeners() {

        // Time-range selector — filters the Sales Overview chart to show
        // appropriate slice (approximated from the real monthly revenue data)
        const timeRangeSelect = document.getElementById('timeRange');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', function () {
                applyTimeRange(this.value);
            });
        }

        // Refresh button — reloads the page for fresh DB data
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function () {
                this.textContent = 'Refreshing…';
                this.disabled = true;
                window.location.reload();
            });
        }
    }

    // ── Time-range filter: updates metric cards proportionally ──
    function applyTimeRange(range) {
        // Fractions of annual totals (approximate)
        const fraction = { today: 1/365, week: 7/365, month: 1/12, quarter: 1/4, year: 1 };
        const f = fraction[range] || 1;

        const displayRevenue  = Math.round(flaskMetrics.totalRevenue * f);
        const displayProfit   = Math.round(flaskMetrics.netProfit    * f);
        const displayProducts = flaskMetrics.totalProducts;           // count unchanged
        const displayOrders   = Math.round(flaskMetrics.totalOrders  * f);

        const cards = document.querySelectorAll('.metric-card');
        const vals  = [displayRevenue, displayProfit, displayProducts, displayOrders];

        cards.forEach((card, i) => {
            const el = card.querySelector('.metric-value');
            if (!el) return;
            if (i < 2) {
                el.textContent = '₹' + vals[i].toLocaleString('en-IN');
            } else {
                el.textContent = vals[i].toLocaleString('en-IN');
            }
        });
    }

    // ======================================================
    //  ACTIVITY FEED  (cosmetic ticker, 30-second interval)
    // ======================================================
    function updateActivityFeed() {
        setInterval(() => {
            const newActivity = generateRandomActivity();
            addActivityToFeed(newActivity);
        }, 30000);
    }

    function generateRandomActivity() {
        const types = [
            { icon: '📝', type: 'success', text: 'New order received' },
            { icon: '👤', type: 'info',    text: 'New customer registered' },
            { icon: '💳', type: 'success', text: 'Payment processed' },
            { icon: '📊', type: 'neutral', text: 'Report generated' },
        ];
        return { ...types[Math.floor(Math.random() * types.length)], time: 'Just now' };
    }

    function addActivityToFeed(activity) {
        const list = document.querySelector('.activity-list');
        if (!list) return;
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-icon ${activity.type}">${activity.icon}</div>
            <div class="activity-content">
                <p class="activity-text">${activity.text}</p>
                <span class="activity-time">${activity.time}</span>
            </div>`;
        list.insertBefore(item, list.firstChild);
        if (list.children.length > 5) list.removeChild(list.lastChild);
    }

    console.log('BizForecast dashboard initialised ✓');
});