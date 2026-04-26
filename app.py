from flask import Flask, render_template, request, redirect, url_for, session, flash
import psycopg2
import json
import math

app = Flask(__name__)
app.secret_key = "bizforecast_secret"

# ---------------- DATABASE CONNECTION ----------------
conn = psycopg2.connect(
    database="bizforecast",
    user="postgres",
    password="150105",
    host="localhost",
    port="5432"
)

# ---------------- INDEX ----------------
@app.route('/')
def index():
    return render_template('index.html')

# ---------------- LOGIN ----------------
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email    = request.form.get('email')
        password = request.form.get('password')
        cur = conn.cursor()
        cur.execute("SELECT * FROM public.users WHERE email=%s AND password=%s", (email, password))
        user = cur.fetchone()
        cur.close()
        if user:
            session['uid'] = user[0]
            return redirect(url_for('dashboard'))
        else:
            return render_template("login.html", error="Invalid email or password")
    return render_template("login.html")

# ---------------- SIGNUP ----------------
@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username         = request.form.get('firstName')
        email            = request.form.get('email')
        password         = request.form.get('password')
        confirm_password = request.form.get('confirmPassword')
        if password != confirm_password:
            return "Passwords do not match!"
        try:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO public.users (username, email, password) VALUES (%s, %s, %s)",
                (username, email, password)
            )
            conn.commit()
            cur.close()
        except Exception as e:
            conn.rollback()
            return f"Error: {e}"
        return redirect(url_for('login'))
    return render_template('signup.html')


# ======================================================
#  DASHBOARD
# ======================================================
@app.route('/dashboard')
def dashboard():
    uid = session.get('uid')
    if not uid:
        return redirect(url_for('login'))
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM products WHERE uid=%s", (uid,))
    total_products = cur.fetchone()[0]

    cur.execute("SELECT SUM(quantity_sold) FROM products WHERE uid=%s", (uid,))
    total_demand = cur.fetchone()[0] or 0

    cur.execute("SELECT SUM(selling_price * quantity_sold) FROM products WHERE uid=%s", (uid,))
    total_revenue = float(cur.fetchone()[0] or 0)

    cur.execute(
        "SELECT SUM((selling_price - cost_price) * quantity_sold) FROM products WHERE uid=%s",
        (uid,)
    )
    total_profit = float(cur.fetchone()[0] or 0)

    MONTH_ORDER = {'Jan':1,'Feb':2,'Mar':3,'Apr':4,'May':5,'Jun':6,
                   'Jul':7,'Aug':8,'Sep':9,'Oct':10,'Nov':11,'Dec':12}
    ALL_MONTHS  = ["Jan","Feb","Mar","Apr","May","Jun",
                   "Jul","Aug","Sep","Oct","Nov","Dec"]

    cur.execute(
        "SELECT month, SUM(selling_price * quantity_sold) FROM products WHERE uid=%s GROUP BY month",
        (uid,)
    )
    monthly_rev = {m: 0.0 for m in ALL_MONTHS}
    for row in cur.fetchall():
        if row[0] in monthly_rev:
            monthly_rev[row[0]] = float(row[1])
    sales_data = [round(monthly_rev[m], 2) for m in ALL_MONTHS]

    cur.execute(
        """SELECT product_name, SUM(selling_price * quantity_sold) AS rev
           FROM products WHERE uid=%s
           GROUP BY product_name ORDER BY rev DESC LIMIT 5""",
        (uid,)
    )
    top_products  = cur.fetchall()
    product_names = [r[0] for r in top_products]
    product_sales = [round(float(r[1]), 2) for r in top_products]

    cur.execute(
        """SELECT category, SUM(selling_price * quantity_sold) AS rev
           FROM products WHERE uid=%s GROUP BY category ORDER BY rev DESC""",
        (uid,)
    )
    cat_data       = cur.fetchall()
    categories     = [r[0] for r in cat_data]
    category_sales = [round(float(r[1]), 2) for r in cat_data]

    profit_margin = round((total_profit / total_revenue * 100), 1) if total_revenue else 0.0

    cur.close()
    return render_template(
        "dashboard.html",
        has_data       = (total_products > 0),
        total_products = total_products,
        total_demand   = total_demand,
        total_revenue  = round(total_revenue, 2),
        total_profit   = round(total_profit, 2),
        profit_margin  = profit_margin,
        sales_data     = sales_data,
        product_names  = product_names,
        product_sales  = product_sales,
        categories     = categories,
        category_sales = category_sales,
    )


