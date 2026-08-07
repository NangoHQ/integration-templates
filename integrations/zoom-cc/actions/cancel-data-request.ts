import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    requestId: z.string().describe('The data compliance request ID to cancel. Example: "2085327946910044162"')
});

const ProviderResponseSchema = z
    .object({
        request_id: z.string().optional(),
        state: z.string().optional(),
        emails: z.array(z.string()).optional(),
        request_type: z.string().optional(),
        created_at: z.string().optional(),
        files_count: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    requestId: z.string(),
    success: z.boolean(),
    state: z.string().optional(),
    errorCode: z.number().optional(),
    errorMessage: z.string().optional()
});

// Zoom's documented "request cannot be canceled" error for this endpoint.
const NOT_CANCELABLE_CODE = 14106;

function getNotCancelableError(payload: unknown): { code: number; message: string } | null {
    if (
        typeof payload === 'object' &&
        payload !== null &&
        'code' in payload &&
        payload.code === NOT_CANCELABLE_CODE &&
        'message' in payload &&
        typeof payload.message === 'string'
    ) {
        return { code: payload.code, message: payload.message };
    }
    return null;
}

const action = createAction({
    description: 'Cancel a pending data export/deletion request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data_request:delete:request:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.zoom.us/docs/api/rest/data-compliance/
            endpoint: `/v2/data_requests/requests/${encodeURIComponent(input.requestId)}`,
            retries: 3
        };

        // @allowTryCatch Zoom returns 400 code 14106 when a request is no longer cancelable
        // (e.g. already processing/completed). We surface that as a typed failure instead of
        // silently reporting success; any other error is rethrown.
        try {
            const response = await nango.delete(config);

            if (response.status === 400) {
                const notCancelable = getNotCancelableError(response.data);
                if (notCancelable) {
                    return {
                        requestId: input.requestId,
                        success: false,
                        errorCode: notCancelable.code,
                        errorMessage: notCancelable.message
                    };
                }
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Zoom API returned an unexpected 400 error.',
                    details: response.data
                });
            }

            if (!response.data) {
                return {
                    requestId: input.requestId,
                    success: true
                };
            }

            const providerResponse = ProviderResponseSchema.parse(response.data);

            return {
                requestId: providerResponse.request_id ?? input.requestId,
                success: true,
                ...(providerResponse.state !== undefined && { state: providerResponse.state })
            };
        } catch (err) {
            const errorResponse = z
                .object({
                    response: z.object({
                        data: z.unknown().optional(),
                        status: z.number().optional()
                    })
                })
                .safeParse(err);

            const nangoErrorResponse = z
                .object({
                    status: z.number(),
                    payload: z.unknown().optional()
                })
                .safeParse(err);

            const payload = errorResponse.success ? errorResponse.data.response.data : nangoErrorResponse.success ? nangoErrorResponse.data.payload : null;
            const status = errorResponse.success ? errorResponse.data.response.status : nangoErrorResponse.success ? nangoErrorResponse.data.status : null;

            if (status === 400) {
                const notCancelable = getNotCancelableError(payload);
                if (notCancelable) {
                    return {
                        requestId: input.requestId,
                        success: false,
                        errorCode: notCancelable.code,
                        errorMessage: notCancelable.message
                    };
                }
            }

            throw err;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
