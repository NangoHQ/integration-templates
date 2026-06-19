import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
});

const MetaSchema = z.object({
    count: z.number(),
    total: z.number(),
    current_page: z.number(),
    per_page: z.number(),
    next_page_link: z.string().nullish(),
    previous_page_link: z.string().nullish()
});

const ProviderWebhookSchema = z.object({
    id: z.number(),
    webhook_id: z.string(),
    direct_link: z.string().optional(),
    created_at: z.string().optional(),
    url: z.string().optional(),
    active: z.boolean().optional(),
    token: z.string().optional(),
    events: z.array(z.string()).optional()
});

const ProviderResponseSchema = z.object({
    webhooks: z.array(ProviderWebhookSchema),
    meta: MetaSchema
});

const OutputSchema = z.object({
    items: z.array(ProviderWebhookSchema),
    next_page: z.string().optional()
});

const action = createAction({
    description: 'List all webhook subscriptions in Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/list-webhooks',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer page number'
            });
        }

        // https://developer.aircall.io/api-references/#list-all-webhooks
        const response = await nango.get({
            endpoint: '/v1/webhooks',
            params: {
                page: String(page),
                per_page: '50'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const nextPage = parsed.meta.next_page_link != null ? String(page + 1) : undefined;

        return {
            items: parsed.webhooks,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
