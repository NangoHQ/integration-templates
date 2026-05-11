import type { ProxyConfiguration } from 'nango';
import { createSync } from 'nango';
import { z } from 'zod';

const BaseSchema = z.object({
    id: z.string().describe('The unique identifier for the base. Example: appXXXXXXXXXXXXXX'),
    name: z.string().optional(),
    permissionLevel: z.string().optional()
});

const ProviderBaseSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    permissionLevel: z.string().nullable().optional()
});

type ProviderBase = z.infer<typeof ProviderBaseSchema>;

const sync = createSync({
    description: 'Sync Airtable bases visible to the authenticated user.',
    version: '2.0.1',
    endpoints: [{ method: 'GET', path: '/syncs/bases' }],
    frequency: 'every hour',
    autoStart: true,
    models: {
        Base: BaseSchema
    },
    scopes: ['schema.bases:read'],

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://airtable.com/developers/web/api/list-bases
            endpoint: '/v0/meta/bases',
            retries: 10,
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'offset',
                cursor_name_in_request: 'offset',
                response_path: 'bases'
            }
        };

        await nango.trackDeletesStart('Base');

        for await (const page of nango.paginate<ProviderBase>(config)) {
            const bases = page.map((base) => ({
                id: base.id,
                ...(base.name != null && { name: base.name }),
                ...(base.permissionLevel != null && { permissionLevel: base.permissionLevel })
            }));

            if (bases.length > 0) {
                await nango.batchSave(bases, 'Base');
            }
        }

        await nango.trackDeletesEnd('Base');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
