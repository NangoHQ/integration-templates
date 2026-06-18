import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    amplitude_id: z.string().describe('The Amplitude ID to be removed from a deletion job. Example: "1234567"'),
    job_start_day: z.string().describe('The day the deletion job is scheduled for. Format: YYYY-MM-DD. Example: "2024-01-15"')
});

const ProviderResponseSchema = z.object({
    amplitude_id: z.union([z.string(), z.number()]),
    requested_on_day: z.string(),
    requester: z.string()
});

const OutputSchema = z.object({
    amplitude_id: z.string().describe('The Amplitude ID of the user that was removed from the job'),
    requested_on_day: z.string().optional().describe('The day this deletion was requested'),
    requester: z.string().optional().describe('The person who requested the deletion')
});

const action = createAction({
    description: 'Remove an Amplitude ID from a deletion job',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-user-from-deletion-job',
        group: 'User Privacy'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const hostname =
            typeof connection.connection_config === 'object' &&
            connection.connection_config !== null &&
            'hostname' in connection.connection_config &&
            typeof connection.connection_config['hostname'] === 'string'
                ? connection.connection_config['hostname']
                : 'amplitude.com';

        // https://amplitude.com/docs/apis/analytics/user-privacy
        const response = await nango.delete({
            endpoint: `/api/2/deletions/users/${encodeURIComponent(input.amplitude_id)}/${encodeURIComponent(input.job_start_day)}`,
            baseUrlOverride: `https://${hostname}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            amplitude_id: String(providerResponse.amplitude_id),
            ...(providerResponse.requested_on_day !== undefined && { requested_on_day: providerResponse.requested_on_day }),
            ...(providerResponse.requester !== undefined && { requester: providerResponse.requester })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
