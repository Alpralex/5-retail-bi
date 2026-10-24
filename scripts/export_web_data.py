"""Export the dashboard's data from the dbt marts to compact JSON files in web/data/."""
import json
import os
import duckdb

DB = os.environ.get("M5_DB_PATH", "data/m5.duckdb")
OUT = "web/data"
os.makedirs(OUT, exist_ok=True)
con = duckdb.connect(DB, read_only=True)


def rows(sql):
    cur = con.execute(sql)
    return [list(r) for r in cur.fetchall()]


exports = {
    # week_start, store, category, units, revenue
    "weekly": """
        select strftime(week_start, '%Y-%m-%d'), store_id, category_id, units, round(revenue_usd)
        from mart_sales_weekly
        where week_start > date '2011-01-24' and week_start <= date '2016-06-13'   -- drop the partial first week; the last week (13-19 Jun 2016) is complete
        order by 1, 2, 3""",
    # date, store, category, actual, forecast, item-day absolute error
    "forecast": """
        select strftime(e.date_day, '%Y-%m-%d'), e.store_id, i.category_id,
               sum(e.actual_units), round(sum(e.forecast_units), 1),
               round(sum(abs(e.forecast_units - e.actual_units)), 1)
        from fct_forecast_eval e join dim_item i using (item_id)
        group by all order by 1, 2, 3""",
    # item, store, category, run start, run days, est lost units, est lost revenue
    "stockouts": """
        select item_id, store_id, category_id, strftime(run_start, '%Y-%m-%d'), run_days,
               round(est_lost_units), round(est_lost_revenue_usd)
        from mart_zero_sales_runs order by est_lost_revenue_usd desc""",
}

for name, sql in exports.items():
    data = rows(sql)
    with open(f"{OUT}/{name}.json", "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(name, len(data))

meta = {
    "stores": rows("select store_id, state_name from dim_store order by 1"),
    "revenue_last_52w": rows("select round(sum(revenue_usd)) from fct_sales_daily where date_day > date '2016-06-19' - 364")[0][0],
    "revenue_prior_52w": rows("select round(sum(revenue_usd)) from fct_sales_daily where date_day <= date '2016-06-19' - 364 and date_day > date '2016-06-19' - 728")[0][0],
    "items": rows("select count(*) from dim_item")[0][0],
    "fact_rows": rows("select count(*) from fct_sales_daily")[0][0],
}
with open(f"{OUT}/meta.json", "w") as f:
    json.dump(meta, f, separators=(",", ":"))
print(meta)
