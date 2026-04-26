'use strict';
// reports.js — dropdown-driven PDF / CSV / JSON generator

// ─────────────────────────────────────────────────────────────
//  Report descriptions (shown beneath the dropdowns)
// ─────────────────────────────────────────────────────────────
const DESCRIPTIONS = {
    business_summary    : '📋 All metrics in one place — revenue, profit, margins, top products, monthly trends, demand breakdown and key business insights.',
    product_performance : '📦 Every product ranked by revenue, showing cost price, selling price, total revenue, total cost, profit and margin %.',
    profit_loss         : '💰 Profit & loss per product sorted by profit — includes status (Profit / Break Even / Loss) and overall P&L summary.',
    sales_summary       : '📈 Month-by-month revenue and units sold, plus a top-10 products table ranked by revenue.',
    demand_analysis     : '🎯 Products sorted by demand level (High → Medium → Low) with restock recommendations for each.',
};

// ─────────────────────────────────────────────────────────────
//  Wire up dropdowns on page load
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    const typeEl   = document.getElementById('reportType');
    const descEl   = document.getElementById('reportDesc');

    function updateDesc() {
        const type = typeEl ? typeEl.value : 'business_summary';
        const d    = DESCRIPTIONS[type] || '';
        if (descEl) {
            descEl.querySelector('.desc-text').textContent = d.replace(/^[^\s]+ /, '');
            descEl.querySelector('.desc-icon').textContent = d.charAt(0);
        }
    }

    if (typeEl) typeEl.addEventListener('change', updateDesc);
    updateDesc();
});

// ─────────────────────────────────────────────────────────────
//  Main trigger — called by the Download button
// ─────────────────────────────────────────────────────────────
function triggerDownload() {
    const reportType = document.getElementById('reportType').value;
    const format     = document.getElementById('reportFormat').value;
    const btn        = document.getElementById('downloadBtn');

    setLoading(btn, true);

    setTimeout(function () {
        try {
            switch (format) {
                case 'pdf':  generatePDF(reportType);  break;
                case 'csv':  generateCSV(reportType);  break;
                case 'json': generateJSON(reportType); break;
                default: throw new Error('Unknown format: ' + format);
            }
            showToast('✅ ' + LABEL[reportType] + ' downloaded as ' + format.toUpperCase());
        } catch (e) {
            console.error('Download error:', e);
            showToast('❌ Download failed — check console', 'error');
        }
        setLoading(btn, false);
    }, 80);
}

// ─────────────────────────────────────────────────────────────
//  Labels
// ─────────────────────────────────────────────────────────────
const LABEL = {
    business_summary    : 'Full Business Summary',
    product_performance : 'Product Performance',
    profit_loss         : 'Profit & Loss',
    sales_summary       : 'Sales Summary',
    demand_analysis     : 'Demand Analysis',
};

// ─────────────────────────────────────────────────────────────
//  Utilities
// ─────────────────────────────────────────────────────────────
function showToast(msg, type) {
    type = type || 'success';
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast ' + type + ' show';
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.className = 'toast'; }, 3500);
}

function setLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
        btn.dataset.orig = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Generating…';
        btn.disabled = true;
    } else {
        btn.innerHTML = btn.dataset.orig || btn.innerHTML;
        btn.disabled = false;
    }
}

function triggerBrowserDownload(content, fname, mime) {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = fname;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
}

function makeFilename(type, ext) {
    return 'bizforecast-' + type.replace(/_/g, '-') + '-' + new Date().toISOString().slice(0, 10) + '.' + ext;
}

