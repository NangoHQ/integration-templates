import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderBankEstablishmentSchema = z.object({
    id: z.number().int(),
    name: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const BankEstablishmentSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync bank establishments',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        BankEstablishment: BankEstablishmentSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /bank_establishments with no changed-since filter
        // and no deleted-record endpoint. Full-refresh delete tracking is used, and cursor
        // pagination is checkpointed so an interrupted crawl can resume instead of restarting.
        const rawCheckpoint = await nango.getCheckpoint();
        let checkpoint: z.infer<typeof CheckpointSchema> | undefined;
        if (rawCheckpoint) {
            const result = CheckpointSchema.safeParse(rawCheckpoint);
            if (!result.success) {
                throw new Error(`Invalid checkpoint: ${result.error.message}`);
            }
            checkpoint = result.data;
        }
        let nextCursor: string | undefined = checkpoint?.cursor;

        await nango.trackDeletesStart('BankEstablishment');

        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getbankestablishments
            endpoint: '/api/external/v2/bank_establishments',
            params: {
                ...(nextCursor ? { cursor: nextCursor } : {})
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

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderBankEstablishmentSchema).safeParse(page);

            if (!parsed.success) {
                throw new Error(`Failed to parse bank establishments: ${parsed.error.message}`);
            }

            const establishments = parsed.data.map((record) => ({
                id: String(record.id),
                ...(record.name != null && { name: record.name }),
                ...(record.created_at != null && { created_at: record.created_at }),
                ...(record.updated_at != null && { updated_at: record.updated_at })
            }));

            if (establishments.length > 0) {
                await nango.batchSave(establishments, 'BankEstablishment');
            }

            if (nextCursor !== undefined) {
                await nango.saveCheckpoint({ cursor: nextCursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('BankEstablishment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
