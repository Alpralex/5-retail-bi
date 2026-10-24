"""Export the Power BI tables from the dbt marts to Parquet files in powerbi/data/.

fct_sales is kept at store x department x day (137k rows) so the model stays light on a laptop;
the forecast table keeps item grain because WAPE has to be computed from item-day errors.
"""
import os
import duckdb

DB = os.environ.get("M5_DB_PATH", "data/m5.duckdb")
OUT = "powerbi/data"
os.makedirs(OUT, exist_ok=True)
con = duckdb.connect(DB, read_only=True)

queries = {
    "dim_date": "select date_day, week_start, month_start, year_number, month_number, weekday_name, event_name, event_type from dim_date",
    "dim_store": "select store_id, state_id, state_name from dim_store",
    "dim_dept": "select distinct dept_id, category_name from dim_item",
    "dim_item": "select item_id, dept_id from dim_item",
    "fct_sales": """
        select f.date_day, f.store_id, i.dept_id,
               sum(f.units)::bigint as units, sum(f.revenue_usd) as revenue_usd
        from fct_sales_daily f join dim_item i using (item_id)
        group by all""",
    "fct_forecast": "select date_day, store_id, item_id, actual_units, forecast_units from fct_forecast_eval",
    "stockout_runs": """
        select item_id, store_id, run_start, run_end, run_days,
               est_lost_units, est_lost_revenue_usd
        from mart_zero_sales_runs""",
    "item_store_profile": """
        select item_id, store_id, days_on_shelf, selling_days, units_52w, revenue_52w_usd,
               avg_price_usd, mean_daily_units, std_daily_units, weekly_cv, cum_revenue_share,
               abc_class, xyz_class, abc_class || xyz_class as abc_xyz, adi, cv2, demand_class,
               is_fast_mover, stockout_runs, stockout_days, est_lost_units, est_lost_revenue_usd,
               last_stockout_end
        from mart_item_store_profile""",
}
for name, sql in queries.items():
    con.execute(f"copy ({sql}) to '{OUT}/{name}.parquet' (format parquet, compression zstd)")
    n = con.execute(f"select count(*) from '{OUT}/{name}.parquet'").fetchone()[0]
    print(f"{name}: {n:,} rows, {os.path.getsize(f'{OUT}/{name}.parquet') / 1e6:.1f} MB")
