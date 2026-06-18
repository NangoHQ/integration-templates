import { createSync } from 'nango';
import { z } from 'zod';

const ProviderAnnotationCategorySchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    category: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderAnnotationCategorySchema)
});

const AnnotationCategorySchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const sync = createSync({
    description: 'Sync Amplitude annotation categories.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/annotation-categories' }],
    models: {
        AnnotationCategory: AnnotationCategorySchema
    },

    exec: async (nango) => {
        // https://amplitude.com/docs/apis/analytics/chart-annotations
        const response = await nango.get({
            endpoint: '/api/3/annotation-categories',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse annotation categories: ${parsed.error.message}`);
        }

        const categories = parsed.data.data.map((category) => {
            const categoryName = category.name ?? category.category;
            return {
                id: String(category.id),
                ...(categoryName != null && { name: categoryName })
            };
        });

        await nango.trackDeletesStart('AnnotationCategory');
        if (categories.length > 0) {
            await nango.batchSave(categories, 'AnnotationCategory');
        }
        await nango.trackDeletesEnd('AnnotationCategory');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
