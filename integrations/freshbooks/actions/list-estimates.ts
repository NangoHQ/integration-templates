import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account ID. Example: "ZyQ04o"')
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    updated_since: z.string().optional().describe('ISO 8601 timestamp to filter estimates updated since. Example: "2024-01-01T00:00:00Z"'),
    per_page: z.number().min(1).max(100).optional().describe('Number of results per page. Max 100.')
});

const EstimateSchema = z.object({}).passthrough();

const OutputSchema = z.object({
    estimates: z.array(EstimateSchema),
    page: z.number(),
    pages: z.number(),
    total: z.number(),
    per_page: z.number(),
    next_cursor: z.string().optional()
});

const ListResponseSchema = z.object({
    response: z.object({
        result: z.object({
            estimates: z.array(z.object({}).passthrough()),
            page: z.number(),
            pages: z.number(),
            per_page: z.number(),
            total: z.number()
        })
    })
});

const action = createAction({
    description: 'List estimates.',
    version: '1.0.0',
    metadata: MetadataSchema,
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user:estimates:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'account_id is required in connection metadata.'
            });
        }

        const accountId = parsedMetadata.data.accountId;
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid positive integer page number.'
            });
        }

        // https://www.freshbooks.com/api
        const response = await nango.get({
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/estimates/estimates`,
            params: {
                page: String(page),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.updated_since !== undefined && { 'search[updated_since]': input.updated_since })
            },
            retries: 3
        });

        const parsed = ListResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from FreshBooks API.'
            });
        }

        const result = parsed.data.response.result;
        const nextCursor = result.page < result.pages ? String(result.page + 1) : undefined;

        return {
            estimates: result.estimates,
            page: result.page,
            pages: result.pages,
            total: result.total,
            per_page: result.per_page,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
