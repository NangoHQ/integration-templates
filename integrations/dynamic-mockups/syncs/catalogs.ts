import { createSync } from 'nango';
import { z } from 'zod';

const CatalogSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    created_at: z.string().optional(),
    created_at_timestamp: z.number().optional()
});

const ProviderCatalogSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    type: z.string(),
    created_at: z.string().optional(),
    created_at_timestamp: z.number().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderCatalogSchema),
    success: z.boolean().optional(),
    message: z.string().optional()
});

const sync = createSync({
    description: 'Sync catalogs (top-level containers scoping mockups/collections) in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Catalog: CatalogSchema
    },

    exec: async (nango) => {
        // https://docs.dynamicmockups.com/api-reference/catalogs-api#get-catalogs
        const response = await nango.get({
            endpoint: '/v1/catalogs',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse catalogs response: ${parsed.error.message}`);
        }

        await nango.trackDeletesStart('Catalog');

        const catalogs = parsed.data.data.map((catalog) => ({
            id: catalog.uuid,
            name: catalog.name,
            type: catalog.type,
            ...(catalog.created_at != null && { created_at: catalog.created_at }),
            ...(catalog.created_at_timestamp != null && { created_at_timestamp: catalog.created_at_timestamp })
        }));

        if (catalogs.length > 0) {
            await nango.batchSave(catalogs, 'Catalog');
        }

        await nango.trackDeletesEnd('Catalog');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
