import { z } from 'zod';
import { createAction } from 'nango';

const RecipientSchema = z.object({
    email: z.string().email().describe('Email address of the recipient. Example: "user@example.com"')
});

const InputSchema = z.object({
    itemId: z.string().describe('The ID of the drive item to grant access to. Example: "0123456789ABC!123"'),
    recipients: z.array(RecipientSchema).describe('List of recipients to invite. For personal accounts, use email addresses only.'),
    roles: z.array(z.enum(['read', 'write'])).describe('Roles to grant to the recipients. Values: "read", "write".'),
    sendInvitation: z.boolean().optional().describe('Whether to send an invitation email to the recipients. Defaults to true.'),
    requireSignIn: z.boolean().optional().describe('Whether the recipient is required to sign in to access the item. Defaults to false.')
});

const IdentitySchema = z.object({
    displayName: z.string().optional(),
    id: z.string().optional(),
    email: z.string().email().optional()
});

const GrantedToIdentitySchema = z.object({
    user: IdentitySchema.optional()
});

const InvitationSchema = z.object({
    email: z.string().email().optional(),
    signInRequired: z.boolean().optional()
});

const LinkSchema = z.object({
    type: z.string().optional(),
    scope: z.string().optional(),
    webUrl: z.string().optional()
});

const PermissionSchema = z.object({
    id: z.string().optional(),
    roles: z.array(z.string()).optional(),
    link: LinkSchema.optional(),
    grantedTo: GrantedToIdentitySchema.optional(),
    grantedToV2: GrantedToIdentitySchema.optional(),
    grantedToIdentities: z.array(GrantedToIdentitySchema).optional(),
    grantedToIdentitiesV2: z.array(GrantedToIdentitySchema).optional(),
    invitedBy: GrantedToIdentitySchema.optional(),
    invitation: InvitationSchema.optional()
});

const OutputSchema = z.object({
    permissions: z.array(PermissionSchema).describe('List of permissions granted to the recipients.')
});

const action = createAction({
    description: 'Grant item access to recipients and optionally send invitations.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/invite-recipients',
        group: 'Permissions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['onedrive.readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const sendInvitation = input.sendInvitation !== false;
        const requireSignIn = input.requireSignIn === true;

        // The API requires at least one of sendInvitation or requireSignIn to be true
        if (!sendInvitation && !requireSignIn) {
            throw new nango.ActionError({
                type: 'invalid_request',
                message: 'At least one of sendInvitation or requireSignIn must be true'
            });
        }

        // https://learn.microsoft.com/onedrive/developer/rest-api/api/driveitem_invite
        const response = await nango.post({
            endpoint: `/v1.0/drive/items/${encodeURIComponent(input.itemId)}/action.invite`,
            data: {
                recipients: input.recipients.map((r) => ({ email: r.email })),
                roles: input.roles,
                sendInvitation,
                ...(input.requireSignIn !== undefined && { requireSignIn })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'No data returned from the API'
            });
        }

        const rawPermissions = response.data.value || [];

        const permissions = rawPermissions.map((perm: unknown) => {
            const parsed = PermissionSchema.safeParse(perm);
            if (parsed.success) {
                return parsed.data;
            }
            return perm;
        });

        return {
            permissions
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
