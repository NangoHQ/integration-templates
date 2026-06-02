import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_id: z.string().describe('ID of the Figma team to list webhooks for. Example: "1639747348117609063"')
});

const ProviderWebhookSchema = z.object({
    id: z.string(),
    event_type: z.string(),
    team_id: z.string(),
    context: z.string(),
    context_id: z.string(),
    plan_api_id: z.string(),
    status: z.string(),
    client_id: z.string().nullable(),
    passcode: z.string(),
    endpoint: z.string(),
    description: z.string().nullable()
});

const WebhookOutputSchema = z.object({
    id: z.string(),
    event_type: z.string(),
    team_id: z.string(),
    context: z.string(),
    context_id: z.string(),
    plan_api_id: z.string(),
    status: z.string(),
    client_id: z.string().optional(),
    passcode: z.string(),
    endpoint: z.string(),
    description: z.string().optional()
});

const OutputSchema = z.object({
    webhooks: z.array(WebhookOutputSchema)
});

const action = createAction({
    description: 'List webhooks from Figma',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-webhooks',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.figma.com/developers/api#get-team-webhooks-endpoint
            endpoint: `/v2/teams/${encodeURIComponent(input.team_id)}/webhooks`,
            retries: 3
        };
        const response = await nango.get(config);

        const providerData = z
            .object({
                webhooks: z.array(z.unknown())
            })
            .parse(response.data);

        return {
            webhooks: providerData.webhooks.map((webhook) => {
                const parsed = ProviderWebhookSchema.parse(webhook);
                return {
                    id: parsed.id,
                    event_type: parsed.event_type,
                    team_id: parsed.team_id,
                    context: parsed.context,
                    context_id: parsed.context_id,
                    plan_api_id: parsed.plan_api_id,
                    status: parsed.status,
                    ...(parsed.client_id !== null && { client_id: parsed.client_id }),
                    passcode: parsed.passcode,
                    endpoint: parsed.endpoint,
                    ...(parsed.description !== null && { description: parsed.description })
                };
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
