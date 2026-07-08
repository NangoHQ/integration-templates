import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCategorySchema = z.object({
    id: z.number().int(),
    label: z.string(),
    direction: z.union([z.enum(['cash_in', 'cash_out']), z.null()]),
    created_at: z.string(),
    updated_at: z.string(),
    category_group: z.object({
        id: z.number().int()
    }),
    analytical_code: z.union([z.string(), z.null()])
});

const CategorySchema = z.object({
    id: z.string(),
    label: z.string(),
    direction: z.enum(['cash_in', 'cash_out']).optional(),
    created_at: z.string(),
    updated_at: z.string(),
    category_group_id: z.number().int(),
    analytical_code: z.string().optional()
});

const sync = createSync({
    description: 'Sync analytical categories',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Category: CategorySchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes GET /categories with no changed-since filter,
        // no deleted-record endpoint, and no changelog endpoint for categories.
        await nango.trackDeletesStart('Category');

        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getcategories
            endpoint: '/api/external/v2/categories',
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
            const records = page.map((raw) => {
                const parsed = ProviderCategorySchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse category: ${parsed.error.message}`);
                }

                const record = parsed.data;
                return {
                    id: String(record.id),
                    label: record.label,
                    ...(record.direction != null && { direction: record.direction }),
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                    category_group_id: record.category_group.id,
                    ...(record.analytical_code != null && { analytical_code: record.analytical_code })
                };
            });

            if (records.length > 0) {
                await nango.batchSave(records, 'Category');
            }
        }

        await nango.trackDeletesEnd('Category');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
