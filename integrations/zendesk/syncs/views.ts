import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ViewSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    active: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    default: z.boolean().optional(),
    position: z.number().optional(),
    conditions: z.object({}).passthrough().optional(),
    execution: z.object({}).passthrough().optional(),
    restriction: z.unknown().optional()
});

const ProviderViewSchema = z.object({
    id: z.number(),
    title: z.string(),
    description: z.string().nullable().optional(),
    active: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    default: z.boolean().optional(),
    position: z.number().optional(),
    conditions: z.object({}).passthrough().optional(),
    execution: z.object({}).passthrough().optional(),
    restriction: z.unknown().optional()
});

type ProviderView = z.infer<typeof ProviderViewSchema>;

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync ticket views from Zendesk',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        View: ViewSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/views'
        }
    ],

    exec: async (nango) => {
        // Full refresh reference sync for views metadata
        // Blocker: Zendesk Views API does not support changed-since filtering
        const checkpoint = await nango.getCheckpoint();
        let page: number | undefined = checkpoint?.page ?? 1;

        await nango.trackDeletesStart('View');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.zendesk.com/api-reference/ticketing/business-rules/views/#list-views
            endpoint: '/api/v2/views',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'views',
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate<ProviderView>(proxyConfig)) {
            const views = [];

            for (const record of pageResults) {
                const parseResult = ProviderViewSchema.safeParse(record);
                if (!parseResult.success) {
                    throw new Error(`Failed to parse view: ${JSON.stringify(parseResult.error.issues)}`);
                }

                const view = parseResult.data;
                views.push({
                    id: String(view.id),
                    title: view.title,
                    ...(view.description != null && { description: view.description }),
                    ...(view.active !== undefined && { active: view.active }),
                    ...(view.created_at != null && { created_at: view.created_at }),
                    ...(view.updated_at != null && { updated_at: view.updated_at }),
                    ...(view.default !== undefined && { default: view.default }),
                    ...(view.position !== undefined && { position: view.position }),
                    ...(view.conditions !== undefined && { conditions: view.conditions }),
                    ...(view.execution !== undefined && { execution: view.execution }),
                    ...(view.restriction !== undefined && { restriction: view.restriction })
                });
            }

            if (views.length > 0) {
                await nango.batchSave(views, 'View');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('View');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
