import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const IntegrationSchema = z
    .object({
        name: z.string().optional(),
        category: z.string().optional(),
        id: z.string().optional()
    })
    .optional();

const MetricSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    integration: IntegrationSchema
});

const ProviderMetricSchema = z.object({
    id: z.string(),
    attributes: z
        .object({
            name: z.string().optional(),
            created: z.string().optional(),
            updated: z.string().optional(),
            integration: z
                .object({
                    name: z.string().optional(),
                    category: z.string().optional(),
                    id: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    next_url: z.string()
});

const sync = createSync({
    description: 'Sync metrics.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Metric: MetricSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextUrl: string | undefined;
        if (checkpoint != null) {
            const parsed = CheckpointSchema.safeParse(checkpoint);
            if (!parsed.success) {
                throw new Error(`Invalid checkpoint: ${parsed.error.message}`);
            }
            nextUrl = parsed.data.next_url;
        }

        // Blocker: provider only exposes /api/metrics with no changed-since filter
        // and no deleted-record endpoint, so full refresh is required. Pagination
        // is resumable via links.next.
        await nango.trackDeletesStart('Metric');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.klaviyo.com/en/reference/get_metrics
            endpoint: nextUrl ?? '/api/metrics',
            headers: {
                revision: '2026-04-15'
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'links.next',
                response_path: 'data',
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'string') {
                        nextUrl = nextPageParam;
                    } else {
                        nextUrl = undefined;
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected metrics page to be an array');
            }

            const metrics = [];
            for (const item of page) {
                const parsed = ProviderMetricSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error('Invalid metric item in page');
                }

                const record = parsed.data;
                const metric = {
                    id: record.id,
                    ...(record.attributes?.name != null && { name: record.attributes.name }),
                    ...(record.attributes?.created != null && { created: record.attributes.created }),
                    ...(record.attributes?.updated != null && { updated: record.attributes.updated }),
                    ...(record.attributes?.integration != null && {
                        integration: {
                            ...(record.attributes.integration.name != null && { name: record.attributes.integration.name }),
                            ...(record.attributes.integration.category != null && { category: record.attributes.integration.category }),
                            ...(record.attributes.integration.id != null && { id: record.attributes.integration.id })
                        }
                    })
                };

                metrics.push(metric);
            }

            if (metrics.length > 0) {
                await nango.batchSave(metrics, 'Metric');
            }

            if (typeof nextUrl === 'string') {
                await nango.saveCheckpoint({ next_url: nextUrl });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Metric');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
