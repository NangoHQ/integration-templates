import { createSync } from 'nango';
import { z } from 'zod';

const LocationOptionSchema = z.object({
    id: z.number(),
    name: z.string(),
    archived: z.string().optional(),
    createdDate: z.string().nullable().optional(),
    archivedDate: z.string().nullable().optional(),
    manageable: z.string().optional()
});

const ListFieldSchema = z.object({
    id: z.number().optional(),
    fieldId: z.number().optional(),
    alias: z.string().nullable().optional(),
    name: z.string().optional(),
    manageable: z.string().optional(),
    multiple: z.string().optional(),
    options: z.array(LocationOptionSchema).optional()
});

const LocationSchema = z.object({
    id: z.string(),
    name: z.string(),
    archived: z.string().optional(),
    createdDate: z.string().optional(),
    archivedDate: z.string().optional()
});

const sync = createSync({
    description: 'Sync office location list values from BambooHR.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/locations' }],
    models: {
        Location: LocationSchema
    },

    exec: async (nango) => {
        // https://documentation.bamboohr.com/reference/list-list-fields
        const response = await nango.get({
            endpoint: '/v1/meta/lists',
            headers: { Accept: 'application/json' },
            retries: 3
        });

        const lists = z.array(ListFieldSchema).safeParse(response.data);
        if (!lists.success) {
            throw new Error(`Failed to parse list fields: ${lists.error.message}`);
        }

        const locationList = lists.data.find((list) => list.alias === 'location');
        if (!locationList) {
            throw new Error('Location list not found in BambooHR list fields');
        }

        await nango.trackDeletesStart('Location');

        const options = locationList.options ?? [];
        const locations = options.map((option) => ({
            id: String(option.id),
            name: option.name,
            ...(option.archived !== undefined && { archived: option.archived }),
            ...(option.createdDate != null && { createdDate: option.createdDate }),
            ...(option.archivedDate != null && { archivedDate: option.archivedDate })
        }));

        if (locations.length > 0) {
            await nango.batchSave(locations, 'Location');
        }

        await nango.trackDeletesEnd('Location');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
