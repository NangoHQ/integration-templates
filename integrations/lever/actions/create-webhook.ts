import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    event: z.string().describe('Webhook event type. Example: "candidateHired"'),
    url: z.string().describe('Webhook URL. Example: "https://example.com/webhook"')
});

const ProviderWebhookSchema = z.object({
    id: z.string(),
    event: z.string(),
    url: z.string(),
    configuration: z
        .object({
            signatureToken: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    event: z.string(),
    url: z.string(),
    signatureToken: z.string().optional()
});

const action = createAction({
    description: 'Create a new webhook subscription.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const response = await nango.post({
            // https://hire.lever.co/developer/documentation
            endpoint: '/v1/webhooks',
            data: {
                event: input.event,
                url: input.url
            },
            retries: 3
        });

        const responseWrapper = z
            .object({
                data: ProviderWebhookSchema
            })
            .parse(response.data);

        const providerWebhook = responseWrapper.data;
        const signatureToken = providerWebhook.configuration?.signatureToken;

        return {
            id: providerWebhook.id,
            event: providerWebhook.event,
            url: providerWebhook.url,
            ...(signatureToken !== undefined && { signatureToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
