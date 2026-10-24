-- Weekly units and revenue by store and category, the grain of the dashboard trend.
select
    d.week_start,
    f.store_id,
    i.category_id,
    sum(f.units)        as units,
    sum(f.revenue_usd)  as revenue_usd,
    count(distinct case when f.units > 0 then f.item_id end) as items_sold
from {{ ref('fct_sales_daily') }} f
join {{ ref('dim_date') }} d using (day_number)
join {{ ref('dim_item') }} i using (item_id)
group by all
