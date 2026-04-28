import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    baseId: z.string(),
    tableIdOrName: z.string(),
    view: z.string().optional(),
    sort: z
        .array(
            z.object({
                field: z.string(),
                direction: z.enum(['asc', 'desc']).optional()
            })
        )
        .optional(),
    filterByFormula: z.string().optional(),
    fields: z.array(z.string()).optional()
});

const AirtableRecordSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const RecordsResponseSchema = z.object({
    records: z.array(AirtableRecordSchema),
    offset: z.string().optional()
});

const CheckpointSchema = z.object({
    offset: z.string()
});

const sync = createSync({
    description: 'Sync Airtable records for a specific base and table.',
    endpoints: [{ method: 'GET', path: '/syncs/records' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        AirtableRecord: AirtableRecordSchema
    },
    metadata: MetadataSchema,

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            await nango.log(`Invalid metadata: ${metadataResult.error.message}`, { level: 'error' });
            return;
        }

        const metadata = metadataResult.data;
        const checkpoint = await nango.getCheckpoint();
        let offset = typeof checkpoint?.['offset'] === 'string' ? checkpoint['offset'] : undefined;

        // Airtable list records only exposes page offsets, so this remains a checkpointed full refresh.
        await nango.trackDeletesStart('AirtableRecord');

        const queryParams = new URLSearchParams();
        if (metadata.view) {
            queryParams.set('view', metadata.view);
        }
        if (metadata.filterByFormula) {
            queryParams.set('filterByFormula', metadata.filterByFormula);
        }
        if (metadata.fields) {
            for (const field of metadata.fields) {
                queryParams.append('fields[]', field);
            }
        }
        if (metadata.sort) {
            for (let i = 0; i < metadata.sort.length; i++) {
                const s = metadata.sort[i];
                if (!s) {
                    continue;
                }
                queryParams.set(`sort[${i}][field]`, s.field);
                if (s.direction) {
                    queryParams.set(`sort[${i}][direction]`, s.direction);
                }
            }
        }

        const queryString = queryParams.toString();
        const endpoint = `/v0/${metadata.baseId}/${metadata.tableIdOrName}${queryString ? `?${queryString}` : ''}`;

        do {
            const response = await nango.get({
                // https://airtable.com/developers/web/api/list-records
                endpoint,
                params: {
                    pageSize: 100,
                    ...(offset ? { offset } : {})
                },
                retries: 3
            });

            const providerResponse = RecordsResponseSchema.parse(response.data);

            const records = providerResponse.records.map((record) => ({
                id: record.id,
                createdTime: record.createdTime,
                ...(record.fields !== undefined && { fields: record.fields })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'AirtableRecord');
            }

            offset = providerResponse.offset;
            if (offset) {
                await nango.saveCheckpoint({ offset });
            }
        } while (offset);

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('AirtableRecord');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
