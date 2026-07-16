import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    tableId: z.number().int().positive()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive().describe('The next Baserow page number to request when resuming a full refresh')
});

const BaserowRowSchema = z
    .object({
        id: z.number().int()
    })
    .passthrough();

const BaserowRowsResponseSchema = z.object({
    next: z.string().nullable(),
    results: z.array(BaserowRowSchema)
});

const PAGE_SIZE = 100;

const RowSchema = z.object({
    id: z.string(),
    tableId: z.number().int(),
    data: z.record(z.string(), z.unknown())
});

const sync = createSync({
    description: 'Sync rows for a configured table',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Row: RowSchema
    },

    exec: async (nango) => {
        const metadataRaw = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(metadataRaw);
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.message}`);
        }
        const tableId = metadataResult.data.tableId;

        const checkpointRaw = await nango.getCheckpoint();
        let page = 1;
        if (checkpointRaw != null) {
            const checkpointResult = CheckpointSchema.safeParse(checkpointRaw);
            if (!checkpointResult.success) {
                throw new Error(`Invalid checkpoint: ${checkpointResult.error.message}`);
            }
            page = checkpointResult.data.page;
        }
        const isResuming = checkpointRaw != null && page > 1;

        // Full refresh: Baserow rows API has no universal modified-since filter.
        // A last_modified field may exist on some tables but cannot be created
        // via this Database token (field creation requires JWT), so its presence
        // can never be assumed for an arbitrary table.
        if (!isResuming) {
            await nango.trackDeletesStart('Row');
        }

        while (true) {
            // https://api.baserow.io/api/redoc/
            // https://baserow.io/user-docs/database-api
            const response = await nango.get({
                endpoint: `/database/rows/table/${encodeURIComponent(String(tableId))}/`,
                params: {
                    page,
                    size: PAGE_SIZE
                },
                retries: 3
            });

            const rowsResult = BaserowRowsResponseSchema.safeParse(response.data);
            if (!rowsResult.success) {
                throw new Error(`Invalid rows response: ${rowsResult.error.message}`);
            }

            const rows = rowsResult.data.results.map((row) => ({
                id: String(row.id),
                tableId,
                data: row
            }));
            if (rows.length > 0) {
                await nango.batchSave(rows, 'Row');
            }

            if (rowsResult.data.next) {
                page += 1;
                await nango.saveCheckpoint({ page });
                continue;
            }

            await nango.clearCheckpoint();
            await nango.trackDeletesEnd('Row');
            break;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
