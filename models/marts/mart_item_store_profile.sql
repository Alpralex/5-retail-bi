-- Grain: one row per item and store (30,490 rows), over the last 364 days with sales.
-- Feeds the inventory policy and stock-out priority pages:
--   ABC  = share of revenue (A: first 80%, B: next 15%, C: last 5%)
--   XYZ  = variability of weekly units (coefficient of variation: X <= 0.5, Y <= 1.0, Z above)
--   demand class (Syntetos-Boylan): ADI = days per non-zero day, CV2 = squared CV of non-zero days
-- Safety stock itself is computed in Power BI, so the service level and lead time can be changed there.
with bounds as (
    select max(day_number) as last_day from {{ ref('fct_sales_daily') }}
),
last_52w as (
    select f.item_id, f.store_id, f.day_number, f.units, f.revenue_usd, f.unit_price_usd,
           (b.last_day - f.day_number) // 7 as weeks_back
    from {{ ref('fct_sales_daily') }} f, bounds b
    where f.day_number > b.last_day - 364
),
daily as (
    select item_id, store_id,
           count(*)                                    as days_on_shelf,
           count(*) filter (where units > 0)           as selling_days,
           sum(units)                                  as units_52w,
           sum(revenue_usd)                            as revenue_52w_usd,
           avg(unit_price_usd)                         as avg_price_usd,
           avg(units)                                  as mean_daily_units,
           stddev_samp(units)                          as std_daily_units,
           avg(units) filter (where units > 0)         as mean_nonzero_units,
           stddev_samp(units) filter (where units > 0) as std_nonzero_units
    from last_52w
    group by all
),
weekly as (
    select item_id, store_id, weeks_back, sum(units) as units
    from last_52w
    group by all
),
weekly_cv as (
    select item_id, store_id,
           stddev_samp(units) / nullif(avg(units), 0) as weekly_cv
    from weekly
    group by all
),
ranked as (
    select d.*, w.weekly_cv,
           sum(d.revenue_52w_usd) over (order by d.revenue_52w_usd desc, d.item_id, d.store_id
                                        rows unbounded preceding)
             / sum(d.revenue_52w_usd) over () as cum_revenue_share
    from daily d
    left join weekly_cv w using (item_id, store_id)
),
stockouts as (
    select item_id, store_id,
           count(*)                  as stockout_runs,
           sum(run_days)             as stockout_days,
           sum(est_lost_units)       as est_lost_units,
           sum(est_lost_revenue_usd) as est_lost_revenue_usd,
           max(run_end)              as last_stockout_end
    from {{ ref('mart_zero_sales_runs') }}
    group by all
)
select
    r.item_id,
    r.store_id,
    i.category_id,
    i.dept_id,
    r.days_on_shelf,
    r.selling_days,
    r.units_52w,
    r.revenue_52w_usd,
    r.avg_price_usd,
    r.mean_daily_units,
    coalesce(r.std_daily_units, 0)                              as std_daily_units,
    r.weekly_cv,
    r.cum_revenue_share,
    case when r.cum_revenue_share <= 0.80 then 'A'
         when r.cum_revenue_share <= 0.95 then 'B'
         else 'C' end                                           as abc_class,
    case when r.units_52w = 0 then 'Z'
         when r.weekly_cv <= 0.5 then 'X'
         when r.weekly_cv <= 1.0 then 'Y'
         else 'Z' end                                           as xyz_class,
    r.days_on_shelf / nullif(r.selling_days, 0)                 as adi,
    power(r.std_nonzero_units / nullif(r.mean_nonzero_units, 0), 2) as cv2,
    case when r.selling_days = 0 then 'No sales'
         when r.days_on_shelf / r.selling_days < 1.32
              and coalesce(power(r.std_nonzero_units / r.mean_nonzero_units, 2), 0) < 0.49 then 'Smooth'
         when r.days_on_shelf / r.selling_days < 1.32 then 'Erratic'
         when coalesce(power(r.std_nonzero_units / r.mean_nonzero_units, 2), 0) < 0.49 then 'Intermittent'
         else 'Lumpy' end                                       as demand_class,
    r.mean_daily_units >= 2                                     as is_fast_mover,
    coalesce(s.stockout_runs, 0)                                as stockout_runs,
    coalesce(s.stockout_days, 0)                                as stockout_days,
    coalesce(s.est_lost_units, 0)                               as est_lost_units,
    coalesce(s.est_lost_revenue_usd, 0)                         as est_lost_revenue_usd,
    s.last_stockout_end
from ranked r
join {{ ref('dim_item') }} i using (item_id)
left join stockouts s using (item_id, store_id)
