import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        user_id: z.string().optional().describe('User ID. Example: "test-user-123"'),
        device_id: z.string().optional().describe('Device ID. Example: "abc-def"'),
        user_properties: z.record(z.string(), z.unknown()).optional().describe('User properties to update. Example: { "plan": "premium" }')
    })
    .refine((d) => d.user_id !== undefined || d.device_id !== undefined, {
        message: 'Either user_id or device_id must be provided.'
    });

const ProviderResponseSchema = z
    .object({
        code: z.number().optional(),
        server_upload_time: z.number().optional(),
        payload_size_bytes: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    success: z.boolean(),
    code: z.number().optional(),
    server_upload_time: z.number().optional(),
    payload_size_bytes: z.number().optional()
});

const action = createAction({
    description: 'Update user properties',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/identify-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const credentials = connection.credentials;

        let apiKey: string | undefined;
        if (credentials?.type === 'API_KEY') {
            apiKey = credentials.apiKey;
        } else if (credentials?.type === 'BASIC') {
            apiKey = credentials.username;
        }

        if (!apiKey) {
            throw new nango.ActionError({
                type: 'missing_credentials',
                message: 'API key is missing from the connection credentials.'
            });
        }

        const identification = {
            ...(input.user_id !== undefined && { user_id: input.user_id }),
            ...(input.device_id !== undefined && { device_id: input.device_id }),
            ...(input.user_properties !== undefined && { user_properties: input.user_properties })
        };

        const identificationJson = JSON.stringify([identification]);
        const body = `api_key=${encodeURIComponent(apiKey)}&identification=${encodeURIComponent(identificationJson)}`;

        // https://amplitude.com/docs/apis/analytics/identify
        const response = await nango.post({
            endpoint: '/identify',
            baseUrlOverride: 'https://api2.amplitude.com',
            data: body,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        });

        if (typeof response.data === 'object' && response.data !== null) {
            const parsed = ProviderResponseSchema.parse(response.data);
            return {
                success: true,
                ...(parsed.code !== undefined && { code: parsed.code }),
                ...(parsed.server_upload_time !== undefined && { server_upload_time: parsed.server_upload_time }),
                ...(parsed.payload_size_bytes !== undefined && { payload_size_bytes: parsed.payload_size_bytes })
            };
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
