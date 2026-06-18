import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    projects: z.array(z.string())
});

const PipelineSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    name: z.string().optional(),
    folder: z.string().optional(),
    revision: z.number().optional(),
    url: z.string().optional()
});

const PipelineResponseSchema = z.object({
    count: z.number().optional(),
    value: z.array(
        z.object({
            id: z.number(),
            name: z.string().optional(),
            folder: z.string().optional(),
            revision: z.number().optional(),
            url: z.string().optional()
        })
    )
});

const sync = createSync({
    description: 'Sync YAML pipeline definitions',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Pipeline: PipelineSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/pipelines'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();

        if (!metadata?.projects || metadata.projects.length === 0) {
            throw new Error('Metadata projects array is required and must not be empty');
        }

        await nango.trackDeletesStart('Pipeline');

        for (const project of metadata.projects) {
            let continuationToken: string | undefined;

            do {
                const params: Record<string, string | number> = {
                    'api-version': '7.2-preview.1'
                };

                if (continuationToken) {
                    params['continuationToken'] = continuationToken;
                }

                // https://learn.microsoft.com/en-us/rest/api/azure/devops/pipelines/pipelines/list?view=azure-devops-rest-7.2
                const response = await nango.get({
                    endpoint: `/${encodeURIComponent(project)}/_apis/pipelines`,
                    params,
                    retries: 3
                });

                const parsed = PipelineResponseSchema.safeParse(response.data);

                if (!parsed.success) {
                    throw new Error(`Failed to parse pipelines response for project ${project}: ${parsed.error.message}`);
                }

                const pipelines = parsed.data.value.map((pipeline) => ({
                    id: `${project}-${String(pipeline.id)}`,
                    projectId: project,
                    name: pipeline.name,
                    folder: pipeline.folder,
                    revision: pipeline.revision,
                    url: pipeline.url
                }));

                if (pipelines.length > 0) {
                    await nango.batchSave(pipelines, 'Pipeline');
                }

                const nextToken = response.headers['x-ms-continuationtoken'];
                continuationToken = typeof nextToken === 'string' ? nextToken : undefined;
            } while (continuationToken);
        }

        await nango.trackDeletesEnd('Pipeline');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