# ---------------- ADD PRODUCT ----------------
@app.route('/add-product', methods=['GET', 'POST'])
def add_product():
    if request.method == 'POST':
        uid = session['uid']
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO products
               (uid, product_name, category, cost_price, selling_price,
                quantity_sold, month, demand_level)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
            (uid,
             request.form['productName'], request.form['category'],
             request.form['costPrice'],   request.form['sellingPrice'],
             request.form['quantitySold'], request.form['month'],
             request.form['demandLevel'])
        )
        conn.commit()
        cur.close()
        flash(f'"{request.form["productName"]}" added successfully!', 'success')
        return redirect(url_for('add_product'))

    uid = session['uid']
    cur = conn.cursor()
    cur.execute(
        """SELECT pid, uid, product_name, category, cost_price, selling_price,
                  quantity_sold, month, demand_level
           FROM products WHERE uid=%s ORDER BY pid DESC""",
        (uid,)
    )
    products = cur.fetchall()
    cur.close()
    return render_template('add-product.html', products=products)


# ---------------- DELETE PRODUCT ----------------
@app.route('/delete-product/<int:pid>', methods=['POST'])
def delete_product(pid):
    uid = session['uid']
    cur = conn.cursor()
    cur.execute("DELETE FROM products WHERE pid=%s AND uid=%s", (pid, uid))
    conn.commit()
    cur.close()
    flash('Product deleted. Your analytics have been updated.', 'success')
    return redirect(url_for('add_product'))


