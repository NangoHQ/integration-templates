import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z
        .string()
        .describe('SharePoint site ID. Example: "contoso.sharepoint.com,12345678-1234-1234-1234-123456789012,12345678-1234-1234-1234-123456789012"'),
    driveId: z.string().describe('Drive ID. Example: "b!1234567890abcdef1234567890abcdef"'),
    itemId: z.string().describe('Drive item ID. Example: "01ABCDEFGHIJKLMNOPQRSTUVWX"'),
    permissionId: z.string().describe('Permission ID to update. Example: "1234567890abcdef"'),
    roles: z.array(z.string()).describe('Roles to assign. Example: ["write"]')
});

const IdentitySchema = z.object({
    displayName: z.string().optional(),
    id: z.string().optional()
});

const IdentitySetSchema = z.object({
    user: IdentitySchema.optional(),
    group: IdentitySchema.optional(),
    device: IdentitySchema.optional(),
    application: IdentitySchema.optional()
});

const SharingLinkSchema = z.object({
    type: z.string().optional(),
    scope: z.string().optional(),
    webUrl: z.string().optional()
});

const ProviderPermissionSchema = z.object({
    id: z.string(),
    roles: z.array(z.string()),
    grantedTo: IdentitySetSchema.optional(),
    grantedToIdentities: z.array(IdentitySetSchema).optional(),
    link: SharingLinkSchema.optional(),
    shareId: z.string().optional(),
    expirationDateTime: z.string().optional(),
    hasPassword: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    roles: z.array(z.string()),
    grantedTo: z
        .object({
            user: z
                .object({
                    displayName: z.string().optional(),
                    id: z.string().optional()
                })
                .optional(),
            group: z
                .object({
                    displayName: z.string().optional(),
                    id: z.string().optional()
                })
                .optional()
        })
        .optional(),
    grantedToIdentities: z
        .array(
            z.object({
                user: z
                    .object({
                        displayName: z.string().optional(),
                        id: z.string().optional()
                    })
                    .optional(),
                group: z
                    .object({
                        displayName: z.string().optional(),
                        id: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional(),
    link: z
        .object({
            type: z.string().optional(),
            scope: z.string().optional(),
            webUrl: z.string().optional()
        })
        .optional(),
    shareId: z.string().optional(),
    expirationDateTime: z.string().optional(),
    hasPassword: z.boolean().optional()
});

const action = createAction({
    description: 'Update an existing permission on a drive item.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-drive-item-permission',
        group: 'Drive Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All', 'Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/permission-update
        const response = await nango.patch({
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/permissions/${encodeURIComponent(input.permissionId)}`,
            data: {
                roles: input.roles
            },
            retries: 3
        });

        const providerPermission = ProviderPermissionSchema.parse(response.data);

        return {
            id: providerPermission.id,
            roles: providerPermission.roles,
            ...(providerPermission.grantedTo !== undefined && {
                grantedTo: {
                    ...(providerPermission.grantedTo.user !== undefined && {
                        user: {
                            ...(providerPermission.grantedTo.user.displayName !== undefined && { displayName: providerPermission.grantedTo.user.displayName }),
                            ...(providerPermission.grantedTo.user.id !== undefined && { id: providerPermission.grantedTo.user.id })
                        }
                    }),
                    ...(providerPermission.grantedTo.group !== undefined && {
                        group: {
                            ...(providerPermission.grantedTo.group.displayName !== undefined && {
                                displayName: providerPermission.grantedTo.group.displayName
                            }),
                            ...(providerPermission.grantedTo.group.id !== undefined && { id: providerPermission.grantedTo.group.id })
                        }
                    })
                }
            }),
            ...(providerPermission.grantedToIdentities !== undefined && {
                grantedToIdentities: providerPermission.grantedToIdentities.map((identitySet) => ({
                    ...(identitySet.user !== undefined && {
                        user: {
                            ...(identitySet.user.displayName !== undefined && { displayName: identitySet.user.displayName }),
                            ...(identitySet.user.id !== undefined && { id: identitySet.user.id })
                        }
                    }),
                    ...(identitySet.group !== undefined && {
                        group: {
                            ...(identitySet.group.displayName !== undefined && { displayName: identitySet.group.displayName }),
                            ...(identitySet.group.id !== undefined && { id: identitySet.group.id })
                        }
                    })
                }))
            }),
            ...(providerPermission.link !== undefined && {
                link: {
                    ...(providerPermission.link.type !== undefined && { type: providerPermission.link.type }),
                    ...(providerPermission.link.scope !== undefined && { scope: providerPermission.link.scope }),
                    ...(providerPermission.link.webUrl !== undefined && { webUrl: providerPermission.link.webUrl })
                }
            }),
            ...(providerPermission.shareId !== undefined && { shareId: providerPermission.shareId }),
            ...(providerPermission.expirationDateTime !== undefined && { expirationDateTime: providerPermission.expirationDateTime }),
            ...(providerPermission.hasPassword !== undefined && { hasPassword: providerPermission.hasPassword })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
