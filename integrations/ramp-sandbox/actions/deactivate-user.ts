import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        user_id: z.string().describe('Unique identifier of the Ramp user to deactivate. Example: "01a13a02-d3bd-7ce0-81d5-14bd9805388f"')
    })
    .describe('Identifies the Ramp user to deactivate.');

const ProviderUserSchema = z.object({
    id: z.string(),
    status: z.string(),
    email: z.string().optional()
});

const OutputSchema = z
    .object({
        user_id: z.string().describe('Unique identifier of the deactivated user. Example: "01a13a02-d3bd-7ce0-81d5-14bd9805388f"'),
        status: z.string().describe('The user status after deactivation, normally "USER_INACTIVE". Example: "USER_INACTIVE"'),
        email: z.string().optional().describe('Email address of the deactivated user. Example: "user@company.com"')
    })
    .describe('The deactivated user and their resulting status.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deactivates a Ramp user, freezing their cards and revoking login and notification access; a difficult-to-reverse provider state change that is only undone by reactivating the user.
 * @pitfalls: Deactivation is idempotent, so calling it on an already-inactive user still succeeds as a no-op; an unknown user_id fails with a 404; the user's cards freeze and login/notifications stop, and the change is reversible only by reactivating the user.
 */
const action = createAction({
    description: 'Deactivate a user, revoking login, card-spend, and notification access.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:read', 'users:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.ramp.com/developer-api/v1/user-lifecycle (PATCH /developer/v1/users/{user_id}/deactivate)
        // Deactivation is idempotent (a no-op on an already-inactive user), so retrying a lost response is safe.
        await nango.patch({
            endpoint: `/developer/v1/users/${encodeURIComponent(input.user_id)}/deactivate`,
            data: {},
            retries: 3
        });

        // https://docs.ramp.com/developer-api/v1/user-lifecycle (GET /developer/v1/users/{user_id})
        const response = await nango.get({
            endpoint: `/developer/v1/users/${encodeURIComponent(input.user_id)}`,
            retries: 3
        });

        const user = ProviderUserSchema.parse(response.data);

        return {
            user_id: user.id,
            status: user.status,
            ...(user.email != null && { email: user.email })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