function today() {
    return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function inr(n) {
    n = Number(n);
    if (isNaN(n)) return '-';
    if (n >= 1e7) return 'Rs.' + (n / 1e7).toFixed(2) + ' Cr';
    if (n >= 1e5) return 'Rs.' + (n / 1e5).toFixed(2) + ' L';
    return 'Rs.' + Math.round(n).toLocaleString('en-IN');
}

// ─────────────────────────────────────────────────────────────
//  JSON
// ─────────────────────────────────────────────────────────────
function generateJSON(type) {
    triggerBrowserDownload(
        JSON.stringify(buildPayload(type), null, 2),
        makeFilename(type, 'json'),
        'application/json'
    );
}

// ─────────────────────────────────────────────────────────────
//  CSV
// ─────────────────────────────────────────────────────────────
function generateCSV(type) {
    const { headers, rows } = buildTableData(type);
    const esc = function (v) {
        const s = String(v == null ? '' : v);
        return (s.includes(',') || s.includes('"') || s.includes('\n'))
            ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [headers.map(esc).join(',')].concat(rows.map(function (r) { return r.map(esc).join(','); }));
    triggerBrowserDownload(lines.join('\r\n'), makeFilename(type, 'csv'), 'text/csv');
}

// ─────────────────────────────────────────────────────────────
//  PDF
// ─────────────────────────────────────────────────────────────
function generatePDF(type) {
    if (!window.jspdf) throw new Error('jsPDF not loaded');
    const { jsPDF } = window.jspdf;

    if (type === 'business_summary') {
        generateBusinessSummaryPDF(jsPDF);
        return;
    }

    const doc      = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W        = doc.internal.pageSize.getWidth();
    const titleStr = LABEL[type];
    const meta     = REPORT_DATA.meta;

    // Header
    doc.setFillColor(10, 15, 30);
    doc.rect(0, 0, W, 22, 'F');
    doc.setTextColor(6, 182, 212);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('BizForecast', 10, 14);
    doc.setTextColor(200, 210, 230);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text(titleStr, 62, 14);
    doc.setTextColor(120, 140, 170);
    doc.setFontSize(8);
    doc.text('Generated: ' + today(), W - 10, 14, { align: 'right' });

    // Summary bar
    doc.setFillColor(16, 22, 40);
    doc.rect(0, 22, W, 16, 'F');
    var items = [
        ['Total Revenue', meta.total_revenue],
        ['Net Profit',    meta.total_profit],
        ['Margin',        meta.overall_margin + '%'],
        ['Products',      meta.total_products],
        ['Units Sold',    meta.total_units],
    ];
    var cw = W / items.length;
    items.forEach(function (item, i) {
        var x = i * cw + cw / 2;
        doc.setTextColor(120, 140, 170); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.text(item[0], x, 29, { align: 'center' });
        doc.setTextColor(200, 210, 230); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text(String(item[1]), x, 35, { align: 'center' });
    });

    // Table
    var td = buildTableData(type);
    doc.autoTable({
        head: [td.headers], body: td.rows, startY: 42,
        styles: { fontSize: 8, cellPadding: 3, textColor: [200, 210, 230], fillColor: [14, 20, 38], lineColor: [30, 40, 65], lineWidth: 0.2 },
        headStyles: { fillColor: [20, 28, 52], textColor: [6, 182, 212], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [18, 25, 45] },
        columnStyles: buildColumnStyles(type),
        margin: { left: 8, right: 8 },
    });

    pdfFooter(doc, titleStr);
    doc.save(makeFilename(type, 'pdf'));
}

// ─────────────────────────────────────────────────────────────
//  FULL BUSINESS SUMMARY PDF  (multi-section)
// ─────────────────────────────────────────────────────────────
function generateBusinessSummaryPDF(jsPDF) {
    var doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var W    = doc.internal.pageSize.getWidth();
    var meta = REPORT_DATA.meta;
    var prods = REPORT_DATA.products;
    var monthly = REPORT_DATA.monthly;
    var MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // ── Cover header ──
    doc.setFillColor(10, 15, 30);
    doc.rect(0, 0, W, 36, 'F');
    doc.setTextColor(6, 182, 212);
    doc.setFontSize(22); doc.setFont('helvetica', 'bold');
    doc.text('BizForecast', 14, 16);
    doc.setTextColor(200, 210, 230);
    doc.setFontSize(13); doc.setFont('helvetica', 'normal');
    doc.text('Full Business Summary Report', 14, 27);
    doc.setTextColor(100, 130, 160);
    doc.setFontSize(9);
    doc.text('Generated: ' + today(), W - 12, 27, { align: 'right' });

    var y = 46;

    // ── Section helper ──
    function sectionTitle(title, yPos) {
        doc.setFillColor(20, 28, 52);
        doc.rect(10, yPos, W - 20, 9, 'F');
        doc.setTextColor(6, 182, 212);
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text(title, 14, yPos + 6.2);
        return yPos + 14;
    }

    function checkPageBreak(needed) {
        if (y + needed > doc.internal.pageSize.getHeight() - 16) {
            doc.addPage();
            y = 16;
        }
    }

    // ── 1. Key Metrics ──
    y = sectionTitle('1. KEY METRICS', y);
    var kv = [
        ['Total Revenue',    meta.total_revenue],
        ['Total Cost',       meta.total_cost],
        ['Net Profit',       meta.total_profit],
        ['Overall Margin',   meta.overall_margin + '%'],
        ['Total Products',   String(meta.total_products)],
        ['Total Units Sold', String(meta.total_units)],
        ['Profitable Products', String(meta.pl_profit)],
        ['Loss-Making Products', String(meta.pl_loss)],
        ['High Demand Products', String(meta.high_demand)],
        ['Low Demand Products',  String(meta.low_demand)],
    ];
    var col = 2, colW = (W - 20) / col;
    kv.forEach(function (item, i) {
        var cx = 10 + (i % col) * colW;
        var cy = y + Math.floor(i / col) * 11;
        doc.setFillColor(16, 22, 40);
        doc.rect(cx, cy, colW - 2, 9, 'F');
        doc.setTextColor(120, 140, 170); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.text(item[0], cx + 4, cy + 3.5);
        doc.setTextColor(200, 210, 230); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text(String(item[1]), cx + 4, cy + 7.5);
    });
    y += Math.ceil(kv.length / col) * 11 + 10;

    // ── 2. Product Performance ──
    checkPageBreak(60);
    y = sectionTitle('2. PRODUCT PERFORMANCE (ranked by revenue)', y);
    var ppRows = prods.slice().sort(function (a, b) { return b.revenue - a.revenue; }).map(function (p) {
        return [p.name, p.category, inr(p.cost_price), inr(p.selling_price), p.quantity_sold, p.month, inr(p.revenue), inr(p.profit), p.margin.toFixed(1) + '%', p.demand_level];
    });
    doc.autoTable({
        head: [['Product','Category','Cost','Price','Qty','Month','Revenue','Profit','Margin','Demand']],
        body: ppRows,
        startY: y,
        styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [200,210,230], fillColor: [14,20,38], lineColor: [30,40,65], lineWidth: 0.15 },
        headStyles: { fillColor: [20,28,52], textColor: [6,182,212], fontStyle: 'bold', fontSize: 7.5 },
        alternateRowStyles: { fillColor: [18,25,45] },
        columnStyles: { 6:{halign:'right'}, 7:{halign:'right'}, 8:{halign:'right'} },
        margin: { left: 10, right: 10 },
    });
    y = doc.lastAutoTable.finalY + 10;

    // ── 3. Profit & Loss ──
    checkPageBreak(50);
    y = sectionTitle('3. PROFIT & LOSS STATEMENT', y);
    var plRows = prods.slice().sort(function (a, b) { return b.profit - a.profit; }).map(function (p) {
        return [p.name, p.category, inr(p.revenue), inr(p.cost), inr(p.profit), p.margin.toFixed(1) + '%', p.profit > 0 ? 'Profit' : p.profit < 0 ? 'Loss' : 'Break Even'];
    });
    doc.autoTable({
        head: [['Product','Category','Revenue','Cost','Profit/Loss','Margin %','Status']],
        body: plRows,
        startY: y,
        styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [200,210,230], fillColor: [14,20,38], lineColor: [30,40,65], lineWidth: 0.15 },
        headStyles: { fillColor: [20,28,52], textColor: [6,182,212], fontStyle: 'bold', fontSize: 7.5 },
        alternateRowStyles: { fillColor: [18,25,45] },
        columnStyles: { 2:{halign:'right'}, 3:{halign:'right'}, 4:{halign:'right'}, 5:{halign:'right'} },
        margin: { left: 10, right: 10 },
    });
    y = doc.lastAutoTable.finalY + 10;

    // ── 4. Monthly Sales Summary ──
    checkPageBreak(50);
    y = sectionTitle('4. MONTHLY SALES SUMMARY', y);
    var mRows = Object.entries(monthly)
        .sort(function (a, b) { return MO.indexOf(a[0]) - MO.indexOf(b[0]); })
        .map(function (e) { return [e[0], inr(e[1].revenue), e[1].units]; });
    doc.autoTable({
        head: [['Month', 'Revenue', 'Units Sold']],
        body: mRows,
        startY: y,
        styles: { fontSize: 8, cellPadding: 3, textColor: [200,210,230], fillColor: [14,20,38], lineColor: [30,40,65], lineWidth: 0.15 },
        headStyles: { fillColor: [20,28,52], textColor: [6,182,212], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [18,25,45] },
        columnStyles: { 1:{halign:'right'}, 2:{halign:'right'} },
        margin: { left: 10, right: 10 },
    });
    y = doc.lastAutoTable.finalY + 10;

    // ── 5. Demand Analysis ──
    checkPageBreak(50);
    y = sectionTitle('5. DEMAND ANALYSIS', y);
    var order = { High: 0, Medium: 1, Low: 2 };
    var daRows = prods.slice()
        .sort(function (a, b) { return (order[a.demand_level] || 3) - (order[b.demand_level] || 3); })
        .map(function (p) {
            return [p.name, p.category, p.demand_level, p.quantity_sold, inr(p.revenue),
                p.demand_level === 'High'  ? 'Increase stock'
                : p.demand_level === 'Low' ? 'Reduce / promote'
                :                            'Maintain levels'];
        });
    doc.autoTable({
        head: [['Product','Category','Demand','Qty','Revenue','Recommendation']],
        body: daRows,
        startY: y,
        styles: { fontSize: 8, cellPadding: 3, textColor: [200,210,230], fillColor: [14,20,38], lineColor: [30,40,65], lineWidth: 0.15 },
        headStyles: { fillColor: [20,28,52], textColor: [6,182,212], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [18,25,45] },
        columnStyles: { 3:{halign:'right'}, 4:{halign:'right'} },
        margin: { left: 10, right: 10 },
    });
    y = doc.lastAutoTable.finalY + 10;

    // ── 6. Key Insights ──
    checkPageBreak(40);
    y = sectionTitle('6. KEY INSIGHTS', y);
    var topProd = prods.slice().sort(function (a, b) { return b.revenue - a.revenue; })[0];
    var topMarg = prods.slice().sort(function (a, b) { return b.margin - a.margin; })[0];
    var insights = [
        'Top Revenue Product: ' + topProd.name + ' (' + inr(topProd.revenue) + ' — ' + topProd.category + ')',
        'Highest Margin Product: ' + topMarg.name + ' (' + topMarg.margin.toFixed(1) + '% margin)',
        'Overall Business Margin: ' + meta.overall_margin + '% — ' + (meta.overall_margin >= 30 ? 'Excellent (above 30% benchmark)' : meta.overall_margin >= 20 ? 'Healthy (above 20% benchmark)' : 'Below 20% — review pricing'),
        'Profitable Products: ' + meta.pl_profit + ' of ' + meta.total_products + ' products are profit-making',
        'High Demand Products: ' + meta.high_demand + ' products with High demand — prioritise stock',
        'Total Units Sold: ' + meta.total_units + ' units across ' + meta.total_products + ' products',
    ];
    insights.forEach(function (ins, i) {
        doc.setFillColor(16, 22, 40);
        doc.rect(10, y + i * 10, W - 20, 8.5, 'F');
        doc.setTextColor(6, 182, 212); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.text('•', 14, y + i * 10 + 5.5);
        doc.setTextColor(200, 210, 230); doc.setFont('helvetica', 'normal');
        doc.text(ins, 18, y + i * 10 + 5.5);
    });

    pdfFooter(doc, 'Full Business Summary');
    doc.save(makeFilename('business_summary', 'pdf'));
}

