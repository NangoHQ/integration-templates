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

const StatusSchema = z.enum(['IN_QUEUE', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'ERROR']);

const ProviderResponseSchema = z.object({
    data: z
        .object({
            status: StatusSchema,
            video: ProviderVideoSchema.optional()
        })
        .optional(),
    success: z.boolean().optional(),
    message: z.string().optional()
});

const OutputSchema = z.object({
    status: StatusSchema,
    video: z
        .object({
            url: z.string(),
            content_type: z.string(),
            file_name: z.string(),
            file_size: z.number()
        })
        .optional()
});

const AxiosErrorSchema = z.object({
    response: z
        .object({
            status: z.number()
        })
        .optional()
});

const action = createAction({
    description: 'Poll the status of an async MotionMockups video-generation request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch Map provider 404 to a typed ActionError so callers receive a clean not-found message instead of a raw Axios error.
        try {
            response = await nango.get({
                // https://docs.dynamicmockups.com/
                endpoint: `/v1/motion-mockups/status/${encodeURIComponent(input.requestId)}`,
                retries: 3
            });
        } catch (error) {
            const parsedError = AxiosErrorSchema.safeParse(error);
            if (parsedError.success && parsedError.data.response?.status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'MotionMockups request with provided requestId not found.'
                });
            }

            throw error;
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape',
                details: parsed.error.message
            });
        }

        const providerResponse = parsed.data;

        if (providerResponse.success === false) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message ?? 'The provider did not return the MotionMockups request status.'
            });
        }

        if (!providerResponse.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape'
            });
        }

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
