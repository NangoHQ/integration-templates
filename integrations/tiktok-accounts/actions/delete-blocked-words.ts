import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644117588953235464"'),
    blocked_words: z.array(z.string()).describe('Blocked words to delete. Example: ["spam", "offensive"]')
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z.unknown().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    request_id: z.string().optional()
});

const action = createAction({
    description: 'Remove words from the blocked word list.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-blocked-words',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1739029277346817
            endpoint: '/blockedword/delete/',
            providerConfigKey: 'tiktok-ads',
            connectionId: 'e28036e5-e29b-4a53-b9c4-80bf358a0f84',
            data: {
                advertiser_id: input.advertiser_id,
                blocked_words: input.blocked_words
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== undefined && providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: providerResponse.message || 'Failed to delete blocked words',
                code: providerResponse.code
            });
        }

        return {
            success: true,
            ...(providerResponse.request_id !== undefined && { request_id: providerResponse.request_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
