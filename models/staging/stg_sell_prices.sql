-- Weekly shelf price per store and item.
select
    store_id,
    item_id,
    wm_yr_wk      as walmart_week,
    sell_price    as unit_price_usd
from read_csv_auto('{{ var("raw_path") }}/sell_prices.csv', header = true)
