import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the bulk file to stop processing. Example: "940"')
});

const ProviderResponseSchema = z.object({
    result: z.string().optional(),
    error: z.string().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

function isErrorWithResponse(err: unknown): err is { response?: { status?: number; data?: unknown } } {
    return err !== null && typeof err === 'object' && 'response' in err;
}

const action = createAction({
    description: 'Halt in-progress verification of an uploaded bulk file.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const token = await nango.getToken();
        const apiKey = typeof token === 'string' ? token : token && 'apiKey' in token ? token.apiKey : undefined;

        if (!apiKey) {
            throw new nango.ActionError({
                type: 'missing_credentials',
                message: 'API key not found in connection credentials.'
            });
        }

        let response;
        // @allowTryCatch The Bulk API stop endpoint returns a bare
        // non-JSON "Error 404" body for nonexistent file_ids. We catch
        // transport-level failures so we can surface them as structured
        // ActionErrors instead of unhandled exceptions.
        try {
            // https://developer.millionverifier.com/
            response = await nango.get({
                endpoint: '/bulkapi/stop',
                params: {
                    key: apiKey,
                    file_id: input.file_id
                },
                baseUrlOverride: 'https://bulkapi.millionverifier.com',
                retries: 3
            });
        } catch (err) {
            if (isErrorWithResponse(err)) {
                const status = err.response?.status;
                const data = err.response?.data;

                if (status === 404) {
                    throw new nango.ActionError({
                        type: 'file_not_found',
                        message: 'The requested bulk file was not found or is not in progress.',
                        file_id: input.file_id,
                        raw_response: typeof data === 'string' ? data : JSON.stringify(data)
                    });
                }

                throw new nango.ActionError({
                    type: 'provider_error',
                    message: `Provider returned HTTP ${status}.`,
                    raw_response: typeof data === 'string' ? data : JSON.stringify(data)
                });
            }

            throw new nango.ActionError({
                type: 'unknown_error',
                message: err instanceof Error ? err.message : 'An unknown error occurred while stopping the bulk file.'
            });
        }

        if (typeof response.data === 'string') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider returned an unexpected non-JSON response.',
                raw_response: response.data
            });
        }

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider returned an unexpected response shape.',
                raw_response: JSON.stringify(response.data)
            });
        }

        if (providerResponse.data.error) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.data.error,
                file_id: input.file_id
            });
        }

        return {
            success: providerResponse.data.result === 'ok',
            ...(providerResponse.data.result && { message: providerResponse.data.result })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
