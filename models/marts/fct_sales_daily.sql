-- Grain: one row per item, store and day. Revenue uses the shelf price of that Walmart week.
-- Days before an item has a price are not yet on the shelf and are dropped.
select
    s.item_id,
    s.store_id,
    d.date_day,
    s.day_number,
    s.units,
    p.unit_price_usd,
    s.units * p.unit_price_usd as revenue_usd
from {{ ref('stg_sales') }} s
join {{ ref('dim_date') }} d using (day_number)
join {{ ref('stg_sell_prices') }} p
    on p.store_id = s.store_id
   and p.item_id = s.item_id
   and p.walmart_week = d.walmart_week
