import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('Organization identifier. Example: "org_abc123"'),
    inviter: z.object({
        name: z.string().describe('The inviter\'s name. Example: "Jane Doe"')
    }),
    invitee: z.object({
        email: z.string().email().describe('The invitee\'s email. Example: "john.doe@example.com"')
    }),
    client_id: z.string().describe('Auth0 client ID. Example: "AaiyAPdpYdesoKnqjj8HJqRn4T5titww"'),
    connection_id: z.string().optional().describe('The id of the connection to force invitee to authenticate with. Example: "con_0000000000000001"'),
    roles: z.array(z.string()).optional().describe('List of role IDs to associate with the user. Example: ["rol_0000000000000001"]'),
    ttl_sec: z
        .number()
        .int()
        .min(0)
        .max(2592000)
        .optional()
        .describe('Number of seconds for which the invitation is valid before expiration. Defaults to 604800 (7 days). Max: 2592000 (30 days).'),
    send_invitation_email: z.boolean().optional().describe('Whether the user will receive an invitation email. Defaults to true.'),
    app_metadata: z.record(z.string(), z.unknown()).optional().describe("Data related to the user that affects the application's core functionality."),
    user_metadata: z.record(z.string(), z.unknown()).optional().describe("Data related to the user that does not affect the application's core functionality.")
});

const ProviderInviterSchema = z.object({
    name: z.string().optional()
});

const ProviderInviteeSchema = z.object({
    email: z.string().optional()
});

const ProviderResponseSchema = z.object({
    id: z.string().optional(),
    organization_id: z.string().optional(),
    inviter: ProviderInviterSchema.optional(),
    invitee: ProviderInviteeSchema.optional(),
    invitation_url: z.string().optional(),
    created_at: z.string().optional(),
    expires_at: z.string().optional(),
    client_id: z.string().optional(),
    connection_id: z.string().optional(),
    ticket_id: z.string().optional(),
    roles: z.array(z.string()).optional(),
    app_metadata: z.record(z.string(), z.unknown()).optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The id of the user invitation. Example: "uinv_0000000000000001"'),
    organization_id: z.string().describe('Organization identifier.'),
    inviter: z
        .object({
            name: z.string().optional()
        })
        .optional(),
    invitee: z
        .object({
            email: z.string().optional()
        })
        .optional(),
    invitation_url: z.string().optional().describe('The invitation url to be sent to the invitee.'),
    created_at: z.string().optional().describe('The ISO 8601 formatted timestamp representing the creation time of the invitation.'),
    expires_at: z.string().optional().describe('The ISO 8601 formatted timestamp representing the expiration time of the invitation.'),
    client_id: z.string().optional().describe('Auth0 client ID.'),
    connection_id: z.string().optional().describe('The id of the connection to force invitee to authenticate with.'),
    ticket_id: z.string().optional().describe('The id of the invitation ticket.'),
    roles: z.array(z.string()).optional().describe('List of role IDs associated with the user.'),
    app_metadata: z.record(z.string(), z.unknown()).optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Create an invitation to join an organization in Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['create:organization_invitations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://auth0.com/docs/api/management/v2/organizations/post-invitations
            endpoint: `/api/v2/organizations/${encodeURIComponent(input.organization_id)}/invitations`,
            data: {
                inviter: input.inviter,
                invitee: input.invitee,
                client_id: input.client_id,
                ...(input.connection_id !== undefined && { connection_id: input.connection_id }),
                ...(input.roles !== undefined && { roles: input.roles }),
                ...(input.ttl_sec !== undefined && { ttl_sec: input.ttl_sec }),
                ...(input.send_invitation_email !== undefined && { send_invitation_email: input.send_invitation_email }),
                ...(input.app_metadata !== undefined && { app_metadata: input.app_metadata }),
                ...(input.user_metadata !== undefined && { user_metadata: input.user_metadata })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.id) {
            throw new nango.ActionError({
                type: 'missing_id',
                message: 'The provider response did not include an invitation id.'
            });
        }

        return {
            id: providerResponse.id,
            organization_id: providerResponse.organization_id || input.organization_id,
            ...(providerResponse.inviter !== undefined && { inviter: providerResponse.inviter }),
            ...(providerResponse.invitee !== undefined && { invitee: providerResponse.invitee }),
            ...(providerResponse.invitation_url !== undefined && { invitation_url: providerResponse.invitation_url }),
            ...(providerResponse.created_at !== undefined && { created_at: providerResponse.created_at }),
            ...(providerResponse.expires_at !== undefined && { expires_at: providerResponse.expires_at }),
            ...(providerResponse.client_id !== undefined && { client_id: providerResponse.client_id }),
            ...(providerResponse.connection_id !== undefined && { connection_id: providerResponse.connection_id }),
            ...(providerResponse.ticket_id !== undefined && { ticket_id: providerResponse.ticket_id }),
            ...(providerResponse.roles !== undefined && { roles: providerResponse.roles }),
            ...(providerResponse.app_metadata !== undefined && { app_metadata: providerResponse.app_metadata }),
            ...(providerResponse.user_metadata !== undefined && { user_metadata: providerResponse.user_metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
