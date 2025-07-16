import { createAction } from "nango";
import type { DatabricksWarehouseResponse } from '../types.js';
import { toWarehouse } from '../mappers/to-warehouse.js';

import type { ProxyConfiguration } from "nango";
import { ListWarehousesResponse } from "../models.js";
import { z } from "zod";

const action = createAction({
    description: "List all SQL warehouses in the workspace",
    version: "1.0.0",

    endpoint: {
        method: "GET",
        path: "/warehouses",
        group: "Warehouses"
    },

    input: z.void(),
    output: ListWarehousesResponse,

    exec: async (nango): Promise<ListWarehousesResponse> => {
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
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
