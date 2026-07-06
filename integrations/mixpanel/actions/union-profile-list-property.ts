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
            'Could not resolve a Mixpanel project token. Set "project_token" in connection metadata or ensure the connection credentials include a password.'
    });
}

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

        const token = await resolveProjectToken(nango);

        const body = [
            {
                $token: token,
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

        let status: number | undefined;
        let error: string | undefined;

        if (typeof response.data === 'number') {
            status = response.data;
        } else if (typeof response.data === 'object' && response.data !== null) {
            const data = response.data;
            status = typeof data === 'object' && 'status' in data && typeof data.status === 'number' ? data.status : 0;
            error = typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : undefined;
        }

        if (status !== 1) {
            throw new nango.ActionError({
                type: 'mixpanel_error',
                message: error || 'Mixpanel profile union failed',
                status: status ?? 0
            });
        }

        return {
            status,
            ...(error !== undefined && { error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
