import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('Organization ID. Example: "org_abc123"'),
    invitation_id: z.string().describe('Invitation ID. Example: "inv_abc123"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a pending invitation to an organization in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-organization-invitation',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['delete:organization_invitations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedOrgId = encodeURIComponent(input.organization_id);
        const encodedInvitationId = encodeURIComponent(input.invitation_id);

        await nango.delete({
            // https://auth0.com/docs/api/management/v2/organizations/delete-organization-invitation
            endpoint: `/api/v2/organizations/${encodedOrgId}/invitations/${encodedInvitationId}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
