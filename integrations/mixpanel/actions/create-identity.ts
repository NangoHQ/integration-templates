import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    identified_id: z.string().describe('A distinct_id to merge with the anon_id. Example: "user@example.com"'),
    anon_id: z
        .string()
        .describe('A distinct_id to merge with the identified_id. Must be UUID v4 format and not already merged to an identified_id. Example: "anon-123"'),
    distinct_id: z
        .string()
        .optional()
        .describe('The distinct ID post-identification (same as identified_id - it will be inferred from identified_id if not included).'),
    token: z.string().optional().describe('The Mixpanel project token. If omitted, it will be read from connection metadata.')
});

const MetadataSchema = z.object({
    token: z.string().optional()
});

const TrackVerboseResponseSchema = z.object({
    status: z.number(),
    error: z.string().nullable()
});

const OutputSchema = z.object({
    success: z.boolean(),
    error: z.string().optional()
});

const action = createAction({
    description: 'Create an identity mapping.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        const token = input.token || metadata.token;

        if (!token) {
            throw new nango.ActionError({
                type: 'missing_token',
                message: 'Mixpanel project token is required. Provide it as input or in connection metadata.'
            });
        }

        const payload = {
            event: '$identify',
            properties: {
                $identified_id: input.identified_id,
                $anon_id: input.anon_id,
                ...(input.distinct_id !== undefined && { distinct_id: input.distinct_id }),
                token
            }
        };

        const response = await nango.post({
            // https://developer.mixpanel.com/reference/create-identity
            endpoint: '/track',
            baseUrlOverride: 'https://api.mixpanel.com',
            params: {
                verbose: '1'
            },
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            data: 'data=' + encodeURIComponent(JSON.stringify(payload)),
            retries: 1
        });

        const parsed = TrackVerboseResponseSchema.safeParse(response.data);
        if (parsed.success) {
            if (parsed.data.status === 1) {
                return { success: true };
            }
            return {
                success: false,
                error: parsed.data.error || 'Unknown error'
            };
        }

        const raw = typeof response.data === 'string' ? response.data.trim() : JSON.stringify(response.data);
        throw new nango.ActionError({
            type: 'unexpected_response',
            message: 'Unexpected response from Mixpanel track API',
            response: raw
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
