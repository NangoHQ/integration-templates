import { z } from 'zod';
import { createAction } from 'nango';
import type { NangoAction } from 'nango';

const TokenConnectionSchema = z.object({
    credentials: z.object({
        password: z.string()
    })
});

const TokenMetadataSchema = z.object({
    project_token: z.string().optional(),
    token: z.string().optional()
});

async function resolveProjectToken(nango: NangoAction, explicitToken?: string | null): Promise<string> {
    if (explicitToken) {
        return explicitToken;
    }

    const parsedConnection = TokenConnectionSchema.safeParse(await nango.getConnection());
    if (parsedConnection.success && parsedConnection.data.credentials.password) {
        return parsedConnection.data.credentials.password;
    }

    const parsedMetadata = TokenMetadataSchema.safeParse(await nango.getMetadata());
    const metadataToken = parsedMetadata.success ? (parsedMetadata.data.project_token ?? parsedMetadata.data.token) : undefined;
    if (metadataToken) {
        return metadataToken;
    }

    throw new nango.ActionError({
        type: 'missing_token',
        message:
            'Could not resolve a Mixpanel project token. Provide it as input, set "project_token" in connection metadata, or ensure the connection credentials include a password.'
    });
}

const PropertiesSchema = z
    .object({
        distinct_id: z.string().describe('The unique identifier of the user who performed the event. Example: "13793"'),
        time: z.number().optional().describe('The time at which the event occurred, in seconds or milliseconds since UTC epoch. Example: 1609459200'),
        insert_id: z.string().optional().describe('A unique identifier for the event, used for deduplication. Maps to $insert_id. Example: "abc123"')
    })
    .passthrough();

const InputSchema = z.object({
    project_id: z.string().describe('Mixpanel project ID. Example: "4040293"'),
    event: z.string().describe('The name of the event. Example: "Signed Up"'),
    properties: PropertiesSchema.describe('Event properties. Must include distinct_id. Additional properties are passed through to Mixpanel.')
});

const VerboseResponseSchema = z.object({
    status: z.number(),
    error: z.string().nullable().optional()
});

const OutputSchema = z.object({
    status: z.number().describe('1 on success, 0 on failure.'),
    error: z.string().optional().describe('Error message if the request was not successful.')
});

const action = createAction({
    description: 'Track an event.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { distinct_id, time, insert_id, ...rest } = input.properties;

        const apiProperties: Record<string, unknown> = {
            distinct_id,
            ...rest,
            ...(time !== undefined && { time }),
            ...(insert_id !== undefined && { $insert_id: insert_id })
        };

        const existingToken = typeof apiProperties['token'] === 'string' && apiProperties['token'].length > 0 ? apiProperties['token'] : undefined;
        apiProperties['token'] = await resolveProjectToken(nango, existingToken);

        const response = await nango.post({
            // https://developer.mixpanel.com/reference/track-event
            endpoint: '/track',
            baseUrlOverride: 'https://api.mixpanel.com',
            params: {
                project_id: input.project_id,
                verbose: 1
            },
            data: [
                {
                    event: input.event,
                    properties: apiProperties
                }
            ],
            retries: 10
        });

        const verboseResponse = VerboseResponseSchema.parse(response.data);

        if (verboseResponse.status === 0) {
            throw new nango.ActionError({
                type: 'track_failed',
                message: verboseResponse.error || 'Event tracking failed'
            });
        }

        return {
            status: verboseResponse.status,
            ...(verboseResponse.error != null &&
                verboseResponse.error !== '' && {
                    error: verboseResponse.error
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
