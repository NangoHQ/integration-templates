import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural. Example: "workspace1234.1606743986126"'),
        userId: z.string().describe('Unique identifier of the mural member whose permissions to update. Example: "u52e51aca4cb3d8d592b89313"'),
        facilitator: z.boolean().describe('Whether the member should have facilitator permissions on the mural. Set to false to revoke facilitator access.')
    })
    .describe('Identifies the mural member and the facilitator permission flag to apply.');

const OutputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural whose member was updated.'),
        userId: z.string().describe('Unique identifier of the mural member that was updated.'),
        facilitator: z.boolean().describe('The facilitator permission flag that was applied to the member.')
    })
    .describe('The facilitator permission flag that was applied to the mural member.');

/**
 * @tags: [write, destructive]
 * @tagReason: Mutates a mural member's permission via the provider API, and setting facilitator to false revokes an existing permission.
 * @pitfalls: The API returns an empty 200 body, so the echoed output does not confirm the change was persisted; only a mural owner can update permissions, and role-based workspaces may reject the facilitator flag with no role id alternative available in this action.
 */
const action = createAction({
    description: "Update a mural member's facilitator permission flag.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['murals:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.mural.co/public/reference/updatemuralmemberpermissions
        await nango.patch({
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/users/${encodeURIComponent(input.userId)}/permissions`,
            data: {
                facilitator: input.facilitator
            },
            retries: 3
        });

        return {
            muralId: input.muralId,
            userId: input.userId,
            facilitator: input.facilitator
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
