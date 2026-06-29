import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProjectSchema = z.object({
    id: z.string().describe('Project ID. Example: "12345678-1234-1234-1234-123456789012"'),
    name: z.string(),
    description: z.string().optional(),
    url: z.string().describe('Project URL. Example: "https://dev.azure.com/nangoapi/_apis/projects/123"').optional(),
    state: z.string().optional(),
    visibility: z.string().optional(),
    lastUpdateTime: z.string().describe('Last update timestamp. Example: "2023-01-01T00:00:00Z"').optional()
});

const CheckpointSchema = z.object({
    continuationToken: z.string()
});

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    url: z.string().optional(),
    state: z.string().optional(),
    visibility: z.string().optional(),
    lastUpdateTime: z.string().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(z.unknown())
});

const sync = createSync({
    description: 'Sync all projects in the organization',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        if (!parsedCheckpoint.success) {
            await nango.saveCheckpoint({ continuationToken: '' });
        }

        // Reset cursor to undefined for delete-tracked sync
        let continuationToken: string | undefined = undefined;

        await nango.trackDeletesStart('Project');

        let hasMorePages = true;
        while (hasMorePages) {
            const params: Record<string, string | number> = {
                'api-version': '7.2-preview.4'
            };

            if (continuationToken !== undefined) {
                params['continuationToken'] = continuationToken;
            }

            const config: ProxyConfiguration = {
                // https://learn.microsoft.com/en-us/rest/api/azure/devops/core/projects/list?view=azure-devops-rest-7.2
                endpoint: '/_apis/projects',
                params,
                retries: 3
            };
            const response = await nango.get(config);

            const parsedResponse = ProviderResponseSchema.parse(response.data);
            const rawProjects = parsedResponse.value;

            const projects = rawProjects.map((raw) => {
                const providerProject = ProviderProjectSchema.parse(raw);
                return {
                    id: providerProject.id,
                    name: providerProject.name,
                    ...(providerProject.description !== undefined && { description: providerProject.description }),
                    ...(providerProject.url !== undefined && { url: providerProject.url }),
                    ...(providerProject.state !== undefined && { state: providerProject.state }),
                    ...(providerProject.visibility !== undefined && { visibility: providerProject.visibility }),
                    ...(providerProject.lastUpdateTime !== undefined && { lastUpdateTime: providerProject.lastUpdateTime })
                };
            });

            if (projects.length > 0) {
                await nango.batchSave(projects, 'Project');
            }

            const nextToken = response.headers?.['x-ms-continuationtoken'];
            const nextTokenStr = typeof nextToken === 'string' ? nextToken : Array.isArray(nextToken) ? nextToken[0] : undefined;
            hasMorePages = nextTokenStr !== undefined && nextTokenStr.length > 0;
            if (hasMorePages) {
                continuationToken = nextTokenStr;
            } else {
                continuationToken = undefined;
            }

            await nango.saveCheckpoint({ continuationToken: continuationToken || '' });
        }

        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