# ======================================================
#  ANALYTICS ROUTE
# ======================================================
@app.route('/analytics')
def analytics():
    uid = session.get('uid')
    if not uid:
        return redirect(url_for('login'))

    cur = conn.cursor()
    cur.execute(
        """SELECT product_name, category, cost_price, selling_price,
                  quantity_sold, month, demand_level
           FROM products WHERE uid = %s ORDER BY pid""",
        (uid,)
    )
    rows = cur.fetchall()
    cur.close()

    if not rows:
        return render_template('analytics.html', has_data=False)

    MONTH_ORDER = {'Jan':1,'Feb':2,'Mar':3,'Apr':4,'May':5,'Jun':6,
                   'Jul':7,'Aug':8,'Sep':9,'Oct':10,'Nov':11,'Dec':12}

    names      = [r[0] for r in rows]
    categories = [r[1] for r in rows]
    cost_p     = [float(r[2]) for r in rows]
    sell_p     = [float(r[3]) for r in rows]
    qty        = [int(r[4])   for r in rows]
    months     = [r[5]        for r in rows]
    demand     = [r[6]        for r in rows]

    total_cost_each    = [c * q for c, q in zip(cost_p, qty)]
    total_revenue_each = [s * q for s, q in zip(sell_p, qty)]
    total_profit_each  = [r - c for r, c in zip(total_revenue_each, total_cost_each)]
    margin_each        = [(p / r * 100) if r else 0.0
                          for p, r in zip(total_profit_each, total_revenue_each)]

    monthly_rev = {}
    for m, rev in zip(months, total_revenue_each):
        monthly_rev[m] = monthly_rev.get(m, 0.0) + rev
    sorted_months = sorted(monthly_rev.keys(), key=lambda x: MONTH_ORDER.get(x, 13))
    trend_months  = sorted_months
    trend_revenue = [round(monthly_rev[m], 2) for m in sorted_months]

    pl_profit    = sum(1 for p in total_profit_each if p > 0)
    pl_loss      = sum(1 for p in total_profit_each if p < 0)
    pl_breakeven = sum(1 for p in total_profit_each if p == 0)

    indexed     = sorted(enumerate(names), key=lambda x: total_revenue_each[x[0]], reverse=True)[:8]
    cr_products = [names[i]                        for i, _ in indexed]
    cr_cost     = [round(total_cost_each[i], 2)    for i, _ in indexed]
    cr_revenue  = [round(total_revenue_each[i], 2) for i, _ in indexed]

    min_q, max_q = min(qty), max(qty)
    n_buckets    = 5
    bucket_size  = max(1, math.ceil((max_q - min_q + 1) / n_buckets))
    hist_counts  = [0] * n_buckets
    hist_labels  = []
    for b in range(n_buckets):
        lo = min_q + b * bucket_size
        hi = lo + bucket_size - 1
        hist_labels.append(f"{lo}-{hi}")
        hist_counts[b] = sum(1 for q_ in qty if lo <= q_ <= hi)

    cat_rev = {}
    for cat, rev in zip(categories, total_revenue_each):
        cat_rev[cat] = cat_rev.get(cat, 0.0) + rev
    cat_names   = list(cat_rev.keys())
    cat_revenue = [round(v, 2) for v in cat_rev.values()]

    top         = sorted(zip(names, total_revenue_each), key=lambda x: x[1], reverse=True)[:8]
    top_names   = [t[0] for t in top]
    top_revenue = [round(t[1], 2) for t in top]

    margin_pairs = sorted(zip(names, margin_each), key=lambda x: x[1], reverse=True)
    margin_names = [p[0] for p in margin_pairs]
    margin_vals  = [round(p[1], 1) for p in margin_pairs]

    demand_cats   = sorted(set(categories))
    demand_levels = ['High', 'Medium', 'Low']
    demand_data   = {lvl: {cat: 0 for cat in demand_cats} for lvl in demand_levels}
    for cat, dlvl in zip(categories, demand):
        if dlvl in demand_data:
            demand_data[dlvl][cat] = demand_data[dlvl].get(cat, 0) + 1

    sorted_qty = sorted(qty)
    n_p        = len(sorted_qty)
    avg_qty    = round(sum(sorted_qty) / n_p, 1)
    mid        = n_p // 2
    median_qty = sorted_qty[mid] if n_p % 2 == 1 else (sorted_qty[mid-1] + sorted_qty[mid]) / 2
    freq       = {}
    for q_ in qty:
        freq[q_] = freq.get(q_, 0) + 1
    mode_qty = max(freq, key=freq.get)
    mean_q   = sum(qty) / n_p
    std_qty  = round(math.sqrt(sum((q_ - mean_q) ** 2 for q_ in qty) / n_p), 1)

    total_rev      = sum(total_revenue_each)
    total_profit   = sum(total_profit_each)
    overall_margin = round((total_profit / total_rev * 100) if total_rev else 0, 1)
    high_demand    = demand.count('High')

    chart_data = json.dumps({
        "trend_months"  : trend_months,
        "trend_revenue" : trend_revenue,
        "pl_profit"     : pl_profit,
        "pl_loss"       : pl_loss,
        "pl_breakeven"  : pl_breakeven,
        "cr_products"   : cr_products,
        "cr_cost"       : cr_cost,
        "cr_revenue"    : cr_revenue,
        "hist_labels"   : hist_labels,
        "hist_counts"   : hist_counts,
        "cat_names"     : cat_names,
        "cat_revenue"   : cat_revenue,
        "top_names"     : top_names,
        "top_revenue"   : top_revenue,
        "margin_names"  : margin_names,
        "margin_vals"   : margin_vals,
        "demand_cats"   : demand_cats,
        "demand_levels" : demand_levels,
        "demand_data"   : demand_data,
    })

    stats = dict(
        avg_qty          = avg_qty,
        median_qty       = int(median_qty),
        mode_qty         = mode_qty,
        std_qty          = std_qty,
        total_products   = n_p,
        total_categories = len(cat_rev),
        overall_margin   = overall_margin,
        total_revenue    = _fmt(total_rev),
        total_profit     = _fmt(total_profit),
        high_demand      = high_demand,
    )

    return render_template('analytics.html',
        has_data   = True,
        chart_data = chart_data,
        stats      = stats,
    )


