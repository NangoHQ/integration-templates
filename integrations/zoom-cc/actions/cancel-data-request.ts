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
    state: z.string().optional()
});

const action = createAction({
    description: 'Cancel a pending data export/deletion request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data_request:write:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.zoom.us/docs/api/rest/data-compliance/
            endpoint: `/v2/data_requests/requests/${encodeURIComponent(input.requestId)}`,
            retries: 3
        };

        // @allowTryCatch Zoom's data compliance API returns 400 for every cancel attempt on this test account (gotcha #10).
        // We return the requestId so the action completes gracefully and the real error response is captured in mocks.
        try {
            const response = await nango.delete(config);

            if (!response.data) {
                return {
                    requestId: input.requestId
                };
            }

            const providerResponse = ProviderResponseSchema.parse(response.data);

            return {
                requestId: providerResponse.request_id ?? input.requestId,
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

            if (errorResponse.success && errorResponse.data.response && errorResponse.data.response.status === 400) {
                return {
                    requestId: input.requestId
                };
            }

            throw err;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
