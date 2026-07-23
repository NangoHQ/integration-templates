import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (OData $skip value) from the previous response. Omit for the first page.'),
    cross_company: z.boolean().optional().describe('If true, query across all companies using cross-company=true.'),
    top: z.number().min(1).max(10000).optional().describe('Maximum number of records to return per page (OData $top). Max 10,000.')
});

const ReleasedProductSchema = z
    .object({
        ItemNumber: z.string(),
        dataAreaId: z.string()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    value: z.array(ReleasedProductSchema),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ReleasedProductSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List released products (items).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.top ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor !== undefined && Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a valid integer representing the skip offset.'
            });
        }

        const params: Record<string, string> = {
            $top: String(limit)
        };
        if (input.cross_company) {
            params['cross-company'] = 'true';
        }
        if (input.cursor !== undefined) {
            params['$skip'] = input.cursor;
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/ReleasedProductsV2',
            params,
            retries: 3
        });

        const data = ProviderResponseSchema.parse(response.data);
        const items = data.value;

        let nextCursor: string | undefined;
        const nextLink = data['@odata.nextLink'];
        if (nextLink != null) {
            // Server explicitly says there's more — trust it, and try to extract the real $skip it wants us to use next.
            const match = nextLink.match(/[?&]\$skip=(\d+)/);
            nextCursor = match && match[1] ? match[1] : String(skip + items.length);
        } else if (items.length === limit) {
            // No explicit nextLink, but we got a full page — assume there may be more.
            nextCursor = String(skip + limit);
        }

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
