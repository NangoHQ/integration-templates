import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    projectTeams: z.array(
        z.object({
            projectId: z.string(),
            teamId: z.string()
        })
    )
});

const IterationSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    path: z.string().optional(),
    attributes: z
        .object({
            startDate: z.string().optional(),
            finishDate: z.string().optional(),
            timeFrame: z.string().optional()
        })
        .optional(),
    url: z.string().optional()
});

const ProviderIterationSchema = z
    .object({
        id: z.string(),
        name: z.string().nullable().optional(),
        path: z.string().nullable().optional(),
        attributes: z
            .object({
                startDate: z.string().nullable().optional(),
                finishDate: z.string().nullable().optional(),
                timeFrame: z.string().nullable().optional()
            })
            .nullable()
            .optional(),
        url: z.string().nullable().optional()
    })
    .passthrough();

const IterationListResponseSchema = z.object({
    value: z.array(ProviderIterationSchema)
});

const CheckpointSchema = z.object({
    nextProjectTeamIndex: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync sprint iterations for all teams',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Iteration: IterationSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.parse(metadata);
        const projectTeams = parsedMetadata.projectTeams;
        if (projectTeams.length === 0) {
            throw new Error('projectTeams metadata is required');
        }

        // Blocker: the Azure DevOps iterations endpoint does not expose changed-since
        // filters, deleted-record endpoints, or resumable page tokens. We checkpoint
        // progress through the metadata projectTeams array so a full refresh can
        // resume without restarting from the first team.
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let nextProjectTeamIndex = parsedCheckpoint?.nextProjectTeamIndex ?? 0;

        await nango.trackDeletesStart('Iteration');

        for (let i = nextProjectTeamIndex; i < projectTeams.length; i++) {
            const pt = projectTeams[i]!;
            const response = await nango.get({
                // https://learn.microsoft.com/en-us/rest/api/azure/devops/work/team-settings/iterations/list?view=azure-devops-rest-7.2
                endpoint: `/${encodeURIComponent(pt.projectId)}/${encodeURIComponent(pt.teamId)}/_apis/work/teamsettings/iterations`,
                params: {
                    'api-version': '7.2-preview.1'
                },
                retries: 3
            });

            const parsed = IterationListResponseSchema.parse(response.data);
            const iterations = parsed.value.map((item) => ({
                id: item.id,
                ...(item.name != null && { name: item.name }),
                ...(item.path != null && { path: item.path }),
                ...(item.attributes != null && {
                    attributes: {
                        ...(item.attributes.startDate != null && { startDate: item.attributes.startDate }),
                        ...(item.attributes.finishDate != null && { finishDate: item.attributes.finishDate }),
                        ...(item.attributes.timeFrame != null && { timeFrame: item.attributes.timeFrame })
                    }
                }),
                ...(item.url != null && { url: item.url })
            }));

            if (iterations.length > 0) {
                await nango.batchSave(iterations, 'Iteration');
            }

            nextProjectTeamIndex = i + 1;
            await nango.saveCheckpoint({ nextProjectTeamIndex });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Iteration');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
