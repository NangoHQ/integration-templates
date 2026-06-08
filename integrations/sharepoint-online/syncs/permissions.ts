import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    drives: z.array(
        z.object({
            siteId: z.string(),
            driveId: z.string()
        })
    )
});

const DriveItemSchema = z.object({
    id: z.string(),
    deleted: z.object({}).optional()
});

const ProviderPermissionSchema = z.object({
    id: z.string(),
    roles: z.array(z.string()).optional(),
    grantedToV2: z.record(z.string(), z.unknown()).optional(),
    grantedToIdentitiesV2: z.array(z.record(z.string(), z.unknown())).optional(),
    link: z.record(z.string(), z.unknown()).optional(),
    invitation: z.record(z.string(), z.unknown()).optional(),
    shareId: z.string().optional(),
    expirationDateTime: z.string().optional(),
    hasPassword: z.boolean().optional(),
    inheritedFrom: z.record(z.string(), z.unknown()).optional()
});

const PermissionSchema = z.object({
    id: z.string(),
    itemId: z.string(),
    permissionId: z.string(),
    roles: z.array(z.string()).optional(),
    grantedToV2: z.record(z.string(), z.unknown()).optional(),
    grantedToIdentitiesV2: z.array(z.record(z.string(), z.unknown())).optional(),
    link: z.record(z.string(), z.unknown()).optional(),
    invitation: z.record(z.string(), z.unknown()).optional(),
    shareId: z.string().optional(),
    expirationDateTime: z.string().optional(),
    hasPassword: z.boolean().optional(),
    inheritedFrom: z.record(z.string(), z.unknown()).optional()
});

const sync = createSync({
    description: 'Sync permission grants on drive items for configured site drives.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/permissions'
        }
    ],
    scopes: ['Sites.Read.All', 'Sites.Selected', 'MyFiles.Read', 'Files.Read.All', 'Files.Read.Selected', 'offline_access'],
    models: {
        Permission: PermissionSchema
    },
    metadata: MetadataSchema,

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(metadata);
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.message}`);
        }

        const { drives } = metadataResult.data;
        if (drives.length === 0) {
            throw new Error('No drives configured in metadata.');
        }

        await nango.trackDeletesStart('Permission');

        for (const drive of drives) {
            const { siteId, driveId } = drive;

            const deltaConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/en-us/graph/api/driveitem-delta?view=graph-rest-1.0&tabs=http
                endpoint: `/v1.0/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/root/delta`,
                paginate: {
                    type: 'link',
                    limit_name_in_request: '$top',
                    response_path: 'value',
                    link_path_in_response_body: '@odata.nextLink',
                    limit: 100
                },
                retries: 3
            };

            for await (const items of nango.paginate(deltaConfig)) {
                const records: z.infer<typeof PermissionSchema>[] = [];

                for (const rawItem of items) {
                    const itemResult = DriveItemSchema.safeParse(rawItem);
                    if (!itemResult.success) {
                        throw new Error(`Invalid drive item: ${itemResult.error.message}`);
                    }

                    const item = itemResult.data;
                    if (item.deleted) {
                        continue;
                    }

                    const itemId = item.id;

                    // https://learn.microsoft.com/en-us/graph/api/driveitem-list-permissions?view=graph-rest-1.0&tabs=http
                    const permissionsResponse = await nango.get({
                        endpoint: `/v1.0/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/permissions`,
                        retries: 3
                    });

                    const permissionsEnvelopeSchema = z.object({
                        value: z.array(z.record(z.string(), z.unknown()))
                    });

                    const permissionsResult = permissionsEnvelopeSchema.safeParse(permissionsResponse.data);
                    if (!permissionsResult.success) {
                        throw new Error(`Invalid permissions response: ${permissionsResult.error.message}`);
                    }

                    for (const rawPermission of permissionsResult.data.value) {
                        const permissionResult = ProviderPermissionSchema.safeParse(rawPermission);
                        if (!permissionResult.success) {
                            throw new Error(`Invalid permission object: ${permissionResult.error.message}`);
                        }

                        const perm = permissionResult.data;
                        records.push({
                            id: `${itemId}_${perm.id}`,
                            itemId,
                            permissionId: perm.id,
                            roles: perm.roles,
                            grantedToV2: perm.grantedToV2,
                            grantedToIdentitiesV2: perm.grantedToIdentitiesV2,
                            link: perm.link,
                            invitation: perm.invitation,
                            shareId: perm.shareId,
                            expirationDateTime: perm.expirationDateTime,
                            hasPassword: perm.hasPassword,
                            inheritedFrom: perm.inheritedFrom
                        });
                    }
                }

                if (records.length > 0) {
                    await nango.batchSave(records, 'Permission');
                }
            }
        }

        await nango.trackDeletesEnd('Permission');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
