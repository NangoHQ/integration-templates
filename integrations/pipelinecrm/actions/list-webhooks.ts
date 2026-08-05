import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderWebhookSchema = z.object({
    id: z.number().describe('Webhook ID. Example: 1'),
    name: z.string().optional().describe('The webhook name.'),
    is_activated: z.boolean().optional().describe('Indicates whether the webhook is active or not.'),
    account_id: z.number().optional().describe('The ID of the account the webhook is associated with.'),
    event_model: z.string().optional().describe('The model we are subscribing to (e.g. company, deal, person).'),
    event_action: z.string().optional().describe('The event we are subscribing to (e.g. create, update, destroy).'),
    url: z.string().optional().describe('The url the webhook is to be posted to.'),
    failure_email: z.string().optional().describe('The email address to notify when the webhook fails.'),
    created_at: z.string().optional().describe('Timestamp when the record was created.'),
    updated_at: z.string().optional().describe('Timestamp when the record was last touched.')
});

const OutputSchema = z.object({
    webhooks: z.array(ProviderWebhookSchema)
});

const action = createAction({
    description: 'List webhook subscriptions configured on this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/admin/webhooks',
            retries: 3
        });

        const providerResponse = z
            .object({
                webhooks: z.array(z.unknown())
            })
            .parse(response.data);

        const webhooks = providerResponse.webhooks.map((item) => {
            return ProviderWebhookSchema.parse(item);
        });

        return {
            webhooks
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
