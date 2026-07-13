import { createSync } from 'nango';
import { z } from 'zod';

const ProjectSchema = z.object({
    id: z.string(),
    abbreviation: z.string().optional(),
    app_url: z.string().optional(),
    archived: z.boolean().optional(),
    color: z.string().optional(),
    created_at: z.string().optional(),
    days_to_thermometer: z.number().int().optional(),
    description: z.string().optional(),
    entity_type: z.string().optional(),
    external_id: z.string().optional(),
    follower_ids: z.array(z.string()).optional(),
    iteration_length: z.number().int().optional(),
    name: z.string().optional(),
    show_thermometer: z.boolean().optional(),
    start_time: z.string().optional(),
    stats: z
        .object({
            num_points: z.number().int().optional(),
            num_related_documents: z.number().int().optional(),
            num_stories: z.number().int().optional()
        })
        .optional(),
    team_id: z.number().int().optional(),
    updated_at: z.string().optional(),
    workflow_id: z.number().int().optional()
});

const ProviderProjectSchema = z.object({
    id: z.number().int(),
    abbreviation: z.string().nullable().optional(),
    app_url: z.string().optional(),
    archived: z.boolean().optional(),
    color: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    days_to_thermometer: z.number().int().optional(),
    description: z.string().nullable().optional(),
    entity_type: z.string().optional(),
    external_id: z.string().nullable().optional(),
    follower_ids: z.array(z.string()).optional(),
    iteration_length: z.number().int().optional(),
    name: z.string(),
    show_thermometer: z.boolean().optional(),
    start_time: z.string().optional(),
    stats: z
        .object({
            num_points: z.number().int().optional(),
            num_related_documents: z.number().int().optional(),
            num_stories: z.number().int().optional()
        })
        .optional(),
    team_id: z.number().int().optional(),
    updated_at: z.string().nullable().optional(),
    workflow_id: z.number().int().optional()
});

const sync = createSync({
    description: 'Sync projects (legacy feature).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        // https://developer.shortcut.com/api/rest/v3#get-projects
        const response = await nango.get({
            endpoint: '/api/v3/projects',
            retries: 3
        });

        const rawProjects = z.array(ProviderProjectSchema).parse(response.data);

        await nango.trackDeletesStart('Project');

        const records = rawProjects.map((project) => ({
            id: String(project.id),
            ...(project.abbreviation != null && { abbreviation: project.abbreviation }),
            ...(project.app_url != null && { app_url: project.app_url }),
            ...(project.archived != null && { archived: project.archived }),
            ...(project.color != null && { color: project.color }),
            ...(project.created_at != null && { created_at: project.created_at }),
            ...(project.days_to_thermometer != null && { days_to_thermometer: project.days_to_thermometer }),
            ...(project.description != null && { description: project.description }),
            ...(project.entity_type != null && { entity_type: project.entity_type }),
            ...(project.external_id != null && { external_id: project.external_id }),
            ...(project.follower_ids != null && { follower_ids: project.follower_ids }),
            ...(project.iteration_length != null && { iteration_length: project.iteration_length }),
            name: project.name,
            ...(project.show_thermometer != null && { show_thermometer: project.show_thermometer }),
            ...(project.start_time != null && { start_time: project.start_time }),
            ...(project.stats != null && { stats: project.stats }),
            ...(project.team_id != null && { team_id: project.team_id }),
            ...(project.updated_at != null && { updated_at: project.updated_at }),
            ...(project.workflow_id != null && { workflow_id: project.workflow_id })
        }));

        if (records.length > 0) {
            await nango.batchSave(records, 'Project');
        }

        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
