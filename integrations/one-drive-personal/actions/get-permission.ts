import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    itemId: z.string().describe('The ID of the driveItem. Example: "12345ABC!123"'),
    permissionId: z.string().describe('The ID of the permission to retrieve. Example: "1"')
});

const IdentitySchema = z
    .object({
        displayName: z.string().optional(),
        id: z.string().optional(),
        email: z.string().optional()
    })
    .passthrough();

const IdentitySetSchema = z
    .object({
        user: IdentitySchema.optional(),
        application: IdentitySchema.optional(),
        device: IdentitySchema.optional()
    })
    .passthrough();

const ItemReferenceSchema = z
    .object({
        driveId: z.string().optional(),
        id: z.string().optional(),
        path: z.string().optional()
    })
    .passthrough();

const SharingInvitationSchema = z
    .object({
        email: z.string().optional(),
        invitedBy: IdentitySetSchema.optional(),
        sentDateTime: z.string().optional(),
        redeemedBy: IdentitySetSchema.optional()
    })
    .passthrough();

const SharingLinkSchema = z
    .object({
        webUrl: z.string().optional(),
        type: z.string().optional(),
        scope: z.string().optional(),
        application: IdentitySchema.optional()
    })
    .passthrough();

const ProviderPermissionSchema = z
    .object({
        id: z.string(),
        roles: z.array(z.string()),
        grantedTo: IdentitySetSchema.optional().nullable(),
        grantedToIdentities: z.array(IdentitySetSchema).optional().nullable(),
        inheritedFrom: ItemReferenceSchema.optional().nullable(),
        invitation: SharingInvitationSchema.optional().nullable(),
        link: SharingLinkSchema.optional().nullable(),
        shareId: z.string().optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    roles: z.array(z.string()),
    grantedTo: IdentitySetSchema.optional(),
    grantedToIdentities: z.array(IdentitySetSchema).optional(),
    inheritedFrom: ItemReferenceSchema.optional(),
    invitation: SharingInvitationSchema.optional(),
    link: SharingLinkSchema.optional(),
    shareId: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a sharing permission on an item.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['onedrive.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/onedrive/developer/rest-api/api/permission_get
        const response = await nango.get({
            endpoint: `/v1.0/drive/items/${encodeURIComponent(input.itemId)}/permissions/${encodeURIComponent(input.permissionId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Permission not found',
                itemId: input.itemId,
                permissionId: input.permissionId
            });
        }

        const providerPermission = ProviderPermissionSchema.parse(response.data);

        return {
            id: providerPermission.id,
            roles: providerPermission.roles,
            ...(providerPermission.grantedTo !== undefined &&
                providerPermission.grantedTo !== null && {
                    grantedTo: providerPermission.grantedTo
                }),
            ...(providerPermission.grantedToIdentities !== undefined &&
                providerPermission.grantedToIdentities !== null && {
                    grantedToIdentities: providerPermission.grantedToIdentities
                }),
            ...(providerPermission.inheritedFrom !== undefined &&
                providerPermission.inheritedFrom !== null && {
                    inheritedFrom: providerPermission.inheritedFrom
                }),
            ...(providerPermission.invitation !== undefined &&
                providerPermission.invitation !== null && {
                    invitation: providerPermission.invitation
                }),
            ...(providerPermission.link !== undefined &&
                providerPermission.link !== null && {
                    link: providerPermission.link
                }),
            ...(providerPermission.shareId !== undefined &&
                providerPermission.shareId !== null && {
                    shareId: providerPermission.shareId
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