# ======================================================
#  HELPERS
# ======================================================
def _linear_regression(xs, ys):
    n = len(xs)
    if n < 2:
        return 0.0, float(ys[0]) if ys else 0.0, 0.0
    sx  = sum(xs);  sy  = sum(ys)
    sxy = sum(x * y for x, y in zip(xs, ys))
    sx2 = sum(x * x for x in xs)
    d   = n * sx2 - sx * sx
    if d == 0:
        return 0.0, sy / n, 0.0
    m   = (n * sxy - sx * sy) / d
    b   = (sy - m * sx) / n
    ym  = sy / n
    sst = sum((y - ym) ** 2 for y in ys)
    sse = sum((y - (m * x + b)) ** 2 for x, y in zip(xs, ys))
    r2  = max(0.0, 1 - sse / sst) if sst else 1.0
    return m, b, r2


def _exp_smoothing(values, alpha=0.4):
    if not values:
        return []
    s = [values[0]]
    for v in values[1:]:
        s.append(alpha * v + (1 - alpha) * s[-1])
    return s


def _capped_seasonality(hist_months, hist_rev, all_months, cap_low=0.5, cap_high=1.5):
    avg = sum(hist_rev) / len(hist_rev) if hist_rev else 1.0
    if avg == 0:
        avg = 1.0
    month_vals = {}
    for m, v in zip(hist_months, hist_rev):
        month_vals.setdefault(m, []).append(v)
    result = {}
    for m in all_months:
        if m in month_vals:
            raw = sum(month_vals[m]) / len(month_vals[m]) / avg
            result[m] = min(max(raw, cap_low), cap_high)
        else:
            result[m] = 1.0
    return result


def _fmt(n):
    n = float(n)
    if n >= 1e7:  return f"Rs.{n / 1e7:.2f} Cr"
    if n >= 1e5:  return f"Rs.{n / 1e5:.2f} L"
    if n < 0:     return f"Rs.{int(n):,}"
    return f"Rs.{int(n):,}"


