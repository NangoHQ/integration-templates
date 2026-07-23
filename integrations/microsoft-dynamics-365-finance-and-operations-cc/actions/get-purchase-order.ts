import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    DataAreaId: z.string().describe('Company / data area ID. Example: "dat"'),
    PurchaseOrderNumber: z.string().describe('Purchase order number. Example: "DAT-000001"')
});

const OutputSchema = z
    .object({
        dataAreaId: z.string().optional(),
        PurchaseOrderNumber: z.string().optional(),
        PurchaseOrderName: z.string().optional().nullable(),
        OrderVendorAccountNumber: z.string().optional().nullable(),
        PurchaseOrderStatus: z.string().optional(),
        CurrencyCode: z.string().optional().nullable()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a purchase order header.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: `/data/PurchaseOrderHeadersV2(dataAreaId='${encodeURIComponent(input.DataAreaId).replace(/'/g, "''")}',PurchaseOrderNumber='${encodeURIComponent(input.PurchaseOrderNumber).replace(/'/g, "''")}')`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Purchase order not found',
                DataAreaId: input.DataAreaId,
                PurchaseOrderNumber: input.PurchaseOrderNumber
            });
        }

        const purchaseOrder = OutputSchema.parse(response.data);

        return purchaseOrder;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
