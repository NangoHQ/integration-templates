import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Webhook ID. Example: 1')
});

const ProviderWebhookSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    status: z.string().optional(),
    topic: z.string().optional(),
    resource: z.string().optional(),
    event: z.string().optional(),
    hooks: z.array(z.string()).optional(),
    delivery_url: z.string().optional(),
    date_created: z.string().nullable().optional(),
    date_created_gmt: z.string().nullable().optional(),
    date_modified: z.string().nullable().optional(),
    date_modified_gmt: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    status: z.string().optional(),
    deleted: z.boolean().optional()
});

const action = createAction({
    description: 'Delete or archive a webhook in WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#delete-a-webhook
            endpoint: `/wp-json/wc/v3/webhooks/${encodeURIComponent(String(input.id))}`,
            params: {
                force: 'true'
            },
            retries: 3
        });

        const webhook = ProviderWebhookSchema.parse(response.data);

        return {
            id: webhook.id,
            ...(webhook.name !== undefined && { name: webhook.name }),
            ...(webhook.status !== undefined && { status: webhook.status }),
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