# ======================================================
#  PREDICTIONS ROUTE
# ======================================================
@app.route('/predictions')
def predictions():
    uid = session.get('uid')
    if not uid:
        return redirect(url_for('login'))

    cur = conn.cursor()

    MONTH_ORDER = {'Jan':1,'Feb':2,'Mar':3,'Apr':4,'May':5,'Jun':6,
                   'Jul':7,'Aug':8,'Sep':9,'Oct':10,'Nov':11,'Dec':12}
    ALL_MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun',
                   'Jul','Aug','Sep','Oct','Nov','Dec']

    cur.execute(
        """SELECT month,
                  SUM(selling_price * quantity_sold) AS revenue,
                  SUM(cost_price    * quantity_sold) AS cost
           FROM products WHERE uid = %s GROUP BY month""",
        (uid,)
    )
    rows = sorted(cur.fetchall(), key=lambda x: MONTH_ORDER.get(x[0], 13))
    cur.close()

    if not rows:
        return render_template("predictions.html", has_data=False)

    hist_months = [r[0]        for r in rows]
    hist_rev    = [float(r[1]) for r in rows]
    hist_cost   = [float(r[2]) for r in rows]
    hist_profit = [r - c for r, c in zip(hist_rev, hist_cost)]
    n           = len(hist_months)

    xs = list(range(1, n + 1))
    rev_m, rev_b, r2 = _linear_regression(xs, hist_rev)

    smoothed  = _exp_smoothing(hist_rev, alpha=0.4)
    last_s    = smoothed[-1]
    es_growth = (smoothed[-1] / smoothed[-2]) \
                if (len(smoothed) >= 2 and smoothed[-2] != 0) else 1.0
    # Clamp es_growth so exponential smoothing doesn't collapse to zero
    es_growth = max(0.85, min(es_growth, 1.20))

    season_map = _capped_seasonality(hist_months, hist_rev, ALL_MONTHS,
                                      cap_low=0.5, cap_high=1.5)

    total_hist_rev     = sum(hist_rev)
    total_hist_profit  = sum(hist_profit)
    overall_margin_pct = (total_hist_profit / total_hist_rev * 100) \
                          if total_hist_rev else 0.0

    last_idx = MONTH_ORDER.get(hist_months[-1], 12)
    f_months = [ALL_MONTHS[(last_idx - 1 + i) % 12] for i in range(1, 7)]

    f_rev    = []
    f_profit = []
    f_cost   = []

    for i in range(1, 7):
        lr_val   = rev_m * (n + i) + rev_b
        es_val   = max(0.0, last_s * (es_growth ** i))
        # If LR predicts negative/zero, fall back entirely to ES;
        # otherwise blend normally but never let LR drag below zero.
        lr_clamped = max(0.0, lr_val)
        if lr_val <= 0:
            blended = es_val
        else:
            blended = 0.60 * lr_clamped + 0.40 * es_val
        s_factor = season_map.get(f_months[i - 1], 1.0)
        frev     = max(0.0, blended * s_factor)
        fprofit  = frev * overall_margin_pct / 100.0
        fcost    = frev - fprofit
        f_rev.append(round(frev, 2))
        f_profit.append(round(fprofit, 2))
        f_cost.append(round(fcost, 2))

    if n >= 2:
        residuals   = [hist_rev[i] - (rev_m * xs[i] + rev_b) for i in range(n)]
        residual_sd = math.sqrt(sum(r ** 2 for r in residuals) / n)
    else:
        residual_sd = hist_rev[0] * 0.15 if hist_rev else 0.0

    f_upper = [round(v + residual_sd * (1.0 + 0.15 * i), 2) for i, v in enumerate(f_rev)]
    f_lower = [round(max(0.0, v - residual_sd * (1.0 + 0.15 * i)), 2) for i, v in enumerate(f_rev)]

    avg_rev  = total_hist_rev / n
    peak_i   = hist_rev.index(max(hist_rev))
    weak_i   = hist_rev.index(min(hist_rev))

    hist_margins = [round((p / r * 100), 1) if r else 0.0
                    for p, r in zip(hist_profit, hist_rev)]
    season_chart = [round(season_map.get(m, 1.0) * 100, 1) for m in hist_months]

    insights = []
    trend_pct = (rev_m / avg_rev * 100) if avg_rev else 0
    if rev_m > 0:
        insights.append(dict(badge="positive", label="Growth",
            title="Revenue Growing",
            desc=(f"Revenue is trending up by {_fmt(rev_m)} per month "
                  f"(+{trend_pct:.1f}% of avg). "
                  f"Next month ({f_months[0]}) forecast: {_fmt(f_rev[0])}.")))
    else:
        insights.append(dict(badge="negative", label="Warning",
            title="Revenue Declining",
            desc=(f"Revenue is falling by {_fmt(abs(rev_m))} per month. "
                  f"Forecast for {f_months[0]}: {_fmt(f_rev[0])}. "
                  f"Review pricing or demand immediately.")))

    insights.append(dict(badge="info", label="Seasonality",
        title=f"Peak Month: {hist_months[peak_i]}",
        desc=(f"Highest recorded revenue: {_fmt(hist_rev[peak_i])} in "
              f"{hist_months[peak_i]} "
              f"(seasonality index: {season_chart[peak_i]:.0f}). "
              f"Stock up 2 months ahead to capitalise.")))

    insights.append(dict(badge="warning", label="Risk",
        title=f"Weakest Month: {hist_months[weak_i]}",
        desc=(f"Lowest revenue: {_fmt(hist_rev[weak_i])} in "
              f"{hist_months[weak_i]}. "
              f"Plan promotions or cost controls at least 6 weeks before this period.")))

    m_val = overall_margin_pct
    if m_val >= 30:
        insights.append(dict(badge="positive", label="Margin",
            title=f"Excellent Margin: {m_val:.1f}%",
            desc=f"Profit margin of {m_val:.1f}% is well above the 20% benchmark. Focus on scaling volume."))
    elif m_val >= 20:
        insights.append(dict(badge="positive", label="Margin",
            title=f"Healthy Margin: {m_val:.1f}%",
            desc=f"Margin of {m_val:.1f}% meets the 20% benchmark. Monitor costs to stay above threshold."))
    elif m_val >= 10:
        insights.append(dict(badge="warning", label="Margin",
            title=f"Thin Margin: {m_val:.1f}%",
            desc=f"Margin of {m_val:.1f}% is below 20%. Identify high-cost products and renegotiate supplier terms."))
    else:
        insights.append(dict(badge="negative", label="Margin",
            title=f"Critical Margin: {m_val:.1f}%",
            desc=f"Margin of {m_val:.1f}% is dangerously low. Immediate pricing review needed."))

    six_month_profit = sum(f_profit)
    if six_month_profit > 0:
        insights.append(dict(badge="positive", label="Forecast",
            title=f"6-Month Profit Outlook: {_fmt(six_month_profit)}",
            desc=(f"Forecast profit over the next 6 months: {_fmt(six_month_profit)} "
                  f"at a {overall_margin_pct:.1f}% margin. "
                  f"Model R2 is {r2 * 100:.1f}%.")))
    else:
        insights.append(dict(badge="negative", label="Forecast",
            title="Loss Forecast Ahead",
            desc=(f"6-month profit forecast: {_fmt(six_month_profit)}. "
                  f"Immediate cost reduction or revenue improvement is critical.")))

    confidence_label = "High" if r2 >= 0.7 else ("Moderate" if r2 >= 0.4 else "Low")
    insights.append(dict(badge="info", label="Model Info",
        title=f"Forecast Confidence: {confidence_label} (R2={r2 * 100:.1f}%)",
        desc=(f"The model explains {r2 * 100:.1f}% of revenue variance. "
              + ("More monthly data points will improve accuracy." if n < 6
                 else "Confidence bands reflect historical residual spread."))))

    all_labels = hist_months + f_months
    all_rev    = hist_rev    + f_rev
    all_cost   = hist_cost   + f_cost
    all_profit = hist_profit + f_profit
    is_fc      = [False] * n + [True] * 6
    upper_band = [None]  * n + f_upper
    lower_band = [None]  * n + f_lower

    chart = json.dumps({
        "labels"      : all_labels,
        "revenue"     : [round(v, 2) for v in all_rev],
        "cost"        : [round(v, 2) for v in all_cost],
        "profit"      : [round(v, 2) for v in all_profit],
        "is_forecast" : is_fc,
        "n_hist"      : n,
        "hist_months" : hist_months,
        "season_idx"  : season_chart,
        "margins"     : hist_margins,
        "f_months"    : f_months,
        "f_rev"       : f_rev,
        "upper_band"  : upper_band,
        "lower_band"  : lower_band,
    })

    growth_pct = (
        f"{((f_rev[0] - hist_rev[-1]) / hist_rev[-1] * 100):+.1f}"
        if hist_rev[-1] else "0.0"
    )

    return render_template("predictions.html",
        has_data = True,
        chart    = chart,
        summary  = dict(
            f_revenue  = _fmt(sum(f_rev)),
            f_profit   = _fmt(sum(f_profit)),
            peak_month = hist_months[peak_i],
            peak_rev   = _fmt(hist_rev[peak_i]),
            weak_month = hist_months[weak_i],
            weak_rev   = _fmt(hist_rev[weak_i]),
            avg_margin = f"{overall_margin_pct:.1f}",
            r2         = f"{r2 * 100:.1f}",
            trend      = "Growing" if rev_m >= 0 else "Declining",
            avg_rev    = _fmt(avg_rev),
            n_months   = n,
            growth_pct = growth_pct,
            growth_pos = (f_rev[0] >= hist_rev[-1]) if hist_rev else True,
        ),
        insights = insights,
    )


