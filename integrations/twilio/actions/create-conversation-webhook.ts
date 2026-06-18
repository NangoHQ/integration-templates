import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversationSid: z.string().describe('The unique ID of the Conversation for this webhook. Example: "CHaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"'),
    target: z.enum(['webhook', 'studio', 'trigger']).describe('The target of this webhook: webhook, studio, or trigger'),
    configurationUrl: z.string().optional().describe('The absolute url the webhook request should be sent to. Required when target is webhook.'),
    configurationMethod: z
        .enum(['get', 'post'])
        .optional()
        .describe('The HTTP method to be used when sending a webhook request. Required when target is webhook.'),
    configurationFilters: z.string().optional().describe('Comma-separated event names that trigger this webhook. Example: "onMessageAdded,onParticipantAdded"')
});

const ConfigurationSchema = z
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
    sid: z.string(),
    account_sid: z.string(),
    conversation_sid: z.string(),
    target: z.string(),
    url: z.string(),
    configuration: ConfigurationSchema,
    date_created: z.string().optional(),
    date_updated: z.string().optional()
});

const OutputSchema = z.object({
    sid: z.string(),
    accountSid: z.string(),
    conversationSid: z.string(),
    target: z.string(),
    url: z.string(),
    configuration: z.object({}).passthrough().optional(),
    dateCreated: z.string().optional(),
    dateUpdated: z.string().optional()
});

const action = createAction({
    description: 'Add a webhook to a Twilio conversation',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.target === 'webhook') {
            if (!input.configurationUrl) {
                throw new nango.ActionError({
                    type: 'missing_field',
                    message: 'configurationUrl is required when target is webhook'
                });
            }
            if (!input.configurationMethod) {
                throw new nango.ActionError({
                    type: 'missing_field',
                    message: 'configurationMethod is required when target is webhook'
                });
            }
        }

        const queryParts: string[] = [`Target=${encodeURIComponent(input.target)}`];

        if (input.configurationUrl !== undefined) {
            queryParts.push(`Configuration.Url=${encodeURIComponent(input.configurationUrl)}`);
        }
        if (input.configurationMethod !== undefined) {
            queryParts.push(`Configuration.Method=${encodeURIComponent(input.configurationMethod)}`);
        }
        if (input.configurationFilters !== undefined) {
            const filters = input.configurationFilters
                .split(',')
                .map((f) => f.trim())
                .filter((f) => f.length > 0);
            for (const filter of filters) {
                queryParts.push(`Configuration.Filters=${encodeURIComponent(filter)}`);
            }
        }
        const formBody = queryParts.join('&');

        // https://www.twilio.com/docs/conversations-classic/api/conversation-scoped-webhook-resource
        const response = await nango.post({
            baseUrlOverride: 'https://conversations.twilio.com',
            endpoint: `/v1/Conversations/${encodeURIComponent(input.conversationSid)}/Webhooks`,
            data: formBody,
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        });

        const providerWebhook = ProviderWebhookSchema.parse(response.data);

        return {
            sid: providerWebhook.sid,
            accountSid: providerWebhook.account_sid,
            conversationSid: providerWebhook.conversation_sid,
            target: providerWebhook.target,
            url: providerWebhook.url,
            configuration: providerWebhook.configuration,
            ...(providerWebhook.date_created !== undefined && { dateCreated: providerWebhook.date_created }),
            ...(providerWebhook.date_updated !== undefined && { dateUpdated: providerWebhook.date_updated })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
