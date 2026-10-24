# Report Spec (approved)

Approved by Guilherme on 2026-10-24 ("sim e desenvolva já o visual e os gráficos do BI").

## Report identity
- Report name: M5RetailBI
- Semantic model: M5RetailBI.SemanticModel (Local Model, byPath ../M5RetailBI.SemanticModel)
- Audience: portfolio readers (recruiters, retail managers)
- Purpose: show where a 10-store retailer loses sales
- Delivery: local PBIP; no publishing in this round
- Language: report in English

## Theme "M5 Retail"
- Page background #F5F6F4; visuals on white #FFFFFF cards, border #D6DBD9
- Text #16202A, secondary #5A6670, gridlines #E6E9E8
- dataColors: #2A78D6, #EB6834, #1BAF7A, #B45309, #5A6670
- Sequential blue #CDE2FB → #256ABF; highlight/alert #B45309
- Segoe UI; visual titles 12pt semibold; no shadows, no 3D

## Layout
- All pages 1280 × 720, 16 px margins and gutters, consistent grid
- Slicers synced across pages: dim_dept[category_name] (buttons), dim_store[store_id] (dropdown)
- No legacy visuals (old card, map, Q&A)

## Pages

### Overview
- Title textbox "Where is a 10-store retailer losing sales?", subtitle "Walmart M5 data, 10 stores in CA, TX and WI, 2011–2016"
- Slicers: category (buttons), store (dropdown)
- Four cardVisual: Revenue Last 52 Weeks (reference Revenue 52w YoY %); WAPE Store-Day %; Forecast Bias %; Est. Lost Revenue (reference Lost % of Revenue)
- Line "Weekly revenue by state": dim_date[week_start] × Revenue, legend dim_store[state_name]
- Bar "Estimated revenue lost to suspected stock-outs, by store": Est. Lost Revenue by dim_store[store_id], descending

### Forecast accuracy
- Line "Forecast against actual sales": dim_date[date_day] filtered to >= 2016-05-23, Actual Units and Forecast Units (Forecast dashed)
- Matrix "Forecast error by store and category": rows store_id, columns category_name, values WAPE Store-Day % (background, blue scale) and Forecast Bias %
- Bar "Forecast bias by category": Forecast Bias % by category_name, positive and negative in distinct colors

### Stock-outs
- Cards: Stock-out Runs, Est. Lost Revenue
- Bar: Est. Lost Revenue by category_name
- Table "Largest suspected stock-outs": stockout_runs item_id, store_id, run_start, run_days, Est. Lost Revenue; top 12 by Est. Lost Revenue, descending

## Process
Per page: write PBIR → validate-report → powerbi-desktop reload → screenshot → fix → commit. No semantic model changes.