function pdfFooter(doc, titleStr) {
    var pageCount = doc.internal.getNumberOfPages();
    var W = doc.internal.pageSize.getWidth();
    for (var i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        var pH = doc.internal.pageSize.getHeight();
        doc.setFillColor(10, 15, 30);
        doc.rect(0, pH - 8, W, 8, 'F');
        doc.setTextColor(80, 100, 130);
        doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.text('BizForecast  ·  ' + titleStr + '  ·  Page ' + i + ' of ' + pageCount, W / 2, pH - 2, { align: 'center' });
    }
}

// ─────────────────────────────────────────────────────────────
//  DATA BUILDERS
// ─────────────────────────────────────────────────────────────
function buildPayload(type) {
    var meta  = REPORT_DATA.meta;
    var prods = REPORT_DATA.products;
    var MO    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    switch (type) {
        case 'business_summary':
            return {
                report    : 'Full Business Summary',
                generated : today(),
                key_metrics: meta,
                products  : prods.slice().sort(function (a, b) { return b.revenue - a.revenue; }),
                monthly   : REPORT_DATA.monthly,
                top_products: prods.slice().sort(function (a, b) { return b.revenue - a.revenue; }).slice(0, 5),
                insights  : {
                    top_revenue_product : prods.slice().sort(function (a, b) { return b.revenue - a.revenue; })[0].name,
                    top_margin_product  : prods.slice().sort(function (a, b) { return b.margin - a.margin; })[0].name,
                    profitable_count    : meta.pl_profit,
                    high_demand_count   : meta.high_demand,
                },
            };
        case 'product_performance':
            return {
                report: 'Product Performance', generated: today(), summary: meta,
                products: prods.slice().sort(function (a, b) { return b.revenue - a.revenue; }).map(function (p) {
                    return { name: p.name, category: p.category, cost_price: p.cost_price, selling_price: p.selling_price,
                             quantity_sold: p.quantity_sold, month: p.month, total_revenue: p.revenue,
                             total_cost: p.cost, profit: p.profit, margin_pct: p.margin, demand_level: p.demand_level };
                }),
            };
        case 'profit_loss':
            return {
                report: 'Profit & Loss Statement', generated: today(),
                summary: { total_revenue: meta.total_revenue, total_cost: meta.total_cost, net_profit: meta.total_profit, overall_margin: meta.overall_margin + '%', profitable: meta.pl_profit, loss_making: meta.pl_loss },
                products: prods.slice().sort(function (a, b) { return b.profit - a.profit; }).map(function (p) {
                    return { name: p.name, category: p.category, revenue: p.revenue, cost: p.cost, profit: p.profit, margin_pct: p.margin, status: p.profit > 0 ? 'Profit' : p.profit < 0 ? 'Loss' : 'Break Even' };
                }),
            };
        case 'sales_summary':
            return {
                report: 'Sales Summary', generated: today(), monthly: REPORT_DATA.monthly,
                top_products: prods.slice().sort(function (a, b) { return b.revenue - a.revenue; }).slice(0, 10).map(function (p) { return { name: p.name, revenue: p.revenue, qty: p.quantity_sold }; }),
                summary: meta,
            };
        case 'demand_analysis':
            return {
                report: 'Demand Analysis', generated: today(),
                summary: { high: meta.high_demand, medium: meta.medium_demand, low: meta.low_demand },
                products: prods.map(function (p) {
                    return { name: p.name, category: p.category, demand_level: p.demand_level, qty: p.quantity_sold, revenue: p.revenue,
                             recommendation: p.demand_level === 'High' ? 'Increase stock' : p.demand_level === 'Low' ? 'Reduce / promote' : 'Maintain levels' };
                }),
            };
        default: return {};
    }
}

