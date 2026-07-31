import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code / data area ID. Example: "dat"'),
    purchaseOrderNumber: z.string().describe('Purchase order number. Example: "DAT-000001"')
});

const ProviderPurchaseOrderSchema = z
    .object({
        PurchaseOrderNumber: z.string(),
        dataAreaId: z.string()
    })
    .passthrough();

const OutputSchema = ProviderPurchaseOrderSchema;

const action = createAction({
    description: 'Retrieve a purchase order header.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['D365FO.Read'],

    exec: async (nango, input) => {
        const endpoint = `/data/PurchaseOrderHeadersV2(dataAreaId='${encodeURIComponent(input.dataAreaId.replace(/'/g, "''"))}',PurchaseOrderNumber='${encodeURIComponent(input.purchaseOrderNumber.replace(/'/g, "''"))}')`;

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Purchase order not found',
                dataAreaId: input.dataAreaId,
                purchaseOrderNumber: input.purchaseOrderNumber
            });
        }

        const providerPo = ProviderPurchaseOrderSchema.parse(response.data);

        return providerPo;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
