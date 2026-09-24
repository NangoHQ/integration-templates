import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        user: z.string().describe('Amplitude ID, Device ID, User ID, or User ID prefix to search for. Example: "myusername" or "356893043036"')
    })
    .describe('Input for searching Amplitude users by identifier.');

const ProviderMatchSchema = z.object({
    user_id: z.string().describe('The user ID of the matching user.'),
    amplitude_id: z.number().describe('The Amplitude ID of the matching user.')
});

const ProviderResponseSchema = z.object({
    matches: z.array(ProviderMatchSchema).describe('Array of matching users.'),
    type: z.string().describe('The match type that yielded the result, e.g. "match_user_or_device_id" or "nomatch".')
});

const OutputSchema = z
    .object({
        matches: z
            .array(
                z.object({
                    user_id: z.string().describe('The user ID of the matching user.'),
                    amplitude_id: z.number().describe('The Amplitude ID of the matching user.')
                })
            )
            .describe('Array of matching users. Empty when no users are found.'),
        type: z.string().describe('The match type that yielded the result, e.g. "match_user_or_device_id" or "nomatch".')
    })
    .describe('Result of an Amplitude user search, including matched users and the match type.');

/**
 * @tags: [read]
 * @tagReason: Performs a read-only search against the Amplitude user database.
 * @pitfalls: User search has a dedicated rate limit of 360 queries per hour and up to 10 concurrent requests, separate from the general Dashboard REST API limits.
 */
const action = createAction({
    description: 'Search for users by Amplitude ID, device ID, user ID, or user ID prefix.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const hostname = connection.connection_config?.['hostname'];
        const baseUrlOverride = hostname === 'analytics.eu.amplitude.com' ? 'https://analytics.eu.amplitude.com' : undefined;

        // https://amplitude.com/docs/apis/analytics/dashboard-rest#user-search
        const response = await nango.get({
            endpoint: '/api/2/usersearch',
            params: {
                user: input.user
            },
            baseUrlOverride,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Amplitude user search API.',
                details: parsed.error.issues
            });
        }

        return {
            matches: parsed.data.matches,
            type: parsed.data.type
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
