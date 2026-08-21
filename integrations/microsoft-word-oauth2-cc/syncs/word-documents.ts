import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    driveId: z.string()
});

const CheckpointSchema = z.object({
    deltaLink: z.string(),
    driveId: z.string()
});

const StoredCheckpointSchema = z.union([
    CheckpointSchema,
    z.object({
        deltaLink: z.string()
    })
]);

const WordDocumentSchema = z.object({
    id: z.string(),
    name: z.string(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    size: z.number().optional(),
    mimeType: z.string().optional(),
    parentId: z.string().optional()
});

const FileFacetSchema = z.object({
    mimeType: z.string().optional()
});

const ParentReferenceSchema = z.object({
    id: z.string().optional()
});

const DriveItemSchema = z.object({
    id: z.string(),
    // Deletion payloads in the delta feed omit `name` entirely, so it can only be required for
    // active (non-deleted) items, which are validated separately below.
    name: z.string().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    size: z.number().optional(),
    file: FileFacetSchema.optional(),
    parentReference: ParentReferenceSchema.optional(),
    deleted: z.unknown().optional()
});

const DeltaPageSchema = z.object({
    '@odata.deltaLink': z.string().optional(),
    '@odata.nextLink': z.string().optional()
});

const sync = createSync({
    description: 'Sync .docx files within a drive',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        WordDocument: WordDocumentSchema
    },

    exec: async (nango) => {
        const metadataRaw = await nango.getMetadata();
        const metadata = MetadataSchema.safeParse(metadataRaw);
        if (!metadata.success || !metadata.data.driveId) {
            throw new Error('driveId is required in metadata');
        }

        const driveId = metadata.data.driveId;
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = StoredCheckpointSchema.safeParse(checkpointRaw);

        let endpoint: string;
        // Checkpoints are scoped to the sync connection, so only reuse the delta token
        // when it belongs to the same configured drive.
        const deltaLink =
            checkpoint.success && (!('driveId' in checkpoint.data) || checkpoint.data.driveId === driveId) ? checkpoint.data.deltaLink : undefined;
        if (typeof deltaLink === 'string') {
            const deltaUrl = new URL(deltaLink);
            endpoint = deltaUrl.pathname + deltaUrl.search;
        } else {
            endpoint = `/v1.0/drives/${encodeURIComponent(driveId)}/root/delta`;
        }

        let latestDeltaLink: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/driveitem-delta
            endpoint,
            paginate: {
                type: 'link',
                link_path_in_response_body: '@odata.nextLink',
                response_path: 'value',
                limit: 100,
                limit_name_in_request: '$top',
                on_page: async ({ response }) => {
                    const parsed = DeltaPageSchema.safeParse(response.data);
                    if (parsed.success && parsed.data['@odata.deltaLink']) {
                        latestDeltaLink = parsed.data['@odata.deltaLink'];
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const upserts: Array<z.infer<typeof WordDocumentSchema>> = [];
            const deletions: Array<{ id: string }> = [];

            for (const raw of page) {
                const parsed = DriveItemSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse drive item: ${parsed.error.message}`);
                }

                const item = parsed.data;

                if (item.deleted !== undefined) {
                    deletions.push({ id: item.id });
                    continue;
                }

                if (item.file?.mimeType !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                    // The item was renamed/replaced away from .docx (or never was one). Queue it for
                    // removal in case it was previously tracked as a WordDocument; batchDelete is a
                    // no-op for ids that were never saved.
                    deletions.push({ id: item.id });
                    continue;
                }

                if (!item.name) {
                    throw new Error(`Active drive item ${item.id} is missing a name`);
                }

                upserts.push({
                    id: item.id,
                    name: item.name,
                    ...(item.webUrl != null && { webUrl: item.webUrl }),
                    ...(item.createdDateTime != null && { createdDateTime: item.createdDateTime }),
                    ...(item.lastModifiedDateTime != null && { lastModifiedDateTime: item.lastModifiedDateTime }),
                    ...(item.size != null && { size: item.size }),
                    ...(item.file?.mimeType != null && { mimeType: item.file.mimeType }),
                    ...(item.parentReference?.id != null && { parentId: item.parentReference.id })
                });
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'WordDocument');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'WordDocument');
            }
        }

        if (latestDeltaLink !== undefined) {
            await nango.saveCheckpoint({ deltaLink: latestDeltaLink, driveId });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
