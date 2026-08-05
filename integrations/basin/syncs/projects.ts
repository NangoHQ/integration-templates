import { createSync } from 'nango';
import { z } from 'zod';

const ProviderProjectSchema = z.object({
    id: z.union([z.number(), z.string()]),
    name: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync projects in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : null;

        if (!checkpoint) {
            // Basin paginates the full list but exposes no changed-since filter or deleted feed.
            await nango.trackDeletesStart('Project');
        }

        let page = checkpoint?.page ?? 1;

        while (true) {
            const response = await nango.get({
                // https://docs.usebasin.com/developer-features/api-reference/
                endpoint: '/v1/projects/',
                params: {
                    page
                },
                retries: 3
            });

            const parsedBody = z
                .object({
                    projects: z.array(ProviderProjectSchema)
                })
                .safeParse(response.data);

            if (!parsedBody.success) {
                throw new Error(`Failed to parse projects page: ${parsedBody.error.message}`);
            }

            const projects = parsedBody.data.projects.map((record) => ({
                id: String(record.id),
                name: record.name,
                ...(record.created_at != null && { created_at: record.created_at }),
                ...(record.updated_at != null && { updated_at: record.updated_at })
            }));

            if (projects.length === 0) {
                break;
            }

            await nango.batchSave(projects, 'Project');
            page += 1;
            await nango.saveCheckpoint({ page });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
