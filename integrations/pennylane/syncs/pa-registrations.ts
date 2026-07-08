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

const sync = createSync({
    description: 'Sync PA registrations.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        PaRegistration: PaRegistrationSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes GET /pa_registrations with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.
        await nango.trackDeletesStart('PaRegistration');

        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getparegistrations
            endpoint: '/api/external/v2/pa_registrations',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100
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
        }

        await nango.trackDeletesEnd('PaRegistration');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
