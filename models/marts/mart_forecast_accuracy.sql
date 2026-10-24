-- Forecast quality by store and category over the 28-day horizon.
-- WAPE = sum|error| / sum(actual); Bias = (sum forecast - sum actual) / sum actual.
-- Item-day MAPE is undefined on the many zero-sales days, so WAPE is the headline metric.
select
    e.store_id,
    i.category_id,
    sum(e.actual_units)                                  as actual_units,
    sum(e.forecast_units)                                as forecast_units,
    sum(abs(e.forecast_units - e.actual_units))
        / nullif(sum(e.actual_units), 0)                 as wape,
    (sum(e.forecast_units) - sum(e.actual_units))
        / nullif(sum(e.actual_units), 0)                 as bias
from {{ ref('fct_forecast_eval') }} e
join {{ ref('dim_item') }} i using (item_id)
group by all
