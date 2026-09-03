import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    projects: z.array(z.string())
});

const CheckpointSchema = z.object({
    project: z.string(),
    continuationToken: z.string()
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
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Pipeline: PipelineSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();

        if (!metadata?.projects || metadata.projects.length === 0) {
            throw new Error('Metadata projects array is required and must not be empty');
        }

        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);

        let startProjectIndex = 0;
        let startContinuationToken = '';

        if (parsedCheckpoint.success) {
            const projectIdx = metadata.projects.indexOf(parsedCheckpoint.data.project);
            if (projectIdx !== -1) {
                startProjectIndex = projectIdx;
                startContinuationToken = parsedCheckpoint.data.continuationToken;
            }
        }

        await nango.trackDeletesStart('Pipeline');

        for (let projectIdx = startProjectIndex; projectIdx < metadata.projects.length; projectIdx++) {
            const project = metadata.projects[projectIdx];
            if (typeof project !== 'string') {
                continue;
            }
            let continuationToken: string = projectIdx === startProjectIndex ? startContinuationToken : '';

            while (true) {
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
                const nextTokenStr =
                    typeof nextToken === 'string' ? nextToken : Array.isArray(nextToken) && typeof nextToken[0] === 'string' ? nextToken[0] : undefined;

                if (typeof nextTokenStr === 'string' && nextTokenStr.length > 0) {
                    continuationToken = nextTokenStr;
                    await nango.saveCheckpoint({ project, continuationToken: nextTokenStr });
                    continue;
                }

                const nextProject = metadata.projects[projectIdx + 1];
                if (nextProject) {
                    await nango.saveCheckpoint({ project: nextProject, continuationToken: '' });
                }
                break;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Pipeline');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
