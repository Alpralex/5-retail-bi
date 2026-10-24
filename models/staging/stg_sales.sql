{{ config(materialized="table") }}
-- Daily unit sales per item and store, unpivoted from the wide M5 files.
-- Train file covers d_1..d_1941; the test file adds the 28 evaluation days d_1942..d_1969.
with train as (
    unpivot (select * from read_csv_auto('{{ var("raw_path") }}/sales_train_evaluation.csv', header = true))
    on columns('^d_')
    into name d value units
),
test as (
    unpivot (select * from read_csv_auto('{{ var("raw_path") }}/sales_test_evaluation.csv', header = true))
    on columns('^d_')
    into name d value units
),
unioned as (
    select item_id, dept_id, cat_id, store_id, state_id, d, units from train
    union all
    select item_id, dept_id, cat_id, store_id, state_id, d, units from test
)
select
    item_id,
    dept_id,
    cat_id,
    store_id,
    state_id,
    cast(replace(d, 'd_', '') as integer) as day_number,
    cast(units as integer)                as units
from unioned
