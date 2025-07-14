import type { NangoAction, ProxyConfiguration, ListWarehousesResponse } from '../../models.js';
import type { DatabricksWarehouseResponse } from '../types.js';
import { toWarehouse } from '../mappers/to-warehouse.js';

export default async function runAction(nango: NangoAction): Promise<ListWarehousesResponse> {
    const config: ProxyConfiguration = {
        // https://docs.databricks.com/api/workspace/warehouses/list#warehouses
        endpoint: '/sql/warehouses',
        retries: 3
    };

    const response = await nango.get<DatabricksWarehouseResponse>(config);

    if (!response.data.warehouses) {
        throw new nango.ActionError({
            message: 'No warehouses found in response'
        });
    }

    return {
        warehouses: response.data.warehouses.map(toWarehouse)
    };
}
