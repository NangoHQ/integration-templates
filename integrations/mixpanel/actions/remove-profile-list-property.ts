import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    distinct_id: z.string().describe('The distinct_id of the user profile. Example: "user-123"'),
    property_name: z.string().describe('The name of the list property to modify. Example: "interests"'),
    values: z.array(z.string()).min(1).describe('Values to remove from the list property. Example: ["gaming", "reading"]'),
    project_token: z.string().describe('The Mixpanel project token. Example: "abc123def456"'),
    region: z.enum(['us', 'eu', 'in']).optional().describe('Data residency region. Defaults to "us".')
});

const ProviderResponseSchema = z.object({
    status: z.number(),
    error: z.string().nullable().optional()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Remove values from a user profile list property',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let baseUrl: string;
        if (input.region === 'eu') {
            baseUrl = 'https://api-eu.mixpanel.com';
        } else if (input.region === 'in') {
            baseUrl = 'https://api-in.mixpanel.com';
        } else {
            baseUrl = 'https://api.mixpanel.com';
        }

        const response = await nango.post({
            // https://developer.mixpanel.com/reference/profile-remove-from-list-property
            endpoint: '/engage',
            baseUrlOverride: baseUrl,
            params: {
                ip: 0,
                verbose: 1
            },
            data: [
                {
                    $token: input.project_token,
                    $distinct_id: input.distinct_id,
                    $remove: {
                        [input.property_name]: input.values
                    }
                }
            ],
            retries: 10
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Mixpanel',
                response: response.data
            });
        }

        if (parsed.data.status !== 1) {
            throw new nango.ActionError({
                type: 'operation_failed',
                message: parsed.data.error || 'Failed to remove values from profile list property',
                status: parsed.data.status
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
