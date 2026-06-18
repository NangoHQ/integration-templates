import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversation_sid: z.string().describe('The unique ID of the Conversation. Example: "CHaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"'),
    page_token: z.string().optional().describe('Pagination token from the previous response. Omit for the first page.'),
    page_size: z.number().optional().describe('How many resources to return in each list page. The default is 5, and the maximum is 5.')
});

const WebhookConfigurationSchema = z
    .object({
        url: z.string().optional(),
        method: z.string().optional(),
        filters: z.array(z.string()).optional(),
        triggers: z.array(z.string()).optional(),
        flow_sid: z.string().optional(),
        replay_after: z.number().optional()
    })
    .passthrough();

const ProviderWebhookSchema = z.object({
    sid: z.string(),
    account_sid: z.string(),
    conversation_sid: z.string(),
    target: z.string(),
    url: z.string(),
    configuration: WebhookConfigurationSchema,
    date_created: z.string().optional(),
    date_updated: z.string().optional()
});

const ProviderResponseSchema = z.object({
    webhooks: z.array(z.record(z.string(), z.unknown())),
    meta: z.object({
        next_page_url: z.string().nullable().optional()
    })
});

const OutputSchema = z.object({
    webhooks: z.array(ProviderWebhookSchema),
    next_page_token: z.string().optional()
});

const action = createAction({
    description: 'List webhooks on a Twilio conversation.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.page_token !== undefined) {
            params['PageToken'] = input.page_token;
        }
        if (input.page_size !== undefined) {
            params['PageSize'] = input.page_size;
        }

        const response = await nango.get({
            // https://www.twilio.com/docs/conversations-classic/api/conversation-scoped-webhook-resource
            endpoint: `/v1/Conversations/${encodeURIComponent(input.conversation_sid)}/Webhooks`,
            baseUrlOverride: 'https://conversations.twilio.com',
            params,
            retries: 3
        });

        const data = ProviderResponseSchema.parse(response.data);

        const webhooks = data.webhooks.map((webhook) => ProviderWebhookSchema.parse(webhook));

        let next_page_token: string | undefined;
        if (data.meta.next_page_url) {
            const url = new URL(data.meta.next_page_url);
            const token = url.searchParams.get('PageToken');
            if (token) {
                next_page_token = token;
            }
        }

        return {
            webhooks,
            ...(next_page_token !== undefined && { next_page_token })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
