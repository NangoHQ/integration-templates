import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    limit: z.number().optional().describe('Maximum number of lead lists to return per page. Example: 100'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const LeadListItemSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(LeadListItemSchema),
    next_starting_after: z.string().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(z.unknown()),
    next_starting_after: z.string().optional()
});

const action = createAction({
    description: 'List lead lists',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/actions/list-lead-lists' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.cursor !== undefined) {
            params['starting_after'] = input.cursor;
        }

        // https://developer.instantly.ai/api-reference/groups/lead-list
        const response = await nango.get({
            endpoint: '/v2/lead-lists',
            params,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const items = providerData.items.map((item) => {
            return LeadListItemSchema.parse(item);
        });

        return {
            items,
            ...(providerData.next_starting_after !== undefined && { next_starting_after: providerData.next_starting_after })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
