import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    drive_id: z.string()
});

const CheckpointSchema = z.object({
    // Stores the full Graph resume URL. Mid-run this is @odata.nextLink; after the last page it is @odata.deltaLink.
    delta_link: z.string()
});

const PresentationSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    mimeType: z.string().optional(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    downloadUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    createdByUserDisplayName: z.string().optional(),
    lastModifiedByUserDisplayName: z.string().optional(),
    parentDriveId: z.string().optional(),
    parentId: z.string().optional(),
    parentPath: z.string().optional()
});

const DriveItemSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    size: z.number().optional().nullable(),
    webUrl: z.string().optional().nullable(),
    createdDateTime: z.string().optional().nullable(),
    lastModifiedDateTime: z.string().optional().nullable(),
    cTag: z.string().optional().nullable(),
    eTag: z.string().optional().nullable(),
    file: z
        .object({
            mimeType: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    deleted: z.unknown().optional().nullable(),
    parentReference: z
        .object({
            driveId: z.string().optional().nullable(),
            id: z.string().optional().nullable(),
            path: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    createdBy: z
        .object({
            user: z
                .object({
                    displayName: z.string().optional().nullable()
                })
                .optional()
                .nullable()
        })
        .optional()
        .nullable(),
    lastModifiedBy: z
        .object({
            user: z
                .object({
                    displayName: z.string().optional().nullable()
                })
                .optional()
                .nullable()
        })
        .optional()
        .nullable(),
    '@microsoft.graph.downloadUrl': z.string().optional().nullable()
});

const DeltaResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional()
});

const sync = createSync({
    description: 'Sync .pptx files within a drive',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Presentation: PresentationSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new Error('drive_id is required in metadata');
        }
        const driveId = metadataResult.data.drive_id;

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = checkpointResult.success ? checkpointResult.data : undefined;
        const resumeLink = checkpoint?.delta_link;
        const resumeUrl = resumeLink ? new URL(resumeLink) : null;
        const params: Record<string, string | number> = {};

        if (resumeUrl) {
            resumeUrl.searchParams.forEach((value, key) => {
                params[key] = value;
            });
        } else {
            params['$top'] = 5;
        }

        let checkpointToSave: z.infer<typeof CheckpointSchema> | null = null;

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/driveitem-delta
            endpoint: resumeUrl ? resumeUrl.pathname : `/v1.0/drives/${encodeURIComponent(driveId)}/root/delta`,
            params,
            paginate: {
                type: 'link',
                link_path_in_response_body: '@odata.nextLink',
                response_path: 'value',
                on_page: async ({ response }) => {
                    const respResult = DeltaResponseSchema.safeParse(response.data);
                    if (!respResult.success) {
                        checkpointToSave = null;
                        return;
                    }

                    if (respResult.data['@odata.nextLink']) {
                        checkpointToSave = { delta_link: respResult.data['@odata.nextLink'] };
                    } else if (respResult.data['@odata.deltaLink']) {
                        checkpointToSave = { delta_link: respResult.data['@odata.deltaLink'] };
                    } else {
                        checkpointToSave = null;
                    }
                }
            },
            retries: 3
        };

        if (resumeUrl) {
            proxyConfig.baseUrlOverride = resumeUrl.origin;
        }

        for await (const items of nango.paginate(proxyConfig)) {
            const presentations: Array<z.infer<typeof PresentationSchema>> = [];
            const deletions: Array<{ id: string }> = [];

            for (const raw of items) {
                const itemResult = DriveItemSchema.safeParse(raw);
                if (!itemResult.success) {
                    throw new Error(`Invalid driveItem: ${itemResult.error.message}`);
                }

                const item = itemResult.data;

                if (item.deleted !== undefined && item.deleted !== null) {
                    deletions.push({ id: item.id });
                    continue;
                }

                if (item.file?.mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
                    const presentation: Record<string, unknown> = {
                        id: item.id
                    };

                    if (item.name != null) {
                        presentation['name'] = item.name;
                    }
                    if (item.file?.mimeType != null) {
                        presentation['mimeType'] = item.file.mimeType;
                    }
                    if (item.size != null) {
                        presentation['size'] = item.size;
                    }
                    if (item.webUrl != null) {
                        presentation['webUrl'] = item.webUrl;
                    }
                    if (item['@microsoft.graph.downloadUrl'] != null) {
                        presentation['downloadUrl'] = item['@microsoft.graph.downloadUrl'];
                    }
                    if (item.createdDateTime != null) {
                        presentation['createdDateTime'] = item.createdDateTime;
                    }
                    if (item.lastModifiedDateTime != null) {
                        presentation['lastModifiedDateTime'] = item.lastModifiedDateTime;
                    }
                    if (item.createdBy?.user?.displayName != null) {
                        presentation['createdByUserDisplayName'] = item.createdBy.user.displayName;
                    }
                    if (item.lastModifiedBy?.user?.displayName != null) {
                        presentation['lastModifiedByUserDisplayName'] = item.lastModifiedBy.user.displayName;
                    }
                    if (item.parentReference?.driveId != null) {
                        presentation['parentDriveId'] = item.parentReference.driveId;
                    }
                    if (item.parentReference?.id != null) {
                        presentation['parentId'] = item.parentReference.id;
                    }
                    if (item.parentReference?.path != null) {
                        presentation['parentPath'] = item.parentReference.path;
                    }

                    const presentationResult = PresentationSchema.safeParse(presentation);
                    if (!presentationResult.success) {
                        throw new Error(`Invalid presentation: ${presentationResult.error.message}`);
                    }
                    presentations.push(presentationResult.data);
                }
            }

            if (presentations.length > 0) {
                await nango.batchSave(presentations, 'Presentation');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'Presentation');
            }

            if (checkpointToSave) {
                await nango.saveCheckpoint(checkpointToSave);
            }
        }

        if (checkpointToSave) {
            await nango.saveCheckpoint(checkpointToSave);
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
