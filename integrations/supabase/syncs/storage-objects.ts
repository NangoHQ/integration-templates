import { createSync } from 'nango';
import { z } from 'zod';

const BucketSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const ProviderObjectMetadataSchema = z
    .object({
        size: z.number().nullable().optional(),
        mimetype: z.string().nullable().optional(),
        cacheControl: z.string().nullable().optional(),
        contentLength: z.number().nullable().optional(),
        httpStatusCode: z.number().nullable().optional(),
        eTag: z.string().nullable().optional()
    })
    .passthrough();

const ProviderObjectSchema = z
    .object({
        name: z.string(),
        id: z.string().nullable().optional(),
        updated_at: z.string().nullable().optional(),
        created_at: z.string().nullable().optional(),
        last_accessed_at: z.string().nullable().optional(),
        metadata: ProviderObjectMetadataSchema.nullable().optional(),
        owner: z.string().nullable().optional()
    })
    .passthrough();

const StorageObjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    bucket_id: z.string(),
    updated_at: z.string().optional(),
    created_at: z.string().optional(),
    last_accessed_at: z.string().optional(),
    size: z.number().optional(),
    mimetype: z.string().optional(),
    owner: z.string().optional()
});

const CheckpointListSchema = z.array(z.string());

const ConnectionConfigSchema = z
    .object({
        projectUrl: z.string().optional()
    })
    .passthrough();

const CheckpointSchema = z.object({
    remaining_bucket_ids_json: z.string(),
    prefix_queue_json: z.string(),
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync storage objects from Supabase.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/storage-objects'
        }
    ],
    models: {
        StorageObject: StorageObjectSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const connection = await nango.getConnection();
        const parsedConfig = ConnectionConfigSchema.safeParse(connection.connection_config ?? {});
        const projectUrl = parsedConfig.success ? parsedConfig.data.projectUrl : undefined;
        const baseUrlOverride = typeof projectUrl === 'string' ? (projectUrl.startsWith('http') ? projectUrl : `https://${projectUrl}`) : undefined;

        const parseCheckpointList = (value: string, label: string): string[] => {
            const parsed = CheckpointListSchema.safeParse(JSON.parse(value));
            if (!parsed.success) {
                throw new Error(`Invalid ${label} checkpoint: ${parsed.error.message}`);
            }

            return parsed.data;
        };

        // https://supabase.com/docs/reference/api/storage-list-buckets
        const bucketsResponse = await nango.get({
            endpoint: '/storage/v1/bucket',
            baseUrlOverride,
            retries: 3
        });

        const bucketsData = bucketsResponse.data;
        if (!Array.isArray(bucketsData)) {
            throw new Error('Buckets response is not an array');
        }

        // Blocker: listing objects requires walking every bucket/prefix and does not expose
        // an updated_after filter, cursor, or deleted-record feed. Use a checkpointed full refresh.
        await nango.trackDeletesStart('StorageObject');

        const buckets = bucketsData.map((item) => BucketSchema.parse(item)).sort((a, b) => a.id.localeCompare(b.id));
        const existingBucketIds = new Set(buckets.map((bucket) => bucket.id));

        let remainingBucketIds = checkpoint
            ? parseCheckpointList(checkpoint.remaining_bucket_ids_json, 'remaining_bucket_ids_json')
            : buckets.map((bucket) => bucket.id);
        let prefixQueue = checkpoint ? parseCheckpointList(checkpoint.prefix_queue_json, 'prefix_queue_json') : [''];
        let offset = checkpoint?.offset ?? 0;

        const saveResumeCheckpoint = async () => {
            await nango.saveCheckpoint({
                remaining_bucket_ids_json: JSON.stringify(remainingBucketIds),
                prefix_queue_json: JSON.stringify(prefixQueue),
                offset
            });
        };

        const advanceBucket = () => {
            remainingBucketIds = remainingBucketIds.slice(1);
            prefixQueue = remainingBucketIds.length > 0 ? [''] : [];
            offset = 0;
        };

        while (remainingBucketIds.length > 0) {
            const bucketId = remainingBucketIds[0];
            if (bucketId === undefined) {
                break;
            }

            if (!existingBucketIds.has(bucketId)) {
                advanceBucket();
                await saveResumeCheckpoint();
                continue;
            }

            const prefix = prefixQueue[0];
            if (prefix === undefined) {
                advanceBucket();
                await saveResumeCheckpoint();
                continue;
            }

            // https://supabase.com/docs/reference/api/storage-list-objects
            const objectsResponse = await nango.post({
                endpoint: `/storage/v1/object/list/${encodeURIComponent(bucketId)}`,
                baseUrlOverride,
                data: {
                    prefix,
                    limit: 100,
                    offset
                },
                retries: 3
            });

            if (!Array.isArray(objectsResponse.data)) {
                throw new Error(`Object list response for bucket ${bucketId} is not an array`);
            }

            const parsedItems = objectsResponse.data.map((item) => ProviderObjectSchema.parse(item));
            const files = parsedItems.filter((parsed) => parsed.id != null || parsed.metadata != null);
            const folders = parsedItems.filter((parsed) => parsed.id == null && parsed.metadata == null);

            if (files.length > 0) {
                const objects = files.map((parsed) => {
                    const fullName = prefix ? `${prefix}${parsed.name}` : parsed.name;
                    const id = parsed.id ?? `${bucketId}/${fullName}`;

                    return {
                        id,
                        name: fullName,
                        bucket_id: bucketId,
                        ...(parsed.updated_at != null && { updated_at: parsed.updated_at }),
                        ...(parsed.created_at != null && { created_at: parsed.created_at }),
                        ...(parsed.last_accessed_at != null && { last_accessed_at: parsed.last_accessed_at }),
                        ...(parsed.metadata?.size !== undefined && { size: parsed.metadata.size }),
                        ...(parsed.metadata?.mimetype !== undefined && { mimetype: parsed.metadata.mimetype }),
                        ...(parsed.owner != null && { owner: parsed.owner })
                    };
                });

                await nango.batchSave(objects, 'StorageObject');
            }

            for (const folder of folders) {
                const folderName = folder.name.endsWith('/') ? folder.name.slice(0, -1) : folder.name;
                const nextPrefix = prefix ? `${prefix}${folderName}/` : `${folderName}/`;
                prefixQueue.push(nextPrefix);
            }

            if (objectsResponse.data.length === 100) {
                offset += objectsResponse.data.length;
            } else {
                prefixQueue = prefixQueue.slice(1);
                offset = 0;

                if (prefixQueue.length === 0) {
                    advanceBucket();
                }
            }

            await saveResumeCheckpoint();
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('StorageObject');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
