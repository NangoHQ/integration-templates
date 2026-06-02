import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The ID of the user to list sessions for. Example: "auth0|123456789"')
});

const ProviderSessionSchema = z
    .object({
        id: z.string(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        authenticated_at: z.string().optional(),
        authentication: z.unknown().optional(),
        device: z.unknown().optional(),
        ip: z.string().optional(),
        last_ip: z.string().optional(),
        client_id: z.string().optional(),
        user_id: z.string().optional()
    })
    .passthrough();

const ProviderListResponseSchema = z.object({
    sessions: z.array(ProviderSessionSchema).default([]),
    next: z.string().optional()
});

const SessionSchema = z
    .object({
        id: z.string(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        authenticated_at: z.string().optional(),
        authentication: z.unknown().optional(),
        device: z.unknown().optional(),
        ip: z.string().optional(),
        last_ip: z.string().optional(),
        client_id: z.string().optional(),
        user_id: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    sessions: z.array(SessionSchema)
});

const action = createAction({
    description: 'List active sessions for a user in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-user-sessions',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:sessions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const sessions: z.infer<typeof SessionSchema>[] = [];
        let cursor: string | undefined;

        do {
            // https://auth0.com/docs/api/management/v2/users/get-sessions-for-user
            const response = await nango.get({
                endpoint: `/api/v2/users/${encodeURIComponent(input.userId)}/sessions`,
                params: {
                    take: '100',
                    ...(cursor !== undefined && { from: cursor })
                },
                retries: 3
            });

            const parsed = ProviderListResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected response format from Auth0 user sessions endpoint.',
                    details: parsed.error.message
                });
            }

            sessions.push(...parsed.data.sessions);
            cursor = parsed.data.next;
        } while (cursor !== undefined);

        return {
            sessions
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
