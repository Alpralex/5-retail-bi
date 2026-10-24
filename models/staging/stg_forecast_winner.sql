-- Point forecast of the M5 Accuracy winner (team YJ_STU) for the 28 evaluation days.
-- F1..F28 map to d_1942..d_1969; only the "_evaluation" rows are the real out-of-sample forecast.
with wide as (
    select * from read_csv_auto('{{ var("raw_path") }}/0001 YJ_STU.csv', header = true)
    where id like '%_evaluation'
),
long as (
    unpivot wide on columns('^F') into name horizon value forecast_units
)
select
    regexp_extract(id, '^(.*)_([A-Z]{2}_[0-9])_evaluation$', 1) as item_id,
    regexp_extract(id, '^(.*)_([A-Z]{2}_[0-9])_evaluation$', 2) as store_id,
    1941 + cast(replace(horizon, 'F', '') as integer)          as day_number,
    cast(replace(horizon, 'F', '') as integer)                 as horizon_days,
    forecast_units
from long
