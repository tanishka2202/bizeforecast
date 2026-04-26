/* predictions.js — draws all 6 forecast charts. Data from app.py via window.D */
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
        label: c => {
            if (c.raw === null || c.raw === undefined) return null;
            return ` ${c.dataset.label}: ₹${Number(c.raw).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
        }
    }
};

// Guard
if (typeof D === 'undefined') {
    console.error('Prediction data (D) is not defined.');
}

// ── 1. Revenue Forecast (Historical + Linear Regression) ──────────────────
(function () {
    const el = document.getElementById('chartRevenue');
    if (!el || typeof D === 'undefined') return;

    // Historical line: null for forecast points
    const histLine = D.revenue.map((v, i) => D.is_forecast[i] ? null : v);
    // Forecast line: bridge from last historical point
    const fcLine = D.revenue.map((v, i) => {
        if (!D.is_forecast[i] && i < D.n_hist - 1) return null;
        return v;
    });

    new Chart(el, {
        type: 'line',
        data: {
            labels: D.labels,
            datasets: [
                {
                    label: 'Historical Revenue',
                    data: histLine,
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6,182,212,0.1)',
                    borderWidth: 2.5,
                    pointRadius: 5,
                    pointBackgroundColor: '#06b6d4',
                    tension: 0.4,
                    fill: true,
                    spanGaps: false,
                },
                {
                    label: 'Forecast',
                    data: fcLine,
                    borderColor: '#f59e0b',
                    borderDash: [8, 4],
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointBackgroundColor: '#f59e0b',
                    tension: 0.4,
                    fill: false,
                    spanGaps: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { boxWidth: 13 } },
                tooltip: rupTip,
            },
            scales: {
                x: { grid: { color: GRID } },
                y: { grid: { color: GRID }, beginAtZero: false, ticks: { callback: yFmt } }
            }
        }
    });
}());


// ── 2. Profit / Loss Bar (Historical green, Forecast amber, Losses red) ────
(function () {
    const el = document.getElementById('chartProfit');
    if (!el || typeof D === 'undefined') return;

    new Chart(el, {
        type: 'bar',
        data: {
            labels: D.labels,
            datasets: [{
                label: 'Profit / Loss',
                data: D.profit,
                backgroundColor: D.profit.map((v, i) =>
                    D.is_forecast[i]
                        ? (v >= 0 ? 'rgba(245,158,11,0.65)' : 'rgba(239,68,68,0.45)')
                        : (v >= 0 ? 'rgba(16,185,129,0.80)' : 'rgba(239,68,68,0.80)')
                ),
                borderRadius: 5,
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
                        label: c => {
                            const label = D.is_forecast[c.dataIndex] ? ' Forecast' : ' Actual';
                            return `${label}: ₹${Number(c.raw).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
                        }
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: GRID }, ticks: { callback: yFmt } }
            }
        }
    });
}());


// ── 3. Cost vs Revenue (Full timeline) ────────────────────────────────────
(function () {
    const el = document.getElementById('chartCostRev');
    if (!el || typeof D === 'undefined') return;

    new Chart(el, {
        type: 'line',
        data: {
            labels: D.labels,
            datasets: [
                {
                    label: 'Revenue',
                    data: D.revenue,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.08)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                },
                {
                    label: 'Cost',
                    data: D.cost,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239,68,68,0.06)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { boxWidth: 12 } },
                tooltip: rupTip,
            },
            scales: {
                x: { grid: { color: GRID } },
                y: { grid: { color: GRID }, beginAtZero: false, ticks: { callback: yFmt } }
            }
        }
    });
}());


// ── 4. Seasonality Radar (Historical months only) ─────────────────────────
(function () {
    const el = document.getElementById('chartSeason');
    if (!el || typeof D === 'undefined' || !D.hist_months.length) return;

    new Chart(el, {
        type: 'radar',
        data: {
            labels: D.hist_months,
            datasets: [{
                label: 'Seasonality Index',
                data: D.season_idx,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139,92,246,0.15)',
                borderWidth: 2,
                pointBackgroundColor: '#8b5cf6',
                pointRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: c => ` ${Number(c.raw).toFixed(1)} (100 = avg)`
                    }
                }
            },
            scales: {
                r: {
                    grid: { color: 'rgba(255,255,255,0.07)' },
                    ticks: { display: false },
                    pointLabels: {
                        color: 'rgba(200,210,230,0.8)',
                        font: { size: 11 }
                    }
                }
            }
        }
    });
}());


