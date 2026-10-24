# Where is a 10-store retailer losing sales?

A retail BI project on real data: five years of daily Walmart sales (the public M5 dataset), modelled in SQL with dbt on DuckDB, tested, and compared with the forecast that won the M5 competition.

**Live dashboard:** https://guilhermerigonato.com/5-retail-bi/ · **Power BI version:** model, DAX and report guide in [`powerbi/`](powerbi/) · **Stack:** SQL, dbt, DuckDB, Power BI (PBIP/TMDL), Python

## Findings

1. **Food is 56% of revenue but 80% of sales lost to empty shelves.** Suspected stock-outs cost about $0.79M in the last year (1.7% of revenue); store CA_3 accounts for almost a quarter.
2. **The forecast is excellent for the store and weak for the shelf.** WAPE is 5.1% at store-day level with +0.2% bias, but 75% at item-day level, so replenishment needs item-level safety stock.
3. **Hobbies is under-forecast by 4.4%.** Highest error in every store, under-forecast in 8 of 10.

## Model

```
staging (views)                      marts (tables)
stg_calendar ───────────────┐        dim_date
stg_sell_prices ────────────┼──────▶ fct_sales_daily      47.7M rows: item × store × day
stg_sales (unpivot, table) ─┤        dim_item, dim_store
stg_forecast_winner ────────┴──────▶ fct_forecast_eval    853,720 rows: 28 out-of-sample days
                                     mart_sales_weekly, mart_forecast_accuracy,
                                     mart_forecast_daily, mart_zero_sales_runs
```

- 13 models, 17 tests (unique, not null, relationships, accepted values, a custom row-count test).
- `mart_zero_sales_runs` uses gaps-and-islands with window functions to find 7–56 day runs of zero sales for fast movers, the stock-out proxy.
- WAPE and bias instead of MAPE, because most item-days sell zero units.

## Run it

```bash
pip install dbt-duckdb==1.9.1
./scripts/get_data.sh
export M5_RAW_PATH=data/raw
dbt build --profiles-dir .          # about 3 minutes on a laptop
python scripts/export_web_data.py   # writes web/data/*.json
```

Open `web/index.html` through any static server (`python -m http.server` in `web/`).

## Power BI version

`python scripts/export_powerbi_data.py` writes the Parquet files the Power BI project reads. The project itself, with the TMDL model and DAX measures, is in [`powerbi/`](powerbi/README.md).

## Data

M5 Forecasting – Accuracy (Walmart, via Kaggle, 2020), mirrored by [Nixtla](https://github.com/Nixtla/m5-forecasts). The forecast is the published submission of the winning team (YJ_STU). Prices are in US dollars.
