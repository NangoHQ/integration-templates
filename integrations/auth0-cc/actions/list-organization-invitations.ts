import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('Organization identifier. Example: "org_0000000000000001"')
});

const OrganizationInvitationInviterSchema = z.object({
    name: z.string()
});

const OrganizationInvitationInviteeSchema = z.object({
    email: z.string()
});

const OrganizationInvitationSchema = z.object({
    id: z.string(),
    organization_id: z.string().optional(),
    inviter: OrganizationInvitationInviterSchema.optional(),
    invitee: OrganizationInvitationInviteeSchema.optional(),
    invitation_url: z.string().optional(),
    created_at: z.string().optional(),
    expires_at: z.string().optional(),
    client_id: z.string().optional(),
    connection_id: z.string().optional(),
    app_metadata: z.record(z.string(), z.unknown()).optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional(),
    roles: z.array(z.string()).optional(),
    ticket_id: z.string().optional()
});

const PaginatedInvitationsSchema = z.object({
    start: z.number().optional(),
    limit: z.number().optional(),
    invitations: z.array(OrganizationInvitationSchema)
});

const OutputSchema = z.object({
    invitations: z.array(OrganizationInvitationSchema)
});

const action = createAction({
    description: 'List pending invitations for an organization in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-organization-invitations',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:organization_invitations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const allInvitations: z.infer<typeof OrganizationInvitationSchema>[] = [];
        let page = 0;
        const perPage = 50;
        let hasMore = true;

        while (hasMore) {
            // https://auth0.com/docs/api/management/v2/organizations/get-invitations
            const response = await nango.get({
                endpoint: `/api/v2/organizations/${encodeURIComponent(input.organization_id)}/invitations`,
                params: {
                    page: String(page),
                    per_page: String(perPage)
                },
                retries: 3
            });

            let invitations: z.infer<typeof OrganizationInvitationSchema>[] = [];

            if (Array.isArray(response.data)) {
                invitations = response.data
                    .map((item: unknown) => {
                        const parsed = OrganizationInvitationSchema.safeParse(item);
                        return parsed.success ? parsed.data : null;
                    })
                    .filter((item): item is z.infer<typeof OrganizationInvitationSchema> => item !== null);
            } else if (response.data && typeof response.data === 'object') {
                const parsed = PaginatedInvitationsSchema.safeParse(response.data);
                if (parsed.success) {
                    invitations = parsed.data.invitations;
                }
            }

            if (invitations.length === 0) {
                hasMore = false;
            } else {
                allInvitations.push(...invitations);
                page += 1;
                if (invitations.length < perPage) {
                    hasMore = false;
                }
            }
        }

        return {
            invitations: allInvitations
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
