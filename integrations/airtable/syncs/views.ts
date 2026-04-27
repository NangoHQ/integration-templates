import { createSync } from 'nango';
import { z } from 'zod';

// https://airtable.com/developers/web/api/get-base-schema
// Views are returned as part of the table schema
const ViewSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string()
});

const ViewModelSchema = z.object({
    id: z.string(),
    base_id: z.string(),
    table_id: z.string(),
    name: z.string(),
    type: z.string()
});

const BaseSchema = z.object({
    id: z.string(),
    name: z.string()
});

const TableSchema = z.object({
    id: z.string(),
    name: z.string(),
    views: z.array(ViewSchema)
});

const CheckpointSchema = z.object({
    lastProcessedBaseId: z.string()
});

type ViewsCheckpoint = z.infer<typeof CheckpointSchema>;

const sync = createSync({
    description: 'Sync Airtable views for bases and tables in scope',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/views' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        View: ViewModelSchema
    },

    exec: async (nango) => {
        const checkpoint = (await nango.getCheckpoint()) as ViewsCheckpoint | null;

        // Blocker: The Airtable Metadata API views endpoint does not support
        // timestamp-based filtering or cursor-based pagination. It is a structural
        // metadata endpoint that returns the complete set of views for a table.
        // Therefore, this sync uses a checkpointed full refresh by resuming at the
        // last fully processed base and only ending delete tracking once the full
        // refresh window is complete.
        await nango.trackDeletesStart('View');

        // https://airtable.com/developers/web/api/list-bases
        const listBasesProxyConfig = {
            endpoint: '/v0/meta/bases',
            paginate: {
                type: 'cursor' as const,
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'offset',
                response_path: 'bases'
            },
            retries: 3
        };

        const bases: z.infer<typeof BaseSchema>[] = [];
        for await (const page of nango.paginate<z.infer<typeof BaseSchema>>(listBasesProxyConfig)) {
            const parsedBasePage = z.array(BaseSchema).safeParse(page);
            if (!parsedBasePage.success) {
                await nango.log(`Failed to parse bases page: ${JSON.stringify(parsedBasePage.error)}`, { level: 'error' });
                throw new Error('Failed to parse Airtable bases page');
            }

            bases.push(...parsedBasePage.data);
        }

        let startIndex = 0;
        if (checkpoint?.lastProcessedBaseId) {
            const index = bases.findIndex((base) => base.id === checkpoint.lastProcessedBaseId);
            if (index !== -1) {
                startIndex = index + 1;
                await nango.log(`Resuming from base index ${startIndex} after checkpoint`);
            } else {
                await nango.log(`Checkpoint base ${checkpoint.lastProcessedBaseId} was not found; restarting full refresh`, {
                    level: 'warn'
                });
            }
        }

        for (let i = startIndex; i < bases.length; i++) {
            const base = bases[i];
            if (!base) {
                continue;
            }

            // https://airtable.com/developers/web/api/get-base-schema
            const tablesResponse = await nango.get({
                endpoint: `/v0/meta/bases/${base.id}/tables`,
                retries: 3
            });

            const tablesResult = z.object({ tables: z.array(TableSchema) }).safeParse(tablesResponse.data);
            if (!tablesResult.success) {
                await nango.log(`Failed to parse tables response for base ${base.id}: ${JSON.stringify(tablesResult.error)}`, {
                    level: 'error'
                });
                throw new Error(`Failed to parse Airtable tables for base ${base.id}`);
            }

            const tables = tablesResult.data.tables;

            for (const table of tables) {
                const views = table.views;

                if (views.length > 0) {
                    const viewRecords = views.map((view) => ({
                        id: `${base.id}_${table.id}_${view.id}`,
                        base_id: base.id,
                        table_id: table.id,
                        name: view.name,
                        type: view.type
                    }));

                    await nango.batchSave(viewRecords, 'View');
                }
            }

            await nango.saveCheckpoint({
                lastProcessedBaseId: base.id
            });
        }

        await nango.trackDeletesEnd('View');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
