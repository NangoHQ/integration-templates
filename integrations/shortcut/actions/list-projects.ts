import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor. Not used because the Shortcut Projects endpoint does not support pagination.')
});

const ProjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    abbreviation: z.string().nullable().optional(),
    app_url: z.string().optional(),
    archived: z.boolean().optional(),
    color: z.string().nullable().optional(),
    created_at: z.string().optional(),
    days_to_thermometer: z.number().optional(),
    description: z.string().nullable().optional(),
    entity_type: z.string().optional(),
    external_id: z.string().nullable().optional(),
    follower_ids: z.array(z.string()).optional(),
    iteration_length: z.number().optional(),
    show_thermometer: z.boolean().optional(),
    start_time: z.string().optional(),
    stats: z
        .object({
            num_points: z.number().optional(),
            num_related_documents: z.number().optional(),
            num_stories: z.number().optional()
        })
        .optional(),
    team_id: z.number().optional(),
    updated_at: z.string().optional(),
    workflow_id: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(ProjectSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List projects — a deprecated, pre-Epics/Groups feature.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shortcut.com/api/rest/v3#List-Projects
            endpoint: '/api/v3/projects',
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected a flat array of projects from the Shortcut API.'
            });
        }

        const projects = z.array(ProjectSchema).parse(response.data);

        return {
            items: projects
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
