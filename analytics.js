/* analytics.js — all data pre-computed by app.py and passed as window.A */
'use strict';

Chart.defaults.color       = 'rgba(200,210,230,0.75)';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';

const GRID = 'rgba(255,255,255,0.05)';

const yFmt = v => {
    const n = Number(v);
    if (n >= 1e7) return '₹' + (n / 1e7).toFixed(1) + 'Cr';
    if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + 'L';
    if (n >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'K';
    return '₹' + n.toLocaleString('en-IN');
};

const rupTip = {
    callbacks: {
        label: c => ' ₹' + Number(c.raw || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
    }
};

document.addEventListener('DOMContentLoaded', function () {

    // Guard: A must be defined
    if (typeof A === 'undefined') {
        console.error('Analytics data (A) not found.');
        return;
    }

    // ── 1. Monthly Revenue Trend ──────────────────────────────
    const salesTrendEl = document.getElementById('salesTrendChart');
    if (salesTrendEl && A.trend_months && A.trend_months.length) {
        new Chart(salesTrendEl, {
            type: 'line',
            data: {
                labels: A.trend_months,
                datasets: [{
                    label: 'Revenue',
                    data: A.trend_revenue,
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6,182,212,0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2.5,
                    pointRadius: 5,
                    pointBackgroundColor: '#06b6d4',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: rupTip },
                scales: {
                    x: { grid: { color: GRID } },
                    y: { grid: { color: GRID }, beginAtZero: true, ticks: { callback: yFmt } }
                }
            }
        });
    }


    // ── 2. Profit vs Loss Doughnut ────────────────────────────
    const plEl = document.getElementById('profitLossChart');
    if (plEl) {
        const total = A.pl_profit + A.pl_breakeven + A.pl_loss;
        new Chart(plEl, {
            type: 'doughnut',
            data: {
                labels: ['Profit Making', 'Break Even', 'Loss Making'],
                datasets: [{
                    data: [A.pl_profit, A.pl_breakeven, A.pl_loss],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 0,
                    hoverOffset: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } },
                    tooltip: {
                        callbacks: {
                            label: c => {
                                const pct = total ? ((c.raw / total) * 100).toFixed(1) : 0;
                                return ` ${c.label}: ${c.raw} product(s) (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }


    // ── 3. Cost vs Revenue per Product (grouped bar) ──────────
    const crEl = document.getElementById('costRevenueChart');
    if (crEl && A.cr_products && A.cr_products.length) {
        new Chart(crEl, {
            type: 'bar',
            data: {
                labels: A.cr_products,
                datasets: [
                    {
                        label: 'Total Cost',
                        data: A.cr_cost,
                        backgroundColor: 'rgba(239,68,68,0.75)',
                        borderRadius: 4,
                    },
                    {
                        label: 'Total Revenue',
                        data: A.cr_revenue,
                        backgroundColor: 'rgba(16,185,129,0.75)',
                        borderRadius: 4,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { boxWidth: 12 } }, tooltip: rupTip },
                scales: {
                    x: { grid: { display: false }, ticks: { maxRotation: 35 } },
                    y: { grid: { color: GRID }, beginAtZero: true, ticks: { callback: yFmt } }
                }
            }
        });
    }


    // ── 4. Quantity Sold Histogram ────────────────────────────
    const histEl = document.getElementById('salesHistogram');
    if (histEl && A.hist_labels && A.hist_labels.length) {
        new Chart(histEl, {
            type: 'bar',
            data: {
                labels: A.hist_labels,
                datasets: [{
                    label: 'Products in Range',
                    data: A.hist_counts,
                    backgroundColor: 'rgba(139,92,246,0.75)',
                    borderRadius: 5,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: c => ` ${c.raw} product(s) in this range` } }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        title: { display: true, text: 'Units Sold Range', color: 'rgba(200,210,230,0.6)' }
                    },
                    y: {
                        grid: { color: GRID },
                        beginAtZero: true,
                        ticks: { stepSize: 1, precision: 0 }
                    }
                }
            }
        });
    }


    // ── 5. Category Revenue Pie ───────────────────────────────
    const catEl = document.getElementById('categoryChart');
    if (catEl && A.cat_names && A.cat_names.length) {
        const catColors = ['#2563eb','#7c3aed','#06b6d4','#10b981','#f59e0b','#ef4444'];
        const totalCatRev = A.cat_revenue.reduce((a, b) => a + b, 0);
        new Chart(catEl, {
            type: 'pie',
            data: {
                labels: A.cat_names,
                datasets: [{
                    data: A.cat_revenue,
                    backgroundColor: catColors.slice(0, A.cat_names.length),
                    borderWidth: 0,
                    hoverOffset: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } },
                    tooltip: {
                        callbacks: {
                            label: c => {
                                const pct = totalCatRev ? ((c.raw / totalCatRev) * 100).toFixed(1) : 0;
                                return ` ${c.label}: ₹${Number(c.raw).toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }


    // ── 6. Top Products by Revenue (vertical bar) ────────────
    const topEl = document.getElementById('topProductsChart');
    if (topEl && A.top_names && A.top_names.length) {
        const palette = ['#06b6d4','#10b981','#8b5cf6','#f59e0b','#ef4444','#2563eb','#ec4899','#14b8a6'];
        new Chart(topEl, {
            type: 'bar',
            data: {
                labels: A.top_names,
                datasets: [{
                    label: 'Revenue',
                    data: A.top_revenue,
                    backgroundColor: A.top_revenue.map((_, i) => palette[i % palette.length]),
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: rupTip },
                scales: {
                    x: { grid: { display: false }, ticks: { maxRotation: 30 } },
                    y: { grid: { color: GRID }, beginAtZero: true, ticks: { callback: yFmt } }
                }
            }
        });
    }


    // ── 7. Profit Margin % per Product (horizontal bar) ───────
    const marginEl = document.getElementById('marginChart');
    if (marginEl && A.margin_names && A.margin_names.length) {
        new Chart(marginEl, {
            type: 'bar',
            data: {
                labels: A.margin_names,
                datasets: [{
                    label: 'Margin %',
                    data: A.margin_vals,
                    backgroundColor: A.margin_vals.map(v =>
                        v >= 30  ? 'rgba(16,185,129,0.85)'  :
                        v >= 15  ? 'rgba(16,185,129,0.60)'  :
                        v >= 0   ? 'rgba(245,158,11,0.75)'  :
                                   'rgba(239,68,68,0.75)'
                    ),
                    borderRadius: 4,
                    borderSkipped: false,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: c => ` Margin: ${Number(c.raw).toFixed(1)}%`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: GRID },
                        ticks: { callback: v => v + '%' },
                        title: {
                            display: true,
                            text: 'Profit Margin %',
                            color: 'rgba(200,210,230,0.6)'
                        }
                    },
                    y: { grid: { display: false } }
                }
            }
        });
    }


    // ── 8. Demand Level Breakdown (grouped bar by category) ───
    const demandEl = document.getElementById('demandChart');
    if (demandEl && A.demand_cats && A.demand_cats.length) {
        const demandColors = { High: '#10b981', Medium: '#f59e0b', Low: '#ef4444' };
        const demandDatasets = A.demand_levels.map(lvl => ({
            label: lvl,
            data: A.demand_cats.map(cat =>
                (A.demand_data[lvl] && A.demand_data[lvl][cat]) ? A.demand_data[lvl][cat] : 0
            ),
            backgroundColor: demandColors[lvl] || '#06b6d4',
            borderRadius: 4,
        }));

        new Chart(demandEl, {
            type: 'bar',
            data: {
                labels: A.demand_cats,
                datasets: demandDatasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { boxWidth: 12 } },
                    tooltip: {
                        callbacks: {
                            label: c => ` ${c.dataset.label}: ${c.raw} product(s)`
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: GRID }, beginAtZero: true, ticks: { stepSize: 1, precision: 0 } }
                }
            }
        });
    }

});