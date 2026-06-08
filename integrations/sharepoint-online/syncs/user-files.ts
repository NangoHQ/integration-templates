import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    displayName: z.string().optional()
});

const ParentReferenceSchema = z.object({
    driveId: z.string().optional(),
    id: z.string().optional(),
    path: z.string().optional()
});

const DriveItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    size: z.number().optional(),
    file: z.record(z.string(), z.unknown()).optional(),
    folder: z.record(z.string(), z.unknown()).optional(),
    package: z.record(z.string(), z.unknown()).optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    webUrl: z.string().optional(),
    createdBy: z.object({ user: UserSchema.optional() }).optional(),
    lastModifiedBy: z.object({ user: UserSchema.optional() }).optional(),
    parentReference: ParentReferenceSchema.optional(),
    deleted: z.record(z.string(), z.unknown()).optional()
});

const DriveSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    driveType: z.string().optional(),
    webUrl: z.string().optional()
});

const DrivesResponseSchema = z.object({
    value: z.array(DriveSchema)
});

const DeltaPageSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional()
});

const UserFileSchema = z.object({
    id: z.string(),
    driveId: z.string(),
    itemId: z.string(),
    driveType: z.string().optional(),
    name: z.string().optional(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    createdByDisplayName: z.string().optional(),
    lastModifiedByDisplayName: z.string().optional(),
    parentDriveId: z.string().optional(),
    parentItemId: z.string().optional(),
    parentPath: z.string().optional(),
    fileType: z.string().optional()
});

const CheckpointSchema = z.object({
    driveTokensJson: z.string()
});

const sync = createSync({
    description: 'Sync file metadata from user-accessible SharePoint files.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/user-files' }],
    checkpoint: CheckpointSchema,
    models: {
        UserFile: UserFileSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const driveTokensJson = checkpoint?.['driveTokensJson'] ?? '{}';
        const parsedTokens = JSON.parse(String(driveTokensJson));
        const driveTokens: Record<string, string> =
            typeof parsedTokens === 'object' && parsedTokens !== null && !Array.isArray(parsedTokens) ? parsedTokens : {};

        // https://learn.microsoft.com/graph/api/drive-list
        const drivesResponse = await nango.get({
            endpoint: '/v1.0/me/drives',
            retries: 3
        });

        const drivesParse = DrivesResponseSchema.safeParse(drivesResponse.data);
        if (!drivesParse.success) {
            throw new Error(`Failed to parse drives response: ${drivesParse.error.message}`);
        }

        const drives = drivesParse.data.value;

        for (const drive of drives) {
            const driveId = drive.id;
            const savedDeltaLink = driveTokens[driveId];
            let currentDeltaLink: string | undefined;

            // https://learn.microsoft.com/graph/api/driveitem-delta
            let proxyConfig: ProxyConfiguration;
            if (savedDeltaLink) {
                const url = new URL(savedDeltaLink);
                proxyConfig = {
                    endpoint: url.pathname + url.search,
                    baseUrlOverride: url.origin,
                    paginate: {
                        type: 'link',
                        link_path_in_response_body: '@odata.nextLink',
                        response_path: 'value',
                        limit: 100,
                        limit_name_in_request: '$top',
                        on_page: async ({ response }) => {
                            const parsed = DeltaPageSchema.safeParse(response.data);
                            if (parsed.success && parsed.data['@odata.deltaLink']) {
                                currentDeltaLink = parsed.data['@odata.deltaLink'];
                            }
                        }
                    },
                    retries: 3
                };
            } else {
                proxyConfig = {
                    endpoint: `/v1.0/drives/${encodeURIComponent(driveId)}/root/delta`,
                    params: {
                        $top: 100
                    },
                    paginate: {
                        type: 'link',
                        link_path_in_response_body: '@odata.nextLink',
                        response_path: 'value',
                        limit: 100,
                        limit_name_in_request: '$top',
                        on_page: async ({ response }) => {
                            const parsed = DeltaPageSchema.safeParse(response.data);
                            if (parsed.success && parsed.data['@odata.deltaLink']) {
                                currentDeltaLink = parsed.data['@odata.deltaLink'];
                            }
                        }
                    },
                    retries: 3
                };
            }

            for await (const items of nango.paginate(proxyConfig)) {
                if (!Array.isArray(items)) {
                    continue;
                }

                const upserts: Array<z.infer<typeof UserFileSchema>> = [];
                const deletions: Array<{ id: string }> = [];

                for (const rawItem of items) {
                    const itemParse = DriveItemSchema.safeParse(rawItem);
                    if (!itemParse.success) {
                        throw new Error(`Failed to parse drive item: ${itemParse.error.message}`);
                    }

                    const item = itemParse.data;
                    const compositeId = `${driveId}/${item.id}`;

                    if (item.deleted) {
                        deletions.push({ id: compositeId });
                        continue;
                    }

                    const fileType = item.file ? 'file' : item.folder ? 'folder' : item.package ? 'package' : undefined;

                    upserts.push({
                        id: compositeId,
                        driveId,
                        itemId: item.id,
                        ...(drive.driveType !== undefined && { driveType: drive.driveType }),
                        ...(item.name !== undefined && { name: item.name }),
                        ...(item.size !== undefined && { size: item.size }),
                        ...(item.webUrl !== undefined && { webUrl: item.webUrl }),
                        ...(item.createdDateTime !== undefined && { createdDateTime: item.createdDateTime }),
                        ...(item.lastModifiedDateTime !== undefined && { lastModifiedDateTime: item.lastModifiedDateTime }),
                        ...(item.createdBy?.user?.displayName !== undefined && {
                            createdByDisplayName: item.createdBy.user.displayName
                        }),
                        ...(item.lastModifiedBy?.user?.displayName !== undefined && {
                            lastModifiedByDisplayName: item.lastModifiedBy.user.displayName
                        }),
                        ...(item.parentReference?.driveId !== undefined && {
                            parentDriveId: item.parentReference.driveId
                        }),
                        ...(item.parentReference?.id !== undefined && { parentItemId: item.parentReference.id }),
                        ...(item.parentReference?.path !== undefined && { parentPath: item.parentReference.path }),
                        ...(fileType !== undefined && { fileType })
                    });
                }

                if (upserts.length > 0) {
                    await nango.batchSave(upserts, 'UserFile');
                }

                if (deletions.length > 0) {
                    await nango.batchDelete(deletions, 'UserFile');
                }
            }

            if (currentDeltaLink) {
                driveTokens[driveId] = currentDeltaLink;
            }
            await nango.saveCheckpoint({ driveTokensJson: JSON.stringify(driveTokens) });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
