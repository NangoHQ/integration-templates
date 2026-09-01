import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderPaRegistrationSchema = z.object({
    id: z.number().int(),
    siret: z.string().nullable(),
    siren: z.string(),
    status: z.string(),
    exchange_direction: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const PaRegistrationSchema = z.object({
    id: z.string(),
    siret: z.string().optional(),
    siren: z.string().optional(),
    status: z.string().optional(),
    exchange_direction: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync PA registrations.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        PaRegistration: PaRegistrationSchema
    },

    exec: async (nango) => {
        // The provider only exposes GET /pa_registrations with no changed-since filter,
        // so we perform a full refresh with trackDeletes to keep the local cache accurate.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let cursor = checkpoint ? checkpoint.cursor : undefined;

        await nango.trackDeletesStart('PaRegistration');

        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getparegistrations
            endpoint: '/api/external/v2/pa_registrations',
            params: {
                limit: 100,
                ...(cursor ? { cursor } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items = z.array(ProviderPaRegistrationSchema).parse(page);

            const records = items.map((item) => ({
                id: String(item.id),
                ...(item.siret != null && { siret: item.siret }),
                ...(item.siren != null && { siren: item.siren }),
                ...(item.status != null && { status: item.status }),
                ...(item.exchange_direction != null && { exchange_direction: item.exchange_direction }),
                ...(item.created_at != null && { created_at: item.created_at }),
                ...(item.updated_at != null && { updated_at: item.updated_at })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'PaRegistration');
            }

            if (cursor) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('PaRegistration');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
