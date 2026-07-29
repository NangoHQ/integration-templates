import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company code (data area ID). Example: "dat"'),
    salesQuotationNumber: z.string().optional().describe('Sales quotation number to scope lines to a single parent quotation. Example: "DAT-000005"'),
    cursor: z.string().optional().describe('Pagination cursor (skip count). Omit for the first page.')
});

const ListOutputSchema = z.object({
    items: z.array(z.record(z.string(), z.unknown())),
    next_cursor: z.string().optional()
});

const PAGE_SIZE = 100;

const action = createAction({
    description: 'List sales quotation lines, optionally scoped to a parent quotation.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['Financials.Read'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor !== undefined && isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a valid integer skip count.'
            });
        }

        const filters: string[] = [`dataAreaId eq '${input.dataAreaId}'`];
        if (input.salesQuotationNumber) {
            filters.push(`SalesQuotationNumber eq '${input.salesQuotationNumber}'`);
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: '/data/SalesQuotationLines',
            params: {
                $filter: filters.join(' and '),
                $top: String(PAGE_SIZE),
                $skip: String(skip)
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                value: z.array(z.unknown())
            })
            .parse(response.data);

        const items: Record<string, unknown>[] = providerResponse.value.map((item: unknown) => {
            if (typeof item !== 'object' || item === null) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Expected an object for each sales quotation line.'
                });
            }
            return Object.fromEntries(Object.entries(item));
        });

        const hasMore = items.length === PAGE_SIZE;
        const next_cursor = hasMore ? String(skip + PAGE_SIZE) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
