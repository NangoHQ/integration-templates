import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('The ID of the Auth0 organization. Example: "org_abc123"'),
    members: z.array(z.string()).describe('Array of user IDs to remove from the organization. Example: ["auth0|user123", "auth0|user456"]')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the members were successfully removed.')
});

const action = createAction({
    description: 'Remove members from an organization in Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:organizations', 'update:organizations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://auth0.com/docs/api/management/v2/organizations/delete-organization-members
        await nango.delete({
            endpoint: `/api/v2/organizations/${encodeURIComponent(input.organization_id)}/members`,
            data: {
                members: input.members
            },
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
