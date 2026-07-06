import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().min(1).max(100).optional().describe('Number of items per page. Max 100. Defaults to 100.')
});

const ProviderListResponseSchema = z.object({
    response: z.object({
        result: z.object({
            clients: z.array(z.object({}).passthrough()),
            page: z.number().optional(),
            pages: z.number().optional(),
            per_page: z.number().optional(),
            total: z.number().optional()
        })
    })
});

const OutputSchema = z.object({
    items: z.array(z.object({}).passthrough()),
    next_page: z.string().optional()
});

const action = createAction({
    description: 'List clients.',
    version: '1.0.0',
    metadata: MetadataSchema,
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);

        if (!metadataResult.success || !metadataResult.data.accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata. Run get-account-id first.'
            });
        }

        const accountId = metadataResult.data.accountId;
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer page number.'
            });
        }

        const perPage = input.per_page ?? 100;

        // https://www.freshbooks.com/api/clients
        const response = await nango.get({
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/users/clients`,
            params: {
                page: page,
                per_page: perPage
            },
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);
        const result = parsed.response.result;
        const hasMore = result.pages ? page < result.pages : false;

        return {
            items: result.clients,
            ...(hasMore && { next_page: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
