import { createSync } from 'nango';
import { z } from 'zod';

const PersonSchema = z.object({
    id: z.string(),
    created_at: z.string().optional(),
    web_url: z.string().optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().nonnegative(),
    in_progress: z.boolean()
});

const AttioRecordIdSchema = z.object({
    workspace_id: z.string(),
    object_id: z.string(),
    record_id: z.string()
});

const AttioRecordSchema = z.object({
    id: AttioRecordIdSchema,
    created_at: z.string(),
    web_url: z.string(),
    values: z.record(z.string(), z.array(z.unknown())).optional()
});

const QueryResponseSchema = z.object({
    data: z.array(AttioRecordSchema)
});

const sync = createSync({
    description: 'Sync Attio person records.',
    version: '2.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/people' }],
    scopes: ['record_permission:read', 'object_configuration:read'],
    checkpoint: CheckpointSchema,
    models: {
        Person: PersonSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.partial().parse((await nango.getCheckpoint()) ?? {});
        let offset = checkpoint.offset ?? 0;
        const inProgress = checkpoint.in_progress ?? false;
        const limit = 100;

        if (!inProgress) {
            await nango.trackDeletesStart('Person');
        }

        let hasMore = true;

        while (hasMore) {
            // https://docs.attio.com/rest-api/endpoint-reference/records/query
            const response = await nango.post({
                endpoint: '/v2/objects/people/records/query',
                data: {
                    limit,
                    offset,
                    sorts: [{ direction: 'asc', attribute: 'created_at' }]
                },
                retries: 3
            });

            const parsed = QueryResponseSchema.parse(response.data);
            const records = parsed.data;
            const people = records.map((record) => ({
                id: record.id.record_id,
                ...(record.created_at != null && { created_at: record.created_at }),
                ...(record.web_url != null && { web_url: record.web_url })
            }));

            if (people.length > 0) {
                await nango.batchSave(people, 'Person');
            }

            if (records.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
                await nango.saveCheckpoint({ offset, in_progress: true });
            }
        }

        await nango.trackDeletesEnd('Person');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
