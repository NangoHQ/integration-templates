import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    path: z.string().describe('Google Ads mutate endpoint path. Example: "v21/customers/1781900691/campaigns:mutate"'),
    body: z.record(z.string(), z.unknown()).describe('Mutate request body without validateOnly. Example: {"operations":[{"create":{...}}]}'),
    loginCustomerId: z.string().optional().describe('Manager customer ID for MCC hierarchy. Example: "3608201627"')
});

const OutputSchema = z.object({}).passthrough();

const action = createAction({
    description: 'Validate a mutate request without applying changes.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const developerToken = connection.connection_config?.['developer_token'];
        if (!developerToken || typeof developerToken !== 'string') {
            throw new nango.ActionError({
                type: 'missing_config',
                message: 'developer_token is required in connection config'
            });
        }

        const headers: Record<string, string> = {
            'developer-token': developerToken
        };

        if (input.loginCustomerId) {
            headers['login-customer-id'] = input.loginCustomerId;
        }

        const response = await nango.post({
            // https://developers.google.com/google-ads/api/docs/mutating/service-mutates
            endpoint: input.path,
            data: {
                ...input.body,
                validateOnly: true
            },
            headers,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
