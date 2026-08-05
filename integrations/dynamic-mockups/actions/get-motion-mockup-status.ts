import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    requestId: z.string().describe('The MotionMockups request ID to poll. Example: "019fd22e-d00d-7771-b9a6-a4bbb3102ee1"')
});

const ProviderVideoSchema = z.object({
    url: z.string(),
    content_type: z.string(),
    file_name: z.string(),
    file_size: z.number()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        status: z.enum(['IN_QUEUE', 'IN_PROGRESS', 'COMPLETED']),
        video: ProviderVideoSchema.optional()
    })
});

const OutputSchema = z.object({
    status: z.enum(['IN_QUEUE', 'IN_PROGRESS', 'COMPLETED']),
    video: z
        .object({
            url: z.string(),
            content_type: z.string(),
            file_name: z.string(),
            file_size: z.number()
        })
        .optional()
});

const action = createAction({
    description: 'Poll the status of an async MotionMockups video-generation request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.dynamicmockups.com/
            endpoint: `/v1/motion-mockups/status/${encodeURIComponent(input.requestId)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            status: providerResponse.data.status,
            ...(providerResponse.data.video !== undefined && {
                video: {
                    url: providerResponse.data.video.url,
                    content_type: providerResponse.data.video.content_type,
                    file_name: providerResponse.data.video.file_name,
                    file_size: providerResponse.data.video.file_size
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