# ======================================================
#  REPORTS ROUTE  — fully implemented
# ======================================================
@app.route('/reports')
def reports():
    uid = session.get('uid')
    if not uid:
        return redirect(url_for('login'))

    cur = conn.cursor()
    cur.execute(
        """SELECT product_name, category, cost_price, selling_price,
                  quantity_sold, month, demand_level
           FROM products WHERE uid = %s ORDER BY pid DESC""",
        (uid,)
    )
    rows = cur.fetchall()
    cur.close()

    if not rows:
        return render_template('reports.html', has_data=False)

    MONTH_ORDER = {'Jan':1,'Feb':2,'Mar':3,'Apr':4,'May':5,'Jun':6,
                   'Jul':7,'Aug':8,'Sep':9,'Oct':10,'Nov':11,'Dec':12}

    # ── Per-product calculations ─────────────────────────────
    products_data = []
    for r in rows:
        name, category, cp, sp, qty, month, demand = r
        cp   = float(cp); sp = float(sp); qty = int(qty)
        rev  = round(sp * qty, 2)
        cost = round(cp * qty, 2)
        prof = round(rev - cost, 2)
        marg = round((prof / rev * 100) if rev else 0, 1)
        products_data.append(dict(
            name         = name,
            category     = category,
            cost_price   = cp,
            selling_price= sp,
            quantity_sold= qty,
            month        = month,
            demand_level = demand,
            revenue      = rev,
            cost         = cost,
            profit       = prof,
            margin       = marg,
        ))

    # ── Totals ───────────────────────────────────────────────
    total_rev    = sum(p['revenue'] for p in products_data)
    total_cost   = sum(p['cost']    for p in products_data)
    total_profit = sum(p['profit']  for p in products_data)
    total_units  = sum(p['quantity_sold'] for p in products_data)
    overall_margin = round((total_profit / total_rev * 100) if total_rev else 0, 1)

    categories_set = set(p['category'] for p in products_data)
    total_products   = len(products_data)
    total_categories = len(categories_set)

    pl_profit = sum(1 for p in products_data if p['profit'] > 0)
    pl_loss   = sum(1 for p in products_data if p['profit'] < 0)

    high_demand   = sum(1 for p in products_data if p['demand_level'] == 'High')
    medium_demand = sum(1 for p in products_data if p['demand_level'] == 'Medium')
    low_demand    = sum(1 for p in products_data if p['demand_level'] == 'Low')

    active_months = len(set(p['month'] for p in products_data))

    # ── Monthly aggregates (for sales_summary report) ────────
    monthly = {}
    for p in products_data:
        m = p['month']
        if m not in monthly:
            monthly[m] = {'revenue': 0.0, 'units': 0}
        monthly[m]['revenue'] = round(monthly[m]['revenue'] + p['revenue'], 2)
        monthly[m]['units']  += p['quantity_sold']

    # ── JSON blob passed to reports.js ───────────────────────
    report_json = json.dumps({
        'meta': {
            'total_revenue' : _fmt(total_rev),
            'total_cost'    : _fmt(total_cost),
            'total_profit'  : _fmt(total_profit),
            'overall_margin': overall_margin,
            'total_products': total_products,
            'total_units'   : total_units,
            'pl_profit'     : pl_profit,
            'pl_loss'       : pl_loss,
            'high_demand'   : high_demand,
            'medium_demand' : medium_demand,
            'low_demand'    : low_demand,
        },
        'products': products_data,
        'monthly' : monthly,
    })

    # ── Template variables ────────────────────────────────────
    # Build product list for the preview table
    template_products = [
        dict(
            name         = p['name'],
            category     = p['category'],
            cost_price   = p['cost_price'],
            selling_price= p['selling_price'],
            quantity_sold= p['quantity_sold'],
            month        = p['month'],
            demand_level = p['demand_level'],
            revenue      = p['revenue'],
            profit       = p['profit'],
            margin       = p['margin'],
        )
        for p in products_data
    ]

    return render_template(
        'reports.html',
        has_data         = True,
        total_products   = total_products,
        total_categories = total_categories,
        total_revenue_fmt= _fmt(total_rev),
        total_profit_fmt = _fmt(total_profit),
        overall_margin   = overall_margin,
        total_units      = total_units,
        active_months    = active_months,
        pl_profit        = pl_profit,
        pl_loss          = pl_loss,
        high_demand      = high_demand,
        low_demand       = low_demand,
        products         = template_products,
        report_json      = report_json,
    )


# ---------------- RUN APP ----------------
if __name__ == "__main__":
    app.run(debug=True)