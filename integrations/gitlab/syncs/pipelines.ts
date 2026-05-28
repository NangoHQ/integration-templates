import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    project_id: z.string()
});

const ProviderPipelineSchema = z.object({
    id: z.number(),
    iid: z.number(),
    project_id: z.number(),
    status: z.string(),
    source: z.string().nullable().optional(),
    ref: z.string().nullable().optional(),
    sha: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    web_url: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const PipelineSchema = z.object({
    id: z.string(),
    iid: z.number(),
    project_id: z.number(),
    status: z.string(),
    source: z.string().optional(),
    ref: z.string().optional(),
    sha: z.string().optional(),
    name: z.string().optional(),
    web_url: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync pipelines from GitLab.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Pipeline: PipelineSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/pipelines' }],
    scopes: ['read_api'],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        if (!metadata?.project_id) {
            throw new Error('project_id is required in metadata');
        }

        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;
        let maxUpdatedAt: string | undefined;

        const params: Record<string, string> = {
            order_by: 'updated_at',
            sort: 'asc'
        };
        if (updatedAfter) {
            params['updated_after'] = updatedAfter;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://docs.gitlab.com/api/pipelines/#list-project-pipelines
            endpoint: `/api/v4/projects/${encodeURIComponent(metadata.project_id)}/pipelines`,
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const pipelines = pageResults.map((raw: unknown) => {
                const parsed = ProviderPipelineSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Invalid pipeline record: ${parsed.error.message}`);
                }
                return {
                    id: String(parsed.data.id),
                    iid: parsed.data.iid,
                    project_id: parsed.data.project_id,
                    status: parsed.data.status,
                    ...(parsed.data.source != null && { source: parsed.data.source }),
                    ...(parsed.data.ref != null && { ref: parsed.data.ref }),
                    ...(parsed.data.sha != null && { sha: parsed.data.sha }),
                    ...(parsed.data.name != null && { name: parsed.data.name }),
                    ...(parsed.data.web_url != null && { web_url: parsed.data.web_url }),
                    created_at: parsed.data.created_at,
                    updated_at: parsed.data.updated_at
                };
            });

            if (pipelines.length === 0) {
                continue;
            }

            await nango.batchSave(pipelines, 'Pipeline');
            const lastPipeline = pipelines[pipelines.length - 1];
            if (lastPipeline && (maxUpdatedAt === undefined || lastPipeline.updated_at > maxUpdatedAt)) {
                maxUpdatedAt = lastPipeline.updated_at;
            }
        }

        if (maxUpdatedAt) {
            await nango.saveCheckpoint({
                updated_after: maxUpdatedAt
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
