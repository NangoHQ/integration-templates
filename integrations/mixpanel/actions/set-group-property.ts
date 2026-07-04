import { z } from 'zod';
import { createAction } from 'nango';
import type { NangoAction } from 'nango';

function resolveIngestionHost(region: string | undefined | null): string {
    const normalized = region?.trim().toLowerCase();

    if (normalized === 'eu' || normalized === 'api-eu') {
        return 'https://api-eu.mixpanel.com';
    }

    if (normalized === 'in' || normalized === 'api-in') {
        return 'https://api-in.mixpanel.com';
    }

    return 'https://api.mixpanel.com';
}

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

const InputSchema = z.object({
    group_key: z.string().describe('The group key. Example: "company_id"'),
    group_id: z.string().describe('The group ID. Example: "acme-corp"'),
    properties: z.record(z.string(), z.unknown()).describe('Properties to set on the group profile.')
});

const ProviderResponseSchema = z.object({
    status: z.number(),
    error: z.string().nullable().optional()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const ConnectionSchema = z.object({
    metadata: z
        .object({
            region: z.string().optional()
        })
        .passthrough()
        .optional()
});

const action = createAction({
    description: 'Set or update group profile properties.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const parsedConnection = ConnectionSchema.parse(connection);
        const host = resolveIngestionHost(parsedConnection.metadata?.region);
        const token = await resolveProjectToken(nango);

        const response = await nango.post({
            // https://developer.mixpanel.com/reference/group-set-property
            endpoint: '/groups',
            baseUrlOverride: host,
            params: {
                verbose: 1
            },
            data: [
                {
                    $token: token,
                    $group_key: input.group_key,
                    $group_id: input.group_id,
                    $set: input.properties
                }
            ],
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status !== 1) {
            throw new nango.ActionError({
                type: 'api_error',
                message: providerResponse.error || 'Mixpanel group set operation failed'
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
