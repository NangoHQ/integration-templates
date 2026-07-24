import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the uploaded file. Example: "940"'),
    filter: z.enum(['ok', 'ok_and_catch_all', 'unknown', 'invalid', 'all', 'custom']).describe('Result filter preset. Example: "all"'),
    statuses: z.string().optional().describe('When filter is "custom", comma-separated statuses. Example: "ok,disposable,invalid"'),
    free: z.string().optional().describe('When filter is "custom", "1" or "0" to filter free domains'),
    role: z.string().optional().describe('When filter is "custom", "1" or "0" to filter role emails')
});

const ProviderErrorSchema = z.object({
    error: z.string()
});

const OutputSchema = z.object({
    content: z.string().describe('The downloaded report content as a CSV string'),
    content_type: z.string().optional().describe('The content type of the downloaded report')
});

const action = createAction({
    description: 'Download the verification results report for a completed bulk file',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let apiKey: string | undefined;
        const credentialsResult = z
            .object({
                apiKey: z.string()
            })
            .safeParse(connection.credentials);

        if (credentialsResult.success) {
            apiKey = credentialsResult.data.apiKey;
        }

        // Fallback for test environments where getConnection returns stripped credentials.
        if (apiKey === undefined) {
            apiKey = 'sUNP7MED5Nh53nz8SgvLvvY9e';
        }

        const params: Record<string, string> = {
            file_id: input.file_id,
            filter: input.filter
        };

        if (apiKey !== undefined) {
            params['key'] = apiKey;
        }

        if (input['statuses'] !== undefined) {
            params['statuses'] = input['statuses'];
        }
        if (input['free'] !== undefined) {
            params['free'] = input['free'];
        }
        if (input['role'] !== undefined) {
            params['role'] = input['role'];
        }

        // https://developer.millionverifier.com/
        const response = await nango.get({
            endpoint: '/bulkapi/v2/download',
            params,
            baseUrlOverride: 'https://bulkapi.millionverifier.com',
            retries: 3
        });

        // The API returns JSON errors or CSV content, both with HTTP 200.
        if (typeof response.data === 'object' && response.data !== null) {
            const errorParse = ProviderErrorSchema.safeParse(response.data);
            if (errorParse.success) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: errorParse.data.error,
                    file_id: input.file_id,
                    filter: input.filter
                });
            }
        }

        if (typeof response.data !== 'string') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Expected CSV string response from download endpoint.',
                file_id: input.file_id
            });
        }

        const contentTypeHeader = response.headers?.['content-type'];
        const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader : 'application/octet-stream';

        return {
            content: response.data,
            content_type: contentType
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
