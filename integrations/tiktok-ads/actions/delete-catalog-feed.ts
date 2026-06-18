import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    bc_id: z.string().describe('Business Center ID. Example: "1234567890123456789"'),
    catalog_id: z.string().describe('Catalog ID. Example: "1234567890123456789"'),
    feed_id: z.string().describe('Feed ID. Example: "1234567890123456789"')
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z.unknown().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    request_id: z.string().optional()
});

const action = createAction({
    description: 'Delete a catalog product feed from TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads.catalog'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://business-api.tiktok.com/portal/docs?id=1740665210863617
        const response = await nango.post({
            endpoint: '/catalog/feed/delete/',
            data: {
                bc_id: input.bc_id,
                catalog_id: input.catalog_id,
                feed_id: input.feed_id
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== undefined && providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message || 'Failed to delete catalog feed',
                code: providerResponse.code,
                request_id: providerResponse.request_id
            });
        }

        return {
            success: true,
            ...(providerResponse.message !== undefined && { message: providerResponse.message }),
            ...(providerResponse.request_id !== undefined && { request_id: providerResponse.request_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
