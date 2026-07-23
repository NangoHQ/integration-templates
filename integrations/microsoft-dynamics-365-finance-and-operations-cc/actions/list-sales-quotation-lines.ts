import { z } from 'zod';
import { createAction } from 'nango';

const PAGE_SIZE = 100;

const InputSchema = z.object({
    dataAreaId: z.string().optional().describe('Company/data area ID. Example: "dat"'),
    salesQuotationNumber: z.string().optional().describe('Parent sales quotation number to scope lines to. Example: "DAT-000002"'),
    cursor: z.string().optional().describe('Pagination cursor (numeric offset). Omit for the first page.')
});

const ProviderSalesQuotationLineSchema = z
    .object({
        dataAreaId: z.string(),
        SalesQuotationNumber: z.string(),
        LineCreationSequenceNumber: z.number()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderSalesQuotationLineSchema),
    next_cursor: z.string().optional()
});

const ListResponseSchema = z.object({
    value: z.array(z.record(z.string(), z.unknown())),
    '@odata.nextLink': z.string().optional()
});

const odataStringLiteral = (value: string): string => {
    return `'${value.replace(/'/g, "''")}'`;
};

const action = createAction({
    description: 'List sales quotation lines, optionally scoped to a parent quotation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {
            $top: String(PAGE_SIZE)
        };
        const filters: string[] = [];
        if (input.dataAreaId) {
            filters.push(`dataAreaId eq ${odataStringLiteral(input.dataAreaId)}`);
        }
        if (input.salesQuotationNumber) {
            filters.push(`SalesQuotationNumber eq ${odataStringLiteral(input.salesQuotationNumber)}`);
        }
        if (filters.length > 0) {
            params['$filter'] = filters.join(' and ');
        }
        // A dataAreaId filter is scoped to the caller's default legal entity unless cross-company
        // is enabled, so requesting a specific (potentially non-default) company must also enable it.
        if (input.dataAreaId) {
            params['cross-company'] = 'true';
        }
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor !== undefined) {
            params['$skip'] = input.cursor;
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/SalesQuotationLines',
            params,
            retries: 3
        });

        const parsed = ListResponseSchema.parse(response.data);
        const items = parsed.value.map((item) => ProviderSalesQuotationLineSchema.parse(item));

        let nextCursor: string | undefined;
        if (parsed['@odata.nextLink'] != null) {
            // Server explicitly says there's more — trust it, and try to extract the real $skip it wants us to use next.
            const nextUrl = new URL(parsed['@odata.nextLink']);
            const skipParam = nextUrl.searchParams.get('$skip');
            nextCursor = skipParam ?? String(skip + items.length);
        } else if (items.length === PAGE_SIZE) {
            // No explicit nextLink, but we got a full page — assume there may be more.
            nextCursor = String(skip + PAGE_SIZE);
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
