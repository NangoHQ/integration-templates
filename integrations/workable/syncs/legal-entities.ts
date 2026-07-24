import { createSync } from 'nango';
import { z } from 'zod';

const ProviderLegalEntitySchema = z
    .object({
        id: z.string(),
        name: z.string(),
        legal_name: z.string().nullable().optional(),
        type: z.string(),
        parent_id: z.string().nullable().optional(),
        display_name: z.string()
    })
    .passthrough();

const LegalEntitySchema = z.object({
    id: z.string(),
    name: z.string(),
    legal_name: z.string().optional(),
    type: z.string(),
    parent_id: z.string().nullable().optional(),
    display_name: z.string()
});

const sync = createSync({
    description: 'Sync HR legal entities/locations/sites org structure',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        LegalEntity: LegalEntitySchema
    },

    exec: async (nango) => {
        // Blocker: /legal_entities returns a bare array with no changed-since filter,
        // no pagination, no resumable cursor, and no deleted-record endpoint.
        await nango.trackDeletesStart('LegalEntity');

        // https://workable.readme.io/reference/legal_entities
        const response = await nango.get({
            endpoint: '/spi/v3/legal_entities',
            retries: 3
        });

        const rawEntities = z.array(ProviderLegalEntitySchema).safeParse(response.data);

        if (!rawEntities.success) {
            throw new Error(`Failed to parse legal entities: ${rawEntities.error.message}`);
        }

        const entities = rawEntities.data.map((entity) => ({
            id: entity.id,
            name: entity.name,
            ...(entity.legal_name != null && { legal_name: entity.legal_name }),
            type: entity.type,
            ...(entity.parent_id !== undefined && { parent_id: entity.parent_id }),
            display_name: entity.display_name
        }));

        if (entities.length > 0) {
            await nango.batchSave(entities, 'LegalEntity');
        }

        await nango.trackDeletesEnd('LegalEntity');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
