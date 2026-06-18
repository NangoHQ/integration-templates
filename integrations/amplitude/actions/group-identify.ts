import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    group_type: z.string().describe('Group type. Example: "org id"'),
    group_value: z.string().describe('Group value. Example: "12345678"'),
    group_properties: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const IngestionResponseSchema = z
    .object({
        code: z.number().optional(),
        server_upload_time: z.number().optional(),
        payload_size_bytes: z.number().optional(),
        events_ingested: z.number().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update group properties',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/group-identify',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const creds = connection.credentials;
        const apiKey =
            creds != null && typeof creds === 'object'
                ? 'apiKey' in creds && typeof creds.apiKey === 'string'
                    ? creds.apiKey
                    : 'username' in creds && typeof creds.username === 'string'
                      ? creds.username
                      : undefined
                : undefined;

        if (!apiKey) {
            throw new nango.ActionError({
                type: 'missing_credentials',
                message: 'API key is missing from the connection credentials.'
            });
        }

        const identification = {
            group_type: input.group_type,
            group_value: input.group_value,
            ...(input.group_properties !== undefined && { group_properties: input.group_properties })
        };

        const body = new URLSearchParams();
        body.append('api_key', apiKey);
        body.append('identification', JSON.stringify(identification));

        const response = await nango.post({
            // https://amplitude.com/docs/apis/analytics/group-identify
            endpoint: '/groupidentify',
            baseUrlOverride: 'https://api2.amplitude.com',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: body.toString(),
            retries: 1
        });

        if (response.status !== 200 && response.status !== 204) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `Unexpected status code: ${response.status}`,
                status: response.status
            });
        }

        const responseData =
            typeof response.data === 'string' && response.data === 'success' ? { success: true } : IngestionResponseSchema.parse(response.data);

        if (typeof responseData === 'object' && 'code' in responseData && responseData.code != null && responseData.code !== 200) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `Unexpected response code: ${responseData.code}`,
                code: responseData.code
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
