import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().optional().describe('Maximum number of integrations to return per page.'),
        order_by: z.string().optional().describe('Sort order for results, e.g. "created_datetime:desc" or "updated_datetime:asc".'),
        type: z.string().optional().describe('Filter integrations by type, e.g. "email", "http", "app".')
    })
    .describe('Input for listing configured integrations on the Gorgias account.');

const ProviderIntegrationSchema = z.object({}).passthrough();

const ProviderResponseSchema = z.object({
    data: z.array(ProviderIntegrationSchema),
    meta: z
        .object({
            next_cursor: z.string().optional().nullable(),
            prev_cursor: z.string().optional().nullable()
        })
        .optional()
});

const OutputSchema = z
    .object({
        items: z.array(z.object({}).passthrough()).describe('List of configured integrations on the account.'),
        next_cursor: z.string().optional().describe('Pagination cursor for retrieving the next page of results.')
    })
    .describe('Output containing a paginated list of configured integrations on the Gorgias account.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of configured integrations from the Gorgias account.
 */
const action = createAction({
    description: 'List configured integrations (email senders, HTTP integrations, apps, etc.) on the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['integrations:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/list-integrations
            endpoint: '/api/integrations',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.order_by !== undefined && { order_by: input.order_by }),
                ...(input.type !== undefined && { type: input.type })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: parsed.data,
            ...(parsed.meta?.next_cursor != null && { next_cursor: parsed.meta.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