function buildTableData(type) {
    var prods = REPORT_DATA.products;
    var MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    switch (type) {
        case 'business_summary':
        case 'product_performance':
            return {
                headers: ['Product','Category','Cost','Price','Qty','Month','Revenue','Cost Total','Profit','Margin %'],
                rows: prods.slice().sort(function (a, b) { return b.revenue - a.revenue; }).map(function (p) {
                    return [p.name, p.category, inr(p.cost_price), inr(p.selling_price), p.quantity_sold, p.month, inr(p.revenue), inr(p.cost), inr(p.profit), p.margin.toFixed(1) + '%'];
                }),
            };
        case 'profit_loss':
            return {
                headers: ['Product','Category','Revenue','Total Cost','Profit/Loss','Margin %','Status'],
                rows: prods.slice().sort(function (a, b) { return b.profit - a.profit; }).map(function (p) {
                    return [p.name, p.category, inr(p.revenue), inr(p.cost), inr(p.profit), p.margin.toFixed(1) + '%', p.profit > 0 ? 'Profit' : p.profit < 0 ? 'Loss' : 'Break Even'];
                }),
            };
        case 'sales_summary': {
            var mRows = Object.entries(REPORT_DATA.monthly)
                .sort(function (a, b) { return MO.indexOf(a[0]) - MO.indexOf(b[0]); })
                .map(function (e) { return [e[0], inr(e[1].revenue), e[1].units]; });
            return { headers: ['Month','Revenue','Units Sold'], rows: mRows };
        }
        case 'demand_analysis': {
            var ord = { High: 0, Medium: 1, Low: 2 };
            return {
                headers: ['Product','Category','Demand','Qty','Revenue','Recommendation'],
                rows: prods.slice().sort(function (a, b) { return (ord[a.demand_level] || 3) - (ord[b.demand_level] || 3); }).map(function (p) {
                    return [p.name, p.category, p.demand_level, p.quantity_sold, inr(p.revenue),
                        p.demand_level === 'High' ? 'Increase stock' : p.demand_level === 'Low' ? 'Reduce / promote' : 'Maintain levels'];
                }),
            };
        }
        default: return { headers: [], rows: [] };
    }
}

function buildColumnStyles(type) {
    if (type === 'product_performance' || type === 'business_summary')
        return { 6:{halign:'right'}, 7:{halign:'right'}, 8:{halign:'right'}, 9:{halign:'right'} };
    if (type === 'profit_loss')
        return { 2:{halign:'right'}, 3:{halign:'right'}, 4:{halign:'right'}, 5:{halign:'right'} };
    if (type === 'sales_summary')
        return { 1:{halign:'right'}, 2:{halign:'right'} };
    if (type === 'demand_analysis')
        return { 3:{halign:'right'}, 4:{halign:'right'} };
    return {};
}