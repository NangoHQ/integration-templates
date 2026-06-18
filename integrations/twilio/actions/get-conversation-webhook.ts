import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversation_sid: z.string().describe('The unique ID of the Conversation for this webhook. Example: "CHaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"'),
    webhook_sid: z.string().describe('A 34 character string that uniquely identifies this webhook resource. Example: "WHaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"')
});

const ConfigurationSchema = z.object({
    url: z.string().optional(),
    method: z.string().optional(),
    filters: z.array(z.string()).optional(),
    triggers: z.array(z.string()).optional(),
    flow_sid: z.string().optional(),
    replay_after: z.number().optional()
});

const OutputSchema = z.object({
    sid: z.string().optional(),
    account_sid: z.string().optional(),
    conversation_sid: z.string().optional(),
    target: z.string().optional(),
    configuration: ConfigurationSchema.optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single webhook on a Twilio conversation.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.twilio.com/docs/conversations-classic/api/conversation-scoped-webhook-resource
            endpoint: `/v1/Conversations/${encodeURIComponent(input.conversation_sid)}/Webhooks/${encodeURIComponent(input.webhook_sid)}`,
            baseUrlOverride: 'https://conversations.twilio.com',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Conversation webhook not found',
                conversation_sid: input.conversation_sid,
                webhook_sid: input.webhook_sid
            });
        }

        const providerWebhook = OutputSchema.parse(response.data);

        return providerWebhook;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
