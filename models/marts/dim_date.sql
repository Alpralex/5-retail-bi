select
    day_number,
    date_day,
    walmart_week,
    date_trunc('week', date_day)::date as week_start,
    date_trunc('month', date_day)::date as month_start,
    weekday_name,
    month_number,
    year_number,
    event_name,
    event_type
from {{ ref('stg_calendar') }}
