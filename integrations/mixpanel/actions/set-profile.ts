import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    token: z.string().describe('Mixpanel project token. Example: "4040293"'),
    distinct_id: z.string().describe('Unique identifier for the user profile. Example: "user-123"'),
    properties: z.record(z.string(), z.unknown()).describe('Profile properties to set'),
    ip: z.number().min(0).max(1).optional().describe('If 0, Mixpanel will not perform geolocation parsing using the request IP. Defaults to 1.'),
    strict: z.number().min(0).max(1).optional().describe('If 1, Mixpanel will validate records and return per-record error messages. Defaults to 0.'),
    verbose: z.number().min(0).max(1).optional().describe('If 1, Mixpanel will respond with a JSON object describing success or failure. Defaults to 0.')
});

const ProviderResponseSchema = z.union([
    z.object({
        status: z.union([z.literal(1), z.literal(0)]),
        error: z.string().nullable().optional(),
        num_good_events: z.number().optional()
    }),
    z.number(),
    z.string()
]);

const OutputSchema = z.object({
    status: z.union([z.literal(1), z.literal(0)]),
    error: z.string().optional(),
    num_good_events: z.number().optional()
});

const action = createAction({
    description: 'Create or update an Engage profile.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload = {
            $token: input.token,
            $distinct_id: input.distinct_id,
            $set: input.properties
        };

        const data = Buffer.from(JSON.stringify(payload)).toString('base64');

        const response = await nango.post({
            // https://developer.mixpanel.com/reference/profile-set
            endpoint: '/engage',
            baseUrlOverride: 'https://api.mixpanel.com',
            params: {
                data,
                ...(input.ip !== undefined && { ip: String(input.ip) }),
                ...(input.strict !== undefined && { strict: String(input.strict) }),
                ...(input.verbose !== undefined && { verbose: String(input.verbose) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (typeof providerResponse === 'number') {
            const status = providerResponse === 1 ? 1 : 0;
            return {
                status,
                ...(status === 0 && { error: 'Request failed' })
            };
        }

        if (typeof providerResponse === 'string') {
            const status = providerResponse === '1' ? 1 : 0;
            return {
                status,
                ...(status === 0 && { error: 'Request failed' })
            };
        }

        const status = providerResponse.status === 1 ? 1 : 0;
        return {
            status,
            ...(providerResponse.error !== undefined && providerResponse.error !== null && { error: providerResponse.error }),
            ...(providerResponse.num_good_events !== undefined && { num_good_events: providerResponse.num_good_events })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
