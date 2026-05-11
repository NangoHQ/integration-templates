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

const sync = createSync({
    description: 'Sync ticket views from Zendesk',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
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
        await nango.trackDeletesStart('View');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.zendesk.com/api-reference/ticketing/business-rules/views/#list-views
            endpoint: '/api/v2/views',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'views'
            },
            retries: 3
        };

        try {
            for await (const page of nango.paginate(proxyConfig)) {
                const views = page.map(
                    (record: {
                        id: number;
                        title: string;
                        description?: string | null;
                        active?: boolean;
                        created_at?: string;
                        updated_at?: string;
                        default?: boolean;
                        position?: number;
                        conditions?: Record<string, unknown>;
                        execution?: Record<string, unknown>;
                        restriction?: unknown;
                    }) => ({
                        id: String(record.id),
                        title: record.title,
                        ...(record.description != null && { description: record.description }),
                        ...(record.active !== undefined && { active: record.active }),
                        ...(record.created_at != null && { created_at: record.created_at }),
                        ...(record.updated_at != null && { updated_at: record.updated_at }),
                        ...(record.default !== undefined && { default: record.default }),
                        ...(record.position !== undefined && { position: record.position }),
                        ...(record.conditions !== undefined && { conditions: record.conditions }),
                        ...(record.execution !== undefined && { execution: record.execution }),
                        ...(record.restriction !== undefined && { restriction: record.restriction })
                    })
                );

                if (views.length > 0) {
                    await nango.batchSave(views, 'View');
                }
            }
        } finally {
            await nango.trackDeletesEnd('View');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
