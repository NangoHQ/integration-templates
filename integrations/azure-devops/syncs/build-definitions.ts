import { createSync } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string()
});

const BuildDefinitionSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    path: z.string().optional(),
    projectId: z.string().optional(),
    projectName: z.string().optional(),
    url: z.string().optional(),
    revision: z.number().optional(),
    createdDate: z.string().optional()
});

const ProviderDefinitionSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    path: z.string().optional(),
    project: ProjectSchema.optional(),
    url: z.string().optional(),
    revision: z.number().optional(),
    createdDate: z.string().optional()
});

const ListResponseSchema = z.object({
    count: z.number().optional(),
    value: z.array(ProviderDefinitionSchema)
});

const MetadataSchema = z.object({
    projects: z.array(z.string())
});

const CheckpointSchema = z.object({
    project: z.string(),
    continuationToken: z.string()
});

const sync = createSync({
    description: 'Sync classic pipeline (build) definitions.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        BuildDefinition: BuildDefinitionSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.safeParse(rawMetadata);
        if (!metadata.success || metadata.data.projects.length === 0) {
            throw new Error('projects array is required in metadata');
        }

        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : { project: '', continuationToken: '' };

        await nango.trackDeletesStart('BuildDefinition');

        const projects = metadata.data.projects;
        let startIndex = 0;
        let resumeContinuationToken = '';
        if (checkpoint.project !== '') {
            const idx = projects.indexOf(checkpoint.project);
            if (idx !== -1) {
                startIndex = idx;
                resumeContinuationToken = checkpoint.continuationToken;
            }
        }

        for (let i = startIndex; i < projects.length; i++) {
            const project = projects[i];
            if (project === undefined) {
                throw new Error(`Project at index ${i} is undefined`);
            }
            let continuationToken: string | undefined = i === startIndex && resumeContinuationToken !== '' ? resumeContinuationToken : undefined;

            do {
                // https://learn.microsoft.com/en-us/rest/api/azure/devops/build/definitions/list?view=azure-devops-rest-7.2
                const params: Record<string, string | number> = {
                    'api-version': '7.2-preview.7',
                    $top: LIMIT
                };
                if (continuationToken !== undefined) {
                    params['continuationToken'] = continuationToken;
                }

                const response = await nango.get({
                    endpoint: `/${encodeURIComponent(project)}/_apis/build/definitions`,
                    params,
                    retries: 3
                });

                const parsed = ListResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse build definitions for project ${project}: ${parsed.error.message}`);
                }

                const definitions = parsed.data.value.map((def) => ({
                    id: String(def.id),
                    name: def.name,
                    path: def.path,
                    projectId: def.project?.id,
                    projectName: def.project?.name,
                    url: def.url,
                    revision: def.revision,
                    createdDate: def.createdDate
                }));

                if (definitions.length > 0) {
                    await nango.batchSave(definitions, 'BuildDefinition');
                }

                const headerValue = response.headers['x-ms-continuationtoken'];
                let nextToken: string | undefined;
                if (typeof headerValue === 'string') {
                    const trimmed = headerValue.trim();
                    nextToken = trimmed.length > 0 ? trimmed : undefined;
                }

                if (nextToken) {
                    const token = nextToken;
                    await nango.saveCheckpoint({ project, continuationToken: token });
                    continuationToken = token;
                } else {
                    const nextProject = projects[i + 1];
                    if (nextProject) {
                        await nango.saveCheckpoint({ project: nextProject, continuationToken: '' });
                    }
                    continuationToken = undefined;
                }
            } while (continuationToken !== undefined);
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('BuildDefinition');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
