import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DashboardSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    layout_type: z.string().optional(),
    url: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    author_handle: z.string().optional(),
    author_name: z.string().optional(),
    is_read_only: z.boolean().optional()
});

const ProviderDashboardSchema = z.object({
    id: z.string(),
    title: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    layout_type: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    modified_at: z.string().optional().nullable(),
    author_handle: z.string().optional().nullable(),
    author_name: z.string().optional().nullable(),
    is_read_only: z.boolean().optional().nullable()
});

const CheckpointSchema = z.object({
    start: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync dashboards in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Dashboard: DashboardSchema
    },

    exec: async (nango) => {
        const checkpoint: z.infer<typeof CheckpointSchema> | null = await nango.getCheckpoint();
        let start = checkpoint?.start ?? 0;

        const proxyConfig: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/dashboards/#get-all-dashboards
            endpoint: 'v1/dashboard',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'start',
                offset_start_value: start,
                offset_calculation_method: 'by-response-size',

                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'dashboards'
            },
            retries: 3
        };

        await nango.trackDeletesStart('Dashboard');

        for await (const page of nango.paginate(proxyConfig)) {
            const dashboards = page.map((record) => {
                const parsed = ProviderDashboardSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse dashboard record: ${parsed.error.message}`);
                }

                const d = parsed.data;
                return {
                    id: d.id,
                    ...(d.title != null && { title: d.title }),
                    ...(d.description != null && { description: d.description }),
                    ...(d.layout_type != null && { layout_type: d.layout_type }),
                    ...(d.url != null && { url: d.url }),
                    ...(d.created_at != null && { created_at: d.created_at }),
                    ...(d.modified_at != null && { modified_at: d.modified_at }),
                    ...(d.author_handle != null && { author_handle: d.author_handle }),
                    ...(d.author_name != null && { author_name: d.author_name }),
                    ...(d.is_read_only != null && { is_read_only: d.is_read_only })
                };
            });

            if (dashboards.length > 0) {
                await nango.batchSave(dashboards, 'Dashboard');
                start += dashboards.length;
                await nango.saveCheckpoint({ start });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Dashboard');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
