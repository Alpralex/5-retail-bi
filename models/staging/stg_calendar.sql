-- One row per day, 2011-01-29 to 2016-06-19 (d_1 .. d_1969).
select
    cast(date as date)                       as date_day,
    (cast(date as date) - date '2011-01-29') + 1  as day_number,
    wm_yr_wk                                 as walmart_week,
    weekday                                  as weekday_name,
    month                                    as month_number,
    year                                     as year_number,
    nullif(event_name_1, 'NA')               as event_name,
    nullif(event_type_1, 'NA')               as event_type,
    snap_CA::boolean                         as is_snap_ca,
    snap_TX::boolean                         as is_snap_tx,
    snap_WI::boolean                         as is_snap_wi
from read_csv_auto('{{ var("raw_path") }}/calendar.csv', header = true, nullstr = 'NA')
