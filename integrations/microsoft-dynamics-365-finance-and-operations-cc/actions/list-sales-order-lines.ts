import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    salesOrderNumber: z.string().optional().describe('Sales order number to filter lines by. Example: "DAT-000001"'),
    dataAreaId: z.string().optional().describe('Company / data area ID. Defaults to "dat" if not provided.'),
    cursor: z.string().optional().describe('Pagination cursor (OData $skip value). Omit for the first page.'),
    limit: z.number().int().min(1).max(10000).optional().describe('Maximum number of lines to return per page. Defaults to 1000.')
});

const ProviderSalesOrderLineSchema = z
    .object({
        dataAreaId: z.string(),
        SalesOrderNumber: z.string(),
        LineNumber: z.number().optional(),
        ItemNumber: z.string().optional(),
        LineDescription: z.string().optional(),
        OrderedSalesQuantity: z.number().optional(),
        SalesPrice: z.number().optional(),
        SalesUnitSymbol: z.string().optional(),
        LineAmount: z.number().optional(),
        RequestedReceiptDate: z.string().optional(),
        ConfirmedReceiptDate: z.string().optional(),
        ShippingWarehouseId: z.string().optional(),
        ShippingSiteId: z.string().optional(),
        SalesOrderLineStatus: z.string().optional(),
        LineCreationSequenceNumber: z.number().optional(),
        CurrencyCode: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderSalesOrderLineSchema),
    next_cursor: z.string().optional()
});

const ODataListResponseSchema = z.object({
    value: z.array(z.unknown())
});

const action = createAction({
    description: 'List sales order lines, optionally scoped to a parent sales order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['DataEntities.Read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const dataAreaId = input.dataAreaId ?? 'dat';
        const limit = input.limit ?? 1000;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        const filters: string[] = [`dataAreaId eq '${dataAreaId}'`];
        if (input.salesOrderNumber) {
            filters.push(`SalesOrderNumber eq '${input.salesOrderNumber}'`);
        }

        const filterString = filters.join(' and ');

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: '/data/SalesOrderLinesV3',
            params: {
                $filter: filterString,
                $top: String(limit),
                $skip: String(skip)
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from SalesOrderLinesV3'
            });
        }

        const responseData = ODataListResponseSchema.parse(response.data);
        const value = responseData.value;
        const hasMore = value.length === limit;

        const items = value.map((item) => {
            const parsed = ProviderSalesOrderLineSchema.parse(item);
            return parsed;
        });

        return {
            items,
            ...(hasMore && { next_cursor: String(skip + limit) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
