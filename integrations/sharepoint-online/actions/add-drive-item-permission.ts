import { z } from 'zod';
import { createAction } from 'nango';

const DriveRecipientSchema = z.object({
    email: z.string().optional().describe('The email address for the recipient.'),
    alias: z.string().optional().describe('The alias of the domain object.'),
    objectId: z.string().optional().describe('The unique identifier for the recipient in the directory.')
});

const InputSchema = z.object({
    siteId: z.string().describe('SharePoint site ID. Example: "contoso.sharepoint.com,siteId,webId"'),
    driveId: z.string().describe('Drive ID. Example: "b!isEncodedDriveId"'),
    itemId: z.string().describe('Drive item ID. Example: "01H2W2E3E4E5E6E7E8E9E0E1"'),
    recipients: z.array(DriveRecipientSchema).min(1).describe('Recipients to invite.'),
    roles: z.array(z.string()).min(1).describe('Roles to grant, e.g. ["read"] or ["write"].'),
    message: z.string().optional().describe('Optional message included in the sharing invitation.'),
    requireSignIn: z.boolean().optional().describe('Whether the recipient must sign in.'),
    sendInvitation: z.boolean().optional().describe('Whether to send a sharing invitation notification.')
});

const GrantedToUserSchema = z.object({
    id: z.string().optional(),
    displayName: z.string().optional()
});

const GrantedToV2Schema = z.object({
    user: GrantedToUserSchema.optional(),
    siteUser: z.object({ id: z.string().optional(), displayName: z.string().optional(), loginName: z.string().optional() }).optional()
});

const InvitationSchema = z.object({
    email: z.string().optional(),
    signInRequired: z.boolean().optional()
});

const ProviderPermissionSchema = z.object({
    id: z.string(),
    roles: z.array(z.string()),
    grantedTo: z.object({ user: GrantedToUserSchema.optional() }).optional(),
    grantedToV2: GrantedToV2Schema.optional(),
    invitation: InvitationSchema.optional(),
    expirationDateTime: z.string().optional(),
    shareId: z.string().optional(),
    hasPassword: z.boolean().optional(),
    inheritedFrom: z.object({}).passthrough().optional(),
    link: z.object({}).passthrough().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderPermissionSchema)
});

const PermissionSchema = z.object({
    id: z.string(),
    roles: z.array(z.string()),
    grantedToUserId: z.string().optional(),
    grantedToUserDisplayName: z.string().optional(),
    invitationEmail: z.string().optional(),
    invitationSignInRequired: z.boolean().optional(),
    expirationDateTime: z.string().optional(),
    shareId: z.string().optional(),
    hasPassword: z.boolean().optional()
});

const OutputSchema = z.object({
    permissions: z.array(PermissionSchema)
});

const action = createAction({
    description: 'Invite users or groups to access a drive item.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/add-drive-item-permission',
        group: 'Drive Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/graph/api/driveitem-invite
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/invite`,
            data: {
                recipients: input.recipients.map((recipient) => {
                    const result: Record<string, string> = {};
                    if (recipient.email !== undefined) {
                        result['email'] = recipient.email;
                    }
                    if (recipient.alias !== undefined) {
                        result['alias'] = recipient.alias;
                    }
                    if (recipient.objectId !== undefined) {
                        result['objectId'] = recipient.objectId;
                    }
                    return result;
                }),
                roles: input.roles,
                ...(input.message !== undefined && { message: input.message }),
                ...(input.requireSignIn !== undefined && { requireSignIn: input.requireSignIn }),
                ...(input.sendInvitation !== undefined && { sendInvitation: input.sendInvitation })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider response did not match expected schema.',
                details: providerResponse.error.issues
            });
        }

        const permissions = providerResponse.data.value.map((permission) => {
            const grantedToV2User = permission.grantedToV2?.user;
            const grantedToUser = permission.grantedTo?.user;
            const userId = grantedToV2User?.id ?? grantedToUser?.id;
            const displayName = grantedToV2User?.displayName ?? grantedToUser?.displayName;

            return {
                id: permission.id,
                roles: permission.roles,
                ...(userId !== undefined && { grantedToUserId: userId }),
                ...(displayName !== undefined && { grantedToUserDisplayName: displayName }),
                ...(permission.invitation?.email !== undefined && { invitationEmail: permission.invitation.email }),
                ...(permission.invitation?.signInRequired !== undefined && { invitationSignInRequired: permission.invitation.signInRequired }),
                ...(permission.expirationDateTime !== undefined && { expirationDateTime: permission.expirationDateTime }),
                ...(permission.shareId !== undefined && { shareId: permission.shareId }),
                ...(permission.hasPassword !== undefined && { hasPassword: permission.hasPassword })
            };
        });

        return { permissions };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
