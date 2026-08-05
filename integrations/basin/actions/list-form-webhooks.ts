import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    page: z.string().optional().describe('Page number for pagination. Example: "1"'),
    query: z.string().optional().describe('Filter webhooks by name, id, url, or associated form_id. Example: "Nango"')
});

const ProviderFormWebhookSchema = z.object({
    id: z.number(),
    form_id: z.number(),
    name: z.string(),
    url: z.string(),
    format: z.string(),
    trigger_when_spam: z.boolean(),
    enabled: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    failure_count: z.number(),
    last_failure_at: z.string().nullable().optional(),
    signing_secret: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderFormWebhookSchema),
    next_page: z.string().optional()
});

const ListResponseSchema = z.object({
    form_webhooks: z.array(z.unknown()),
    meta: z
        .object({
            count: z.number(),
            page: z.number(),
            per_page: z.number()
        })
        .passthrough()
        .optional()
});

const action = createAction({
    description: 'List webhooks configured across forms in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.usebasin.com/developer-features/api-reference/
            endpoint: '/v1/form_webhooks/',
            params: {
                ...(input.page !== undefined && { page: input.page }),
                ...(input.query !== undefined && { query: input.query })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = ListResponseSchema.parse(response.data);
        const items = parsed.form_webhooks.map((item) => ProviderFormWebhookSchema.parse(item));

        let nextPage: string | undefined;
        if (parsed.meta !== undefined && parsed.meta !== null) {
            const hasMore = parsed.meta.count > parsed.meta.page * parsed.meta.per_page;
            if (hasMore) {
                nextPage = String(parsed.meta.page + 1);
            }
        }

        return {
            items: items,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
