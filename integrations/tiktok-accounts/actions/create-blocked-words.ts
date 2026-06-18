import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('TikTok ad account advertiser ID. Example: "7644117588953235464"'),
    blocked_words: z.array(z.string()).min(1).describe('Words to add to the blocked word list.')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string(),
    data: z.unknown().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    request_id: z.string().optional(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Add words to the blocked word list for automatic comment moderation.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1739029218470913
            endpoint: '/blockedword/create/',
            data: {
                advertiser_id: input.advertiser_id,
                blocked_words: input.blocked_words
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code,
                request_id: providerResponse.request_id
            });
        }

        return {
            success: true,
            request_id: providerResponse.request_id,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
