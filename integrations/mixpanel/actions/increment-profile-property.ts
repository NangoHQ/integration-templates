import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    distinct_id: z.string().describe('Unique identifier for the user profile. Example: "user-123"'),
    properties: z.record(z.string(), z.number()).describe('Numeric properties to increment. Negative values decrement. Example: {"logins": 1}')
});

const ProviderResponseSchema = z.object({
    status: z.number(),
    num_good_events: z.number(),
    error: z.string().nullable(),
    errors: z.record(z.string(), z.array(z.unknown())).nullable()
});

const MetadataSchema = z.object({
    project_token: z.string().describe('Mixpanel project token or API secret. Used as a fallback when connection credentials are unavailable.')
});

const OutputSchema = z.object({
    status: z.number(),
    num_good_events: z.number(),
    error: z.string().nullable().optional(),
    errors: z.record(z.string(), z.array(z.unknown())).nullable().optional()
});

const action = createAction({
    description: 'Increment numeric user profile properties',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connectionResult = await nango.getConnection();

        const ConnectionSchema = z.object({
            credentials: z.object({
                password: z.string()
            })
        });

        const connectionParsed = ConnectionSchema.safeParse(connectionResult);
        let token: string | undefined;
        if (connectionParsed.success) {
            token = connectionParsed.data.credentials.password;
        }

        if (!token) {
            const metadataResult = await nango.getMetadata();
            const metadataParsed = MetadataSchema.safeParse(metadataResult);
            if (metadataParsed.success) {
                token = metadataParsed.data.project_token;
            }
        }

        if (!token) {
            throw new nango.ActionError({
                type: 'invalid_credentials',
                message: 'Could not retrieve a valid Mixpanel token from the connection credentials or metadata.'
            });
        }

        // https://developer.mixpanel.com/reference/profile-increment-numeric-property
        const response = await nango.post({
            baseUrlOverride: 'https://api.mixpanel.com',
            endpoint: '/engage',
            params: {
                strict: '1'
            },
            data: [
                {
                    $token: token,
                    $distinct_id: input.distinct_id,
                    $add: input.properties
                }
            ],
            retries: 10
        });

        const rawData = response.data;

        if (typeof rawData === 'string') {
            const status = rawData.trim() === '1' ? 1 : 0;
            return {
                status,
                num_good_events: status
            };
        }

        if (rawData === null || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response format from Mixpanel.',
                response: rawData
            });
        }

        const parsed = ProviderResponseSchema.safeParse(rawData);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Response did not match expected schema.',
                response: rawData
            });
        }

        if (parsed.data.status !== 1) {
            throw new nango.ActionError({
                type: 'mixpanel_error',
                message: parsed.data.error || 'Profile increment failed',
                num_good_events: parsed.data.num_good_events,
                errors: parsed.data.errors
            });
        }

        return {
            status: parsed.data.status,
            num_good_events: parsed.data.num_good_events,
            ...(parsed.data.error != null && { error: parsed.data.error }),
            ...(parsed.data.errors != null && { errors: parsed.data.errors })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
