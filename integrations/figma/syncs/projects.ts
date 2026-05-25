import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string()
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

        const proxyConfig: ProxyConfiguration = {
            // https://www.figma.com/developers/api#get-team-projects-endpoint
            endpoint: `/v1/teams/${encodeURIComponent(metadata.team_id)}/projects`,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'cursor',
                response_path: 'projects',
                limit_name_in_request: 'page_size',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const projects = page.map((project) => ({
                id: String(project.id),
                name: project.name
            }));

            if (projects.length > 0) {
                await nango.batchSave(projects, 'Project');
            }
        }

        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
