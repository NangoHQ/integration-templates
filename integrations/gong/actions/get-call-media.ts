import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    callId: z.string().describe('Gong call ID. Example: "1234567890"')
});

const ProviderCallSchema = z
    .object({
        metaData: z
            .object({
                id: z.string().optional()
            })
            .passthrough(),
        media: z
            .object({
                audioUrl: z.string().optional(),
                videoUrl: z.string().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    calls: z.array(ProviderCallSchema).optional()
});

const OutputSchema = z.object({
    audioUrl: z.string().optional().describe('Signed URL for the audio recording. Valid for 8 hours.'),
    videoUrl: z.string().optional().describe('Signed URL for the video recording. Valid for 8 hours.')
});

const action = createAction({
    description: 'Retrieve the media download URL for a Gong call recording',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-call-media',
        group: 'Calls'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:calls:read:extensive', 'api:calls:read:media-url'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://help.gong.io/docs/what-the-gong-api-provides
        // @allowTryCatch - Gong returns 404 with 'No calls found' when the callId does not exist.
        // This is a valid empty result, not an error, so we catch it and return an empty object.
        try {
            const response = await nango.post({
                // https://gong.app.gong.io/settings/api/documentation
                endpoint: '/v2/calls/extensive',
                data: {
                    contentSelector: {
                        exposedFields: {
                            media: true
                        }
                    },
                    filter: {
                        callIds: [input.callId]
                    }
                },
                retries: 3
            });

            const providerResponse = ProviderResponseSchema.parse(response.data);

            const call = providerResponse.calls?.[0];
            if (!call) {
                return {};
            }

            const media = call.media;

            return {
                ...(media?.audioUrl !== undefined && { audioUrl: media.audioUrl }),
                ...(media?.videoUrl !== undefined && { videoUrl: media.videoUrl })
            };
        } catch (error) {
            if (typeof error === 'object' && error !== null && 'status' in error && error.status === 404) {
                return {};
            }

            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
