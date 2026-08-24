import { createSync } from 'nango';
import { z } from 'zod';

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProjectsResponseSchema = z.object({
    projects: z.array(ProjectSchema)
});

const MetadataSchema = z.object({
    team_id: z.string()
});

const sync = createSync({
    description: 'Sync projects from Figma.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Project: ProjectSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/projects'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        if (!metadata?.team_id) {
            throw new Error('team_id is required in metadata');
        }

        await nango.trackDeletesStart('Project');

        // This endpoint returns every project in one response and documents no
        // pagination parameters or cursor. A checkpoint would therefore have no
        // meaningful resume position.
        const response = await nango.get({
            endpoint: `/v1/teams/${encodeURIComponent(metadata.team_id)}/projects`,
            retries: 3
        });
        const { projects } = ProjectsResponseSchema.parse(response.data);

        if (projects.length > 0) {
            await nango.batchSave(projects, 'Project');
        }

        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
