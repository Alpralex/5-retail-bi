-- Stock-out proxy. M5 has no inventory data, so a long run of zero-sales days for an item
-- that normally sells every day is the best available signal of an empty shelf.
-- Gaps-and-islands over the last 365 days; lost units = run length x the item's normal daily rate.
{% set run_min_days = 7 %}
{% set run_max_days = 56 %}  -- longer gaps look like a delisting, not an empty shelf
with last_year as (
    select item_id, store_id, day_number, date_day, units, unit_price_usd
    from {{ ref('fct_sales_daily') }}
    where day_number > (select max(day_number) - 365 from {{ ref('fct_sales_daily') }})
),
item_rate as (
    select item_id, store_id,
           avg(units) as avg_daily_units,
           avg(unit_price_usd) as avg_price_usd
    from last_year
    group by all
    having avg(units) >= 2          -- fast movers only: two or more units a day on average
),
flagged as (
    select l.*,
           r.avg_daily_units,
           r.avg_price_usd,
           day_number - row_number() over (
               partition by l.item_id, l.store_id, (l.units = 0)
               order by day_number
           ) as island
    from last_year l
    join item_rate r using (item_id, store_id)
),
runs as (
    select item_id, store_id,
           min(date_day)        as run_start,
           max(date_day)        as run_end,
           count(*)             as run_days,
           any_value(avg_daily_units) as avg_daily_units,
           any_value(avg_price_usd)   as avg_price_usd
    from flagged
    where units = 0
    group by item_id, store_id, island
    having count(*) between {{ run_min_days }} and {{ run_max_days }}
)
select
    r.*,
    i.category_id,
    i.dept_id,
    r.run_days * r.avg_daily_units                    as est_lost_units,
    r.run_days * r.avg_daily_units * r.avg_price_usd  as est_lost_revenue_usd
from runs r
join {{ ref('dim_item') }} i using (item_id)
