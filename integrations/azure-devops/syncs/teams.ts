import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    projectIds: z.array(z.string()).min(1)
});

const TeamSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    projectId: z.string().optional(),
    projectName: z.string().optional(),
    url: z.string().optional(),
    identityUrl: z.string().optional()
});

const ProviderTeamSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    projectId: z.string().optional().nullable(),
    projectName: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    identityUrl: z.string().optional().nullable()
});

const ProviderTeamsResponseSchema = z.object({
    value: z.array(ProviderTeamSchema),
    count: z.number().optional()
});

const sync = createSync({
    description: 'Sync teams across all projects',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    endpoints: [{ method: 'GET', path: '/syncs/teams' }],
    models: {
        Team: TeamSchema
    },

    exec: async (nango) => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());

        await nango.trackDeletesStart('Team');

        for (const projectId of metadata.projectIds) {
            let continuationToken: string | undefined;

            do {
                // https://learn.microsoft.com/en-us/rest/api/azure/devops/core/teams/get-teams?view=azure-devops-rest-7.2
                const response = await nango.get({
                    endpoint: `/_apis/projects/${encodeURIComponent(projectId)}/teams`,
                    params: {
                        'api-version': '7.2-preview.3',
                        ...(continuationToken && { continuationToken })
                    },
                    retries: 3
                });

                const parsed = ProviderTeamsResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Invalid response from Azure DevOps teams API: ${parsed.error.message}`);
                }

                const teams = parsed.data.value.map((item) => ({
                    id: item.id,
                    ...(item.name != null && { name: item.name }),
                    ...(item.description != null && { description: item.description }),
                    ...(item.projectId != null && { projectId: item.projectId }),
                    ...(item.projectName != null && { projectName: item.projectName }),
                    ...(item.url != null && { url: item.url }),
                    ...(item.identityUrl != null && { identityUrl: item.identityUrl })
                }));

                if (teams.length > 0) {
                    await nango.batchSave(teams, 'Team');
                }

                const rawToken = response.headers['x-ms-continuationtoken'];
                continuationToken = typeof rawToken === 'string' && rawToken.length > 0 ? rawToken : undefined;
            } while (continuationToken);
        }

        await nango.trackDeletesEnd('Team');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
