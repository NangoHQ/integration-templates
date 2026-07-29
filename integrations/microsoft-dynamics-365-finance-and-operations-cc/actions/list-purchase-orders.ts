import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of records to return per page. Defaults to 100.'),
    crossCompany: z.boolean().optional().describe('When true, reads data across all companies the caller can access.')
});

const ProviderPurchaseOrderSchema = z
    .object({
        dataAreaId: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderPurchaseOrderSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List purchase order headers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (isNaN(skip) || skip < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a non-negative integer.'
            });
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: '/data/PurchaseOrderHeadersV2',
            params: {
                $top: String(limit),
                ...(skip > 0 && { $skip: String(skip) }),
                ...(input.crossCompany && { 'cross-company': 'true' })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                value: z.array(ProviderPurchaseOrderSchema),
                '@odata.nextLink': z.string().optional()
            })
            .parse(response.data);

        const items = providerResponse.value;
        const hasMore = providerResponse['@odata.nextLink'] != null || items.length >= limit;
        const nextCursor = hasMore ? String(skip + limit) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
