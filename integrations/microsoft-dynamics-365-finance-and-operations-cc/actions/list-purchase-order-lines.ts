import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code / data area ID. Example: "dat"'),
    purchaseOrderNumber: z.string().optional().describe('Optional parent purchase order number to scope lines to a single order. Example: "DAT-000001"'),
    cursor: z.string().optional().describe('Pagination cursor ($skip value) from the previous response. Omit for the first page.')
});

const PurchaseOrderLineSchema = z
    .object({
        dataAreaId: z.string().optional(),
        PurchaseOrderNumber: z.string().optional(),
        LineNumber: z.number().optional(),
        ItemNumber: z.string().optional(),
        OrderedPurchaseQuantity: z.number().optional(),
        PurchasePrice: z.number().optional(),
        CurrencyCode: z.string().optional(),
        RequestedReceiptDate: z.string().optional(),
        LineDescription: z.string().optional(),
        ReceivingSiteId: z.string().optional(),
        ReceivingWarehouseId: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(PurchaseOrderLineSchema),
    nextCursor: z.string().optional()
});

const PAGE_SIZE = 100;

const action = createAction({
    description: 'List purchase order lines, optionally scoped to a parent purchase order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const skip = input.cursor ? Number(input.cursor) : 0;
        if (Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid number representing $skip'
            });
        }

        const filters = [`dataAreaId eq '${input.dataAreaId}'`];
        if (input.purchaseOrderNumber) {
            filters.push(`PurchaseOrderNumber eq '${input.purchaseOrderNumber}'`);
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/PurchaseOrderLinesV2',
            params: {
                $top: PAGE_SIZE,
                $skip: skip,
                $filter: filters.join(' and ')
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || typeof response.data !== 'object' || !Array.isArray(response.data.value)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from PurchaseOrderLinesV2'
            });
        }

        const items = response.data.value.map((item: unknown) => {
            const parsed = PurchaseOrderLineSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response_item',
                    message: 'Failed to parse purchase order line',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        const nextCursor = items.length === PAGE_SIZE ? String(skip + PAGE_SIZE) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