// ── 5. Profit Margin % by Month (Historical only) ─────────────────────────
(function () {
    const el = document.getElementById('chartMargin');
    if (!el || typeof D === 'undefined' || !D.hist_months.length) return;

    new Chart(el, {
        type: 'line',
        data: {
            labels: D.hist_months,
            datasets: [{
                label: 'Margin %',
                data: D.margins,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245,158,11,0.1)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: D.margins.map(m => m >= 0 ? '#10b981' : '#ef4444'),
            }]
        },
        options: {
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
                x: { grid: { display: false } },
                y: {
                    grid: { color: GRID },
                    ticks: { callback: v => v.toFixed(0) + '%' }
                }
            }
        }
    });
}());


// ── 6. Forecast Confidence Band ───────────────────────────────────────────
(function () {
    const el = document.getElementById('chartConfidence');
    if (!el || typeof D === 'undefined') return;
    if (!D.upper_band || !D.lower_band) return;

    const histLine = D.revenue.map((v, i) => D.is_forecast[i] ? null : v);
    const fcLine   = D.revenue.map((v, i) => {
        if (!D.is_forecast[i] && i < D.n_hist - 1) return null;
        return v;
    });

    const upperData = D.upper_band.map(v => (v === null || v === undefined) ? null : v);
    const lowerData = D.lower_band.map(v => (v === null || v === undefined) ? null : v);

    new Chart(el, {
        type: 'line',
        data: {
            labels: D.labels,
            datasets: [
                // Upper bound (fills down to lower bound)
                {
                    label: 'Upper Bound',
                    data: upperData,
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(245,158,11,0.13)',
                    borderWidth: 0,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: '+1',
                    spanGaps: false,
                },
                // Lower bound (fills up to upper bound)
                {
                    label: 'Lower Bound',
                    data: lowerData,
                    borderColor: 'rgba(245,158,11,0.25)',
                    borderDash: [3, 3],
                    borderWidth: 1,
                    backgroundColor: 'transparent',
                    pointRadius: 0,
                    tension: 0.4,
                    fill: false,
                    spanGaps: false,
                },
                // Historical revenue
                {
                    label: 'Historical Revenue',
                    data: histLine,
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6,182,212,0.07)',
                    borderWidth: 2.5,
                    pointRadius: 5,
                    pointBackgroundColor: '#06b6d4',
                    tension: 0.4,
                    fill: true,
                    spanGaps: false,
                },
                // Forecast centre line
                {
                    label: 'Forecast (Centre)',
                    data: fcLine,
                    borderColor: '#f59e0b',
                    borderDash: [8, 4],
                    borderWidth: 2.5,
                    pointRadius: 5,
                    pointBackgroundColor: '#f59e0b',
                    tension: 0.4,
                    fill: false,
                    spanGaps: false,
                },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    labels: {
                        boxWidth: 13,
                        filter: item => !['Upper Bound', 'Lower Bound'].includes(item.text)
                    }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            if (['Upper Bound', 'Lower Bound'].includes(ctx.dataset.label)) return null;
                            if (ctx.raw === null) return null;
                            return ` ${ctx.dataset.label}: ₹${Number(ctx.raw).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
                        },
                        afterBody: items => {
                            const idx = items[0]?.dataIndex;
                            const upper = D.upper_band[idx];
                            const lower = D.lower_band[idx];
                            if (upper !== null && upper !== undefined) {
                                return [
                                    `  ↑ Upper: ₹${Number(upper).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                                    `  ↓ Lower: ₹${Number(lower).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                                ];
                            }
                            return [];
                        }
                    }
                }
            },
            scales: {
                x: { grid: { color: GRID } },
                y: { grid: { color: GRID }, beginAtZero: false, ticks: { callback: yFmt } }
            }
        }
    });
}());