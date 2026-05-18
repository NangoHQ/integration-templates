import { createSync } from 'nango';
import { z } from 'zod';

const ObjectSchema = z.object({
    id: z.object({
        workspace_id: z.string(),
        object_id: z.string()
    }),
    api_slug: z.string().nullable(),
    singular_noun: z.string().nullable(),
    plural_noun: z.string().nullable(),
    created_at: z.string()
});

type ObjectType = z.infer<typeof ObjectSchema>;

const CheckpointSchema = z.object({
    object_slug: z.string(),
    offset: z.number().int().nonnegative(),
    in_progress: z.boolean()
});

const RecordSchema = z.object({
    id: z.object({
        workspace_id: z.string(),
        object_id: z.string(),
        record_id: z.string()
    }),
    created_at: z.string(),
    web_url: z.string(),
    values: z.record(z.string(), z.array(z.unknown()))
});

const SyncRecordSchema = z.object({
    id: z.string(),
    object_id: z.string(),
    record_id: z.string(),
    created_at: z.string(),
    web_url: z.string(),
    values: z.record(z.string(), z.array(z.unknown())).optional()
});

type SyncRecordType = z.infer<typeof SyncRecordSchema>;

const sync = createSync({
    description: 'Sync records from Attio.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Record: SyncRecordSchema
    },
    endpoints: [{ method: 'POST', path: '/syncs/records' }],
    scopes: ['record_permission:read', 'object_configuration:read'],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.partial().parse((await nango.getCheckpoint()) ?? {});
        const resumeObjectSlug = checkpoint.object_slug || undefined;
        const resumeOffset = checkpoint.offset ?? 0;
        const inProgress = checkpoint.in_progress ?? false;
        const limit = 100;

        // The record query endpoint is paginated, but current provider docs and
        // saved mocks only expose created_at on the record payload. We therefore
        // keep this as a resumable full refresh with deletion tracking.
        if (!inProgress) {
            await nango.trackDeletesStart('Record');
        }

        // https://docs.attio.com/rest-api/endpoint-reference/objects/list-objects
        const objectsResponse = await nango.get({
            endpoint: '/v2/objects',
            retries: 3
        });

        const objectsResult = z
            .object({
                data: z.array(z.unknown())
            })
            .safeParse(objectsResponse.data);

        if (!objectsResult.success) {
            throw new Error('Invalid objects response structure');
        }

        const objects: ObjectType[] = [];
        for (const obj of objectsResult.data.data) {
            const parsed = ObjectSchema.safeParse(obj);
            if (parsed.success && parsed.data.api_slug != null) {
                objects.push(parsed.data);
            }
        }

        const startIndex = resumeObjectSlug ? objects.findIndex((object) => object.api_slug === resumeObjectSlug) : 0;
        const objectsToSync = startIndex >= 0 ? objects.slice(startIndex) : objects;

        for (const [index, object] of objectsToSync.entries()) {
            const objectSlug = object.api_slug;
            if (!objectSlug) {
                continue;
            }

            let offset = index === 0 && startIndex >= 0 && resumeObjectSlug === objectSlug ? resumeOffset : 0;
            let hasMore = true;

            while (hasMore) {
                const response = await nango.post({
                    // https://docs.attio.com/rest-api/endpoint-reference/records/list-records
                    endpoint: `/v2/objects/${objectSlug}/records/query`,
                    data: {
                        limit,
                        offset,
                        sorts: [{ direction: 'asc', attribute: 'created_at' }]
                    },
                    retries: 3
                });

                const providerResponse = z
                    .object({
                        data: z.array(z.unknown())
                    })
                    .parse(response.data);
                const page = providerResponse.data;
                const records: SyncRecordType[] = [];

                for (const item of page) {
                    const parsed = RecordSchema.safeParse(item);
                    if (!parsed.success) {
                        continue;
                    }
                    const record = parsed.data;
                    records.push({
                        id: record.id.record_id,
                        object_id: record.id.object_id,
                        record_id: record.id.record_id,
                        created_at: record.created_at,
                        web_url: record.web_url,
                        values: record.values
                    });
                }

                if (records.length > 0) {
                    await nango.batchSave(records, 'Record');
                }

                if (page.length < limit) {
                    hasMore = false;
                } else {
                    offset += limit;
                    await nango.saveCheckpoint({ object_slug: objectSlug, offset, in_progress: true });
                }
            }
        }

        await nango.trackDeletesEnd('Record');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
