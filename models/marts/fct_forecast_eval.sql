-- Actual vs forecast for the 28 out-of-sample days (2016-05-23 to 2016-06-19).
select
    f.item_id,
    f.store_id,
    d.date_day,
    f.horizon_days,
    s.units          as actual_units,
    f.forecast_units
from {{ ref('stg_forecast_winner') }} f
join {{ ref('stg_sales') }} s
    on s.item_id = f.item_id and s.store_id = f.store_id and s.day_number = f.day_number
join {{ ref('dim_date') }} d on d.day_number = f.day_number
