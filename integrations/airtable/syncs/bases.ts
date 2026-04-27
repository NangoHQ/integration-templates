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

const ProviderBasesResponseSchema = z.object({
    bases: z.array(ProviderBaseSchema),
    offset: z.string().optional()
});

const CheckpointSchema = z.object({
    offset: z.string()
});

const sync = createSync({
    description: 'Sync Airtable bases visible to the authenticated user.',
    version: '2.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/bases' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Base: BaseSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let offset = typeof checkpoint?.['offset'] === 'string' ? checkpoint['offset'] : undefined;

        // Airtable exposes page offsets for resume state, but no changed-since filter or delete feed for bases.
        await nango.trackDeletesStart('Base');

        do {
            const response = await nango.get({
                // https://airtable.com/developers/web/api/list-bases
                endpoint: '/v0/meta/bases',
                params: {
                    ...(offset ? { offset } : {})
                },
                retries: 3
            });

            const providerResponse = ProviderBasesResponseSchema.parse(response.data);

            const bases = providerResponse.bases.map((base) => ({
                id: base.id,
                ...(base.name != null && { name: base.name }),
                ...(base.permissionLevel != null && { permissionLevel: base.permissionLevel })
            }));

            if (bases.length > 0) {
                await nango.batchSave(bases, 'Base');
            }

            offset = providerResponse.offset;
            if (offset) {
                await nango.saveCheckpoint({ offset });
            }
        } while (offset);

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Base');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
