import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    starting_after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const WebhookSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    target_hook_url: z.string().optional(),
    event_type: z.string().optional(),
    status: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(WebhookSchema),
    next_starting_after: z.string().optional()
});

const ListWebhooksResponseSchema = z.object({
    items: z.array(z.unknown()),
    next_starting_after: z.string().optional()
});

const action = createAction({
    description: 'List webhooks.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/groups/webhook
            endpoint: '/v2/webhooks',
            params: {
                ...(input.starting_after !== undefined && { starting_after: input.starting_after })
            },
            retries: 3
        });

        const rawResponse = ListWebhooksResponseSchema.parse(response.data);

        const items = rawResponse.items.map((item) => {
            const parsed = WebhookSchema.parse(item);
            return {
                id: parsed.id,
                ...(parsed.name !== undefined && { name: parsed.name }),
                ...(parsed.target_hook_url !== undefined && { target_hook_url: parsed.target_hook_url }),
                ...(parsed.event_type !== undefined && { event_type: parsed.event_type }),
                ...(parsed.status !== undefined && { status: parsed.status })
            };
        });

        return {
            items,
            ...(rawResponse.next_starting_after !== undefined && { next_starting_after: rawResponse.next_starting_after })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
