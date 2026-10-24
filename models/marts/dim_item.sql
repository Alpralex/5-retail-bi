select distinct
    item_id,
    dept_id,
    cat_id as category_id,
    upper(left(cat_id, 1)) || lower(substr(cat_id, 2)) as category_name
from {{ ref('stg_sales') }}
