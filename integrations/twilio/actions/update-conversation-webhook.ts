import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversation_sid: z.string().describe('The unique ID of the Conversation for this webhook. Example: "CH7455d9a8e3c541da993a275b699d6c83"'),
    webhook_sid: z.string().describe('A 34 character string that uniquely identifies this webhook resource. Example: "WHab4a563eb9314bec965460f938a4b845"'),
    configuration_url: z.string().optional().describe('The absolute url the webhook request should be sent to. Example: "https://example.com/webhook"'),
    configuration_method: z.enum(['get', 'post']).optional().describe('The HTTP method to be used when sending a webhook request. Possible values: get, post'),
    configuration_filters: z
        .array(z.string())
        .optional()
        .describe('The list of events, firing webhook event for this Conversation. Example: ["onMessageAdded", "onParticipantAdded"]')
});

const ProviderConfigurationSchema = z
    .object({
        url: z.string().optional(),
        method: z.string().optional(),
        filters: z.array(z.string()).optional(),
        flow_sid: z.string().optional(),
        triggers: z.array(z.string()).optional(),
        replay_after: z.number().optional()
    })
    .passthrough();

const ProviderWebhookSchema = z.object({
    account_sid: z.string(),
    conversation_sid: z.string(),
    sid: z.string(),
    target: z.string(),
    configuration: ProviderConfigurationSchema,
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    url: z.string().optional()
});

const OutputSchema = z.object({
    account_sid: z.string(),
    conversation_sid: z.string(),
    sid: z.string(),
    target: z.string(),
    configuration: ProviderConfigurationSchema,
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Update a webhook on a Twilio conversation',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-conversation-webhook',
        group: 'Conversations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params = new URLSearchParams();
        if (input.configuration_url !== undefined) {
            params.append('Configuration.Url', input.configuration_url);
        }
        if (input.configuration_method !== undefined) {
            params.append('Configuration.Method', input.configuration_method);
        }
        if (input.configuration_filters !== undefined) {
            for (const filter of input.configuration_filters) {
                params.append('Configuration.Filters', filter);
            }
        }

        const response = await nango.post({
            // https://www.twilio.com/docs/conversations-classic/api/conversation-scoped-webhook-resource
            endpoint: `/v1/Conversations/${encodeURIComponent(input.conversation_sid)}/Webhooks/${encodeURIComponent(input.webhook_sid)}`,
            baseUrlOverride: 'https://conversations.twilio.com',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: params.toString(),
            retries: 3
        });

        const providerWebhook = ProviderWebhookSchema.parse(response.data);
        return providerWebhook;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
