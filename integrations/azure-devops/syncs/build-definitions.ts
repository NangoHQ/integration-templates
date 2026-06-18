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

const sync = createSync({
    description: 'Sync classic pipeline (build) definitions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        BuildDefinition: BuildDefinitionSchema
    },
    endpoints: [{ method: 'POST', path: '/syncs/build-definitions' }],

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.safeParse(rawMetadata);
        if (!metadata.success || metadata.data.projects.length === 0) {
            throw new Error('projects array is required in metadata');
        }

        await nango.trackDeletesStart('BuildDefinition');

        for (const project of metadata.data.projects) {
            let continuationToken: string | undefined;
            do {
                // https://learn.microsoft.com/en-us/rest/api/azure/devops/build/definitions/list?view=azure-devops-rest-7.2
                const response = await nango.get({
                    endpoint: `/${encodeURIComponent(project)}/_apis/build/definitions`,
                    params: {
                        'api-version': '7.2-preview.7',
                        ...(continuationToken && { continuationToken }),
                        $top: LIMIT
                    },
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
                if (typeof headerValue === 'string') {
                    const trimmed = headerValue.trim();
                    continuationToken = trimmed.length > 0 ? trimmed : undefined;
                } else {
                    continuationToken = undefined;
                }
            } while (typeof continuationToken !== 'undefined');
        }

        await nango.trackDeletesEnd('BuildDefinition');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
