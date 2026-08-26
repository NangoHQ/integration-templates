import { createSync } from 'nango';
import { z } from 'zod';

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string()
});

const MetadataSchema = z.object({
    team_id: z.string()
});

const FolderSchema = z.object({
    id: z.string(),
    name: z.string()
});

const GetTeamFoldersResponseSchema = z.object({
    name: z.string(),
    folders: z.array(FolderSchema)
});

const sync = createSync({
    description: 'Sync projects from Figma.',
    version: '1.1.0',
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

        // https://developers.figma.com/docs/rest-api/folders-endpoints/#get-team-folders-endpoint
        const response = await nango.get({
            endpoint: `/v2/teams/${encodeURIComponent(metadata.team_id)}/folders`,
            retries: 3
        });

        const { folders } = GetTeamFoldersResponseSchema.parse(response.data);
        const projects = folders.map((folder) => ({
            id: folder.id,
            name: folder.name
        }));

        if (projects.length > 0) {
            await nango.batchSave(projects, 'Project');
        }

        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
