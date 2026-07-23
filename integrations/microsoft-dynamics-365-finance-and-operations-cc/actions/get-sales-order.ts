import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code / data area ID. Example: "dat"'),
    salesOrderNumber: z.string().describe('Sales order number. Example: "DAT-000001"')
});

const OutputSchema = z.object({}).passthrough();

const action = createAction({
    description: 'Retrieve a sales order header',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedDataAreaId = encodeURIComponent(input.dataAreaId).replace(/'/g, "''");
        const encodedSalesOrderNumber = encodeURIComponent(input.salesOrderNumber).replace(/'/g, "''");

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: `/data/SalesOrderHeadersV2(dataAreaId='${encodedDataAreaId}',SalesOrderNumber='${encodedSalesOrderNumber}')`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Sales order not found or unexpected response format',
                dataAreaId: input.dataAreaId,
                salesOrderNumber: input.salesOrderNumber
            });
        }

        const providerSalesOrder = OutputSchema.parse(response.data);

        return providerSalesOrder;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
