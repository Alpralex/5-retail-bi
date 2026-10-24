# M5 Retail BI in Power BI

The same model as the web dashboard, as a Power BI project (PBIP). The semantic model is written in TMDL, so every table, relationship and DAX measure is readable in Git.

## Open it

1. Copy this repository to the Windows machine (in Parallels, for example `C:\m5-retail-bi`).
2. Open `powerbi/M5RetailBI.pbip` in Power BI Desktop. If Desktop asks, turn on the PBIP preview in *Options > Preview features*.
3. In *Transform data > Manage parameters*, set **DataFolder** to the folder that holds the Parquet files, with a trailing backslash, for example `C:\m5-retail-bi\powerbi\data\`.
4. Select **Refresh**. The model loads about 1 million rows in a few seconds.

If Desktop refuses the report scaffold, open a blank report instead, go to **TMDL view**, paste the whole of `tmdl-view-script.tmdl` and select **Apply**. That creates the same tables, parameter, relationships and measures.

## Model

Star schema with a department-level snowflake so one category slicer filters every fact:

```
dim_date ──┬── fct_sales      (store × department × day, 137,830 rows)
dim_store ─┼── fct_forecast   (item × store × day, 853,720 rows)
dim_dept ──┤   stockout_runs  (4,353 suspected stock-outs)
   └── dim_item
```

| Measure | Definition |
| --- | --- |
| Revenue, Units Sold | Sums over fct_sales (the measure is not called Units because fct_sales has a units column, and Power BI names are case-insensitive) |
| Revenue YoY % | Against `SAMEPERIODLASTYEAR` |
| Revenue Last 52 Weeks, Revenue 52w YoY % | 364 days ending on the last day with sales, against the 364 days before |
| Forecast Bias % | (forecast − actual) ÷ actual |
| WAPE Item-Day % | Σ\|item-day error\| ÷ Σ actual |
| WAPE Store-Day % | Errors summed per store and day first, then Σ\|error\| ÷ Σ actual |
| Est. Lost Revenue, Stock-out Runs, Lost % of Revenue | Over the suspected stock-outs |

## Report to build (one page, 1280 × 720)

1. **Header:** text box with the question *Where is a 10-store retailer losing sales?*
2. **Slicers** in one row: `dim_dept[category_name]` (buttons) and `dim_store[store_id]` (dropdown).
3. **Four cards:** Revenue Last 52 Weeks (with Revenue 52w YoY % as subtitle), WAPE Store-Day %, Forecast Bias %, Est. Lost Revenue.
4. **Line chart:** `dim_date[week_start]` on the axis, Revenue as the value, `dim_store[state_name]` as the legend.
5. **Line chart:** `dim_date[date_day]` filtered to 2016-05-23 onwards, Actual Units and Forecast Units.
6. **Matrix:** `dim_store[store_id]` in rows, `dim_dept[category_name]` in columns, WAPE Store-Day % and Forecast Bias % as values, with background colour on WAPE (light to dark blue).
7. **Bar chart:** Est. Lost Revenue by `dim_store[store_id]`, sorted descending.
8. **Table:** item, store, run_start, run_days, Est. Lost Revenue, top 12 by lost revenue.

Publish with *Publish to web* from your own Fabric workspace and put the link in the portfolio.
