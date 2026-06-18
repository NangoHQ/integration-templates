import { createSync } from 'nango';
import { z } from 'zod';

const EventCategorySchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(ProviderCategorySchema)
});

const sync = createSync({
    description: 'Sync Amplitude taxonomy event categories',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        EventCategory: EventCategorySchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/event-categories'
        }
    ],

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const hostname = typeof connection.connection_config?.['hostname'] === 'string' ? connection.connection_config['hostname'] : 'amplitude.com';

        // https://amplitude.com/docs/apis/analytics/taxonomy
        const response = await nango.get({
            endpoint: '/api/2/taxonomy/category',
            baseUrlOverride: `https://${hostname}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new Error('Invalid response from Amplitude taxonomy category endpoint');
        }

        const categories = parsed.data.data.map((category) => ({
            id: String(category.id),
            ...(category.name != null && { name: category.name })
        }));

        await nango.trackDeletesStart('EventCategory');

        if (categories.length > 0) {
            await nango.batchSave(categories, 'EventCategory');
        }

        await nango.trackDeletesEnd('EventCategory');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
