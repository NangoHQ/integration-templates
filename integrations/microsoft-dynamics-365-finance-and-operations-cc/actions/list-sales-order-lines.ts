import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company/data area ID. Example: "dat"'),
    salesOrderNumber: z.string().optional().describe('Sales order number to filter lines. Example: "DAT-000001"'),
    cursor: z.string().optional().describe('Pagination cursor ($skip value). Example: "100"')
});

const SalesOrderLineSchema = z
    .object({
        dataAreaId: z.string().optional(),
        SalesOrderNumber: z.string().optional(),
        LineNumber: z.number().optional(),
        LineCreationSequenceNumber: z.number().optional(),
        ItemNumber: z.string().optional(),
        LineDescription: z.string().optional(),
        OrderedSalesQuantity: z.number().optional(),
        SalesUnitSymbol: z.string().optional(),
        LineAmount: z.number().optional(),
        SalesPrice: z.number().optional(),
        RequestedReceiptDate: z.string().optional(),
        RequestedShippingDate: z.string().optional(),
        ConfirmedReceiptDate: z.string().optional(),
        ConfirmedShippingDate: z.string().optional(),
        ShippingWarehouseId: z.string().optional(),
        ShippingSiteId: z.string().optional(),
        CurrencyCode: z.string().optional(),
        SalesOrderLineStatus: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(SalesOrderLineSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List sales order lines, optionally scoped to a parent sales order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const filterParts = [`dataAreaId eq '${input.dataAreaId}'`];
        if (input.salesOrderNumber) {
            filterParts.push(`SalesOrderNumber eq '${input.salesOrderNumber}'`);
        }
        const filter = filterParts.join(' and ');

        const params: Record<string, string> = {
            $filter: filter,
            $top: '100'
        };

        if (input.cursor) {
            params['$skip'] = input.cursor;
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/SalesOrderLinesV3',
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = z
            .object({
                value: z.array(z.unknown()),
                '@odata.nextLink': z.string().optional()
            })
            .parse(response.data);

        const items = providerResponse.value.map((raw) => SalesOrderLineSchema.parse(raw));

        let nextCursor: string | undefined;
        if (providerResponse['@odata.nextLink']) {
            const url = new URL(providerResponse['@odata.nextLink']);
            const skipToken = url.searchParams.get('$skiptoken');
            const skip = url.searchParams.get('$skip');
            nextCursor = skipToken || skip || undefined;
        }

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
