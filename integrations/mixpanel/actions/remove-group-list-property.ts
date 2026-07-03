import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    token: z.string().describe('Mixpanel project token. Example: "abc123"'),
    group_key: z.string().describe('Group key. Example: "company"'),
    group_id: z.string().describe('Group ID. Example: "mixpanel"'),
    property_name: z.string().describe('Name of the list property to remove values from.'),
    values: z.array(z.unknown()).describe('Values to remove from the list property.')
});

const ProviderResponseSchema = z.object({
    status: z.number().optional(),
    error: z.string().nullable().optional()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Remove values from a group profile list property.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = [
            {
                $token: input.token,
                $group_key: input.group_key,
                $group_id: input.group_id,
                $remove: {
                    [input.property_name]: input.values
                }
            }
        ];

        // https://developer.mixpanel.com/reference/group-remove-from-list-property
        const response = await nango.post({
            endpoint: '/groups',
            baseUrlOverride: 'https://api.mixpanel.com',
            params: {
                verbose: '1',
                ip: '0'
            },
            data: body,
            retries: 1
        });

        let status: number | undefined;
        let errorMessage: string | null | undefined;

        if (typeof response.data === 'number') {
            status = response.data;
        } else if (typeof response.data === 'string') {
            const parsed = Number(response.data);
            if (!Number.isNaN(parsed)) {
                status = parsed;
            }
        } else if (typeof response.data === 'object' && response.data !== null) {
            const parsed = ProviderResponseSchema.safeParse(response.data);
            if (parsed.success) {
                status = parsed.data.status;
                errorMessage = parsed.data.error;
            }
        }

        if (status === 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: errorMessage || 'Mixpanel returned an error.'
            });
        }

        if (status !== 1) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Mixpanel.'
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
