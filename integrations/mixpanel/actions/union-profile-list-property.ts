import { z } from 'zod';
import { createAction } from 'nango';

const UnionValueSchema = z.union([z.string(), z.number()]);

const InputSchema = z.object({
    distinctId: z.string().describe('The distinct ID of the user profile to update. Example: "user-123"'),
    union: z
        .record(z.string(), z.array(UnionValueSchema))
        .describe('An object mapping property names to arrays of values to union into list properties. Example: { "roles": ["admin", "editor"] }'),
    ip: z
        .number()
        .int()
        .min(0)
        .max(1)
        .optional()
        .describe('If 0, Mixpanel will not perform geolocation parsing using the IP address of the request. Defaults to 1.'),
    strict: z
        .number()
        .int()
        .min(0)
        .max(1)
        .optional()
        .describe('If 1, Mixpanel will validate the provided records and return per-record error messages for records that fail validation.'),
    verbose: z
        .number()
        .int()
        .min(0)
        .max(1)
        .optional()
        .describe('If 1, Mixpanel will respond with a JSON object describing the success or failure of the tracking call.')
});

const OutputSchema = z.object({
    status: z.number().int(),
    error: z.string().optional()
});

const action = createAction({
    description: 'Union values into a user profile list property.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.ip !== undefined) {
            params['ip'] = input.ip;
        }
        if (input.strict !== undefined) {
            params['strict'] = input.strict;
        }
        if (input.verbose !== undefined) {
            params['verbose'] = input.verbose;
        }

        const body = [
            {
                $token: 'nango',
                $distinct_id: input.distinctId,
                $union: input.union
            }
        ];

        const response = await nango.post({
            // https://developer.mixpanel.com/reference/user-profile-union
            endpoint: '/engage',
            baseUrlOverride: 'https://api.mixpanel.com',
            data: body,
            params,
            retries: 3
        });

        if (typeof response.data === 'number') {
            return {
                status: response.data
            };
        }

        if (typeof response.data === 'object' && response.data !== null) {
            const data = response.data;
            const status = typeof data === 'object' && 'status' in data && typeof data.status === 'number' ? data.status : 0;
            const error = typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : undefined;
            return {
                status,
                ...(error !== undefined && { error })
            };
        }

        return {
            status: 0
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
