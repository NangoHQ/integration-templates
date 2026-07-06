import { z } from 'zod';
import { createAction } from 'nango';
import type { NangoAction } from 'nango';

const InputSchema = z.object({
    alias: z.string().describe('The new alias to map to the distinct_id. Example: "user-123-alias"'),
    distinct_id: z.string().describe('The existing distinct_id to alias. Example: "user-123"'),
    token: z.string().optional().describe('Optional project token. If omitted, the service account secret from the connection is used.')
});

const VerboseResponseSchema = z.object({
    status: z.number(),
    error: z.string().optional().nullable()
});

const OutputSchema = z.object({
    success: z.boolean(),
    alias: z.string(),
    distinct_id: z.string()
});

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

const action = createAction({
    description: 'Create an alias.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const token = await resolveProjectToken(nango, input.token);

        const response = await nango.post({
            // https://developer.mixpanel.com/reference/identity-create-alias
            endpoint: '/track',
            baseUrlOverride: 'https://api.mixpanel.com',
            params: {
                verbose: '1'
            },
            data: [
                {
                    event: '$create_alias',
                    properties: {
                        token: token,
                        distinct_id: input.distinct_id,
                        alias: input.alias
                    }
                }
            ],
            retries: 3
        });

        const responseData: unknown = response.data;
        let success = false;

        if (typeof responseData === 'number') {
            success = responseData === 1;
        } else if (typeof responseData === 'object' && responseData !== null) {
            const parsed = VerboseResponseSchema.safeParse(responseData);
            if (parsed.success) {
                success = parsed.data.status === 1;
            }
        }

        if (!success) {
            let errorMessage = 'Failed to create alias';
            if (typeof responseData === 'object' && responseData !== null && 'error' in responseData && responseData.error != null) {
                errorMessage = String(responseData.error);
            }

            throw new nango.ActionError({
                type: 'provider_error',
                message: errorMessage,
                alias: input.alias,
                distinct_id: input.distinct_id
            });
        }

        return {
            success: true,
            alias: input.alias,
            distinct_id: input.distinct_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
