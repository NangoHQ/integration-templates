import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    media_id: z.string().describe('Unique identifier for this media upload. Example: "12345"')
});

const ProviderMediaSchema = z.object({
    media_id: z.string(),
    media_type: z.string(),
    status: z.string().optional()
});

const OutputSchema = z.object({
    media_id: z.string(),
    media_type: z.string(),
    status: z.string().optional()
});

const action = createAction({
    description: 'Get the processing status of a registered media upload.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pins:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/media-get/
            endpoint: `/v5/media/${encodeURIComponent(input.media_id)}`,
            retries: 3
        });

        const providerMedia = ProviderMediaSchema.parse(response.data);

        return {
            media_id: providerMedia.media_id,
            media_type: providerMedia.media_type,
            ...(providerMedia.status !== undefined && { status: providerMedia.status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
