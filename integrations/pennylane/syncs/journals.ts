import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderJournalSchema = z
    .object({
        id: z.number(),
        code: z.string(),
        label: z.string(),
        type: z.string()
    })
    .passthrough();

const JournalSchema = z.object({
    id: z.string(),
    code: z.string(),
    label: z.string(),
    type: z.string()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync journals.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Journal: JournalSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let nextCursor: string | undefined = checkpoint ? checkpoint['cursor'] : undefined;

        // Blocker: provider only exposes GET /journals with no changed-since filter,
        // no deleted-record endpoint, and no durable resumable cursor suitable for
        // incremental sync. Cursors are temporary position markers, not state tokens.
        // We checkpoint pagination progress so a long full refresh can resume within
        // the same crawl instead of restarting from page 1.
        await nango.trackDeletesStart('Journal');

        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getjournals
            endpoint: '/api/external/v2/journals',
            params: {
                ...(nextCursor && { cursor: nextCursor })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextCursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        // https://pennylane.readme.io/reference/getjournals
        for await (const page of nango.paginate(proxyConfig)) {
            const parsedItems = z.array(ProviderJournalSchema).safeParse(page);

            if (!parsedItems.success) {
                throw new Error(`Invalid journals response: ${parsedItems.error.message}`);
            }

            const journals = parsedItems.data.map((record) => ({
                id: String(record.id),
                code: record.code,
                label: record.label,
                type: record.type
            }));

            if (journals.length > 0) {
                await nango.batchSave(journals, 'Journal');
            }

            if (nextCursor !== undefined) {
                await nango.saveCheckpoint({ cursor: nextCursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Journal');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
