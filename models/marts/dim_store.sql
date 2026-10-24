select distinct
    store_id,
    state_id,
    case state_id
        when 'CA' then 'California'
        when 'TX' then 'Texas'
        when 'WI' then 'Wisconsin'
    end as state_name
from {{ ref('stg_sales') }}
