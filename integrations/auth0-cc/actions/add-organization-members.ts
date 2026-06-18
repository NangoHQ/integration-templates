import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organizationId: z.string().describe('Organization identifier. Example: "org_abc123"'),
    members: z.array(z.string()).min(1).describe('List of user IDs to add as members. Example: ["auth0|123"]')
});

const OutputSchema = z.object({
    organizationId: z.string(),
    members: z.array(z.string())
});

const action = createAction({
    description: 'Add members to an organization in Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['create:organization_members'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.post({
            // https://auth0.com/docs/api/management/v2/organizations/post-members
            endpoint: `/api/v2/organizations/${encodeURIComponent(input.organizationId)}/members`,
            data: {
                members: input.members
            },
            retries: 3
        });

        return {
            organizationId: input.organizationId,
            members: input.members
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
