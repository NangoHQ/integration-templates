import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderItemSchema = z
    .object({
        '@odata.etag': z.string().optional(),
        ChartOfAccounts: z.string(),
        MainAccountMask: z.string().optional(),
        ChartOfAccountsRecId: z.number().optional(),
        Description: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderItemSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List charts of accounts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pageSize = 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(skip) || skip < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a non-negative numeric skip value.'
            });
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            // ChartOfAccounts is a shared entity (not legal-entity-scoped): it has no dataAreaId
            // property, so there is nothing to filter by company and no cross-company param is needed.
            endpoint: '/data/ChartOfAccounts',
            params: {
                $top: pageSize,
                $skip: skip
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                value: z.array(z.unknown()),
                '@odata.nextLink': z.string().optional()
            })
            .parse(response.data);

        const items = providerResponse.value.map((item) => {
            const parsed = ProviderItemSchema.parse(item);
            return parsed;
        });

        let nextCursor: string | undefined;
        if (providerResponse['@odata.nextLink'] != null) {
            // Server explicitly says there's more — trust it, and try to extract the real $skip it wants us to use next.
            const nextUrl = new URL(providerResponse['@odata.nextLink']);
            const skipParam = nextUrl.searchParams.get('$skip');
            nextCursor = skipParam ?? String(skip + items.length);
        } else if (items.length === pageSize) {
            // No explicit nextLink, but we got a full page — assume there may be more.
            nextCursor = String(skip + pageSize);
        }

        return {
            items,
            ...(nextCursor != null && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
