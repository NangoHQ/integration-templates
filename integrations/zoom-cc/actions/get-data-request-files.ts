import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    request_id: z.string().describe('Data request ID. Example: "2085327946910044162"')
});

const ProviderFileSchema = z
    .object({
        file_name: z.string(),
        file_size: z.number().optional(),
        download_url: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        request_id: z.string().optional(),
        files_count: z.number().optional(),
        files: z.array(ProviderFileSchema).optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    request_id: z.string().optional(),
    files_count: z.number().optional(),
    files: z.array(
        z.object({
            file_name: z.string(),
            file_size: z.number().optional(),
            download_url: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'List the downloadable export files produced by a completed EXPORT data request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data_request:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const isFilesNotReadyError = (error: unknown): boolean => {
            if (typeof error !== 'object' || error === null) {
                return false;
            }

            const status = 'status' in error ? error.status : undefined;
            const payload = 'payload' in error && typeof error.payload === 'object' && error.payload !== null ? error.payload : null;
            if (status === 400 && payload !== null && 'code' in payload && payload.code === 14103) {
                return true;
            }

            const response = 'response' in error && typeof error.response === 'object' && error.response !== null ? error.response : null;
            if (response !== null) {
                const responseStatus = 'status' in response ? response.status : undefined;
                const data = 'data' in response && typeof response.data === 'object' && response.data !== null ? response.data : null;
                if (responseStatus === 400 && data !== null && 'code' in data && data.code === 14103) {
                    return true;
                }
            }

            if ('code' in error && error.code === 14103) {
                return true;
            }

            return false;
        };

        let response;
        // @allowTryCatch: Zoom returns 400 code 14103 when files are not ready yet (files_count:0).
        // We recover from this to return an empty file list instead of failing the action.
        try {
            response = await nango.get({
                // https://developers.zoom.us/docs/api/
                endpoint: `/v2/data_requests/requests/${encodeURIComponent(input.request_id)}`,
                retries: 3
            });
        } catch (error: unknown) {
            if (isFilesNotReadyError(error)) {
                return {
                    request_id: input.request_id,
                    files_count: 0,
                    files: []
                };
            }

            throw error;
        }

        if (!response) {
            throw new nango.ActionError({
                type: 'unexpected',
                message: 'No response received from Zoom API.'
            });
        }

        if (response.status === 400) {
            const errorBody = z.object({ code: z.number() }).safeParse(response.data);
            if (errorBody.success && errorBody.data.code === 14103) {
                return {
                    request_id: input.request_id,
                    files_count: 0,
                    files: []
                };
            }

            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Zoom API returned an unexpected 400 error.',
                details: response.data
            });
        }

        if (response.status !== 200) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Unexpected status code: ${response.status}`,
                details: response.data
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            request_id: providerData.request_id,
            files_count: providerData.files_count,
            files: (providerData.files || []).map((file) => ({
                file_name: file.file_name,
                file_size: file.file_size,
                download_url: file.download_url
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
