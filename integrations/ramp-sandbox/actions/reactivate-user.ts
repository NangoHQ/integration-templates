import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        user_id: z.string().describe('The unique identifier of the Ramp user to reactivate. Example: "01a13a02-d3bd-7ce0-81d5-14bd9805388f"')
    })
    .describe('Input for reactivating a previously-deactivated Ramp user.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether Ramp accepted the reactivation request.')
    })
    .describe('Result of the Ramp user reactivation request.');

/**
 * @tags: [write]
 * @tagReason: Reactivates a user by mutating their provider-side status; the change is reversible by deactivating again.
 * @pitfalls: Reactivating an already-active user also succeeds, so a true success result does not necessarily mean the user's status changed.
 */
const action = createAction({
    description: 'Reactivate a previously-deactivated user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.ramp.com/developer-api/v1/api/users#patch-developer-v1-users-user-id-reactivate
            endpoint: `/developer/v1/users/${encodeURIComponent(input.user_id)}/reactivate`,
            data: {},
            retries: 3
        };

        await nango.patch(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
