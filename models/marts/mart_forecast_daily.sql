-- Daily actual vs forecast by store, for the forecast-tracking chart.
select
    e.date_day,
    e.store_id,
    i.category_id,
    sum(e.actual_units)   as actual_units,
    sum(e.forecast_units) as forecast_units
from {{ ref('fct_forecast_eval') }} e
join {{ ref('dim_item') }} i using (item_id)
group by all
