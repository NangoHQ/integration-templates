import { z } from 'zod';
import { createAction } from 'nango';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format.');

const InputSchema = z
    .object({
        name: z.string().describe('The name of the iteration. Example: "Sprint 1"'),
        start_date: dateOnly.describe('The start date of the iteration in YYYY-MM-DD format. Example: "2026-07-15"'),
        end_date: dateOnly.describe('The end date of the iteration in YYYY-MM-DD format. Must be after start_date. Example: "2026-07-28"'),
        description: z.string().optional().describe('Optional description for the iteration.'),
        group_ids: z.array(z.string()).optional().describe('Optional array of group (team) IDs to associate with the iteration.')
    })
    .refine((data) => new Date(`${data.end_date}T00:00:00Z`) > new Date(`${data.start_date}T00:00:00Z`), {
        message: 'end_date must be after start_date',
        path: ['end_date']
    });

const ProviderLabelSchema = z.object({
    app_url: z.string().optional(),
    archived: z.boolean().optional(),
    color: z.string().optional(),
    created_at: z.string().optional(),
    description: z.string().optional(),
    entity_type: z.string().optional(),
    external_id: z.string().optional(),
    id: z.number(),
    name: z.string().optional(),
    stats: z
        .object({
            num_epics: z.number().optional(),
            num_epics_completed: z.number().optional(),
            num_epics_in_progress: z.number().optional(),
            num_epics_total: z.number().optional(),
            num_epics_unstarted: z.number().optional(),
            num_points_backlog: z.number().optional(),
            num_points_completed: z.number().optional(),
            num_points_in_progress: z.number().optional(),
            num_points_total: z.number().optional(),
            num_points_unstarted: z.number().optional(),
            num_related_documents: z.number().optional(),
            num_stories_backlog: z.number().optional(),
            num_stories_completed: z.number().optional(),
            num_stories_in_progress: z.number().optional(),
            num_stories_total: z.number().optional(),
            num_stories_unestimated: z.number().optional(),
            num_stories_unstarted: z.number().optional()
        })
        .optional(),
    updated_at: z.string().optional()
});

const ProviderStatsSchema = z.object({
    average_cycle_time: z.number().optional(),
    average_lead_time: z.number().optional(),
    num_points: z.number().optional(),
    num_points_backlog: z.number().optional(),
    num_points_done: z.number().optional(),
    num_points_started: z.number().optional(),
    num_points_unstarted: z.number().optional(),
    num_related_documents: z.number().optional(),
    num_stories_backlog: z.number().optional(),
    num_stories_done: z.number().optional(),
    num_stories_started: z.number().optional(),
    num_stories_unestimated: z.number().optional(),
    num_stories_unstarted: z.number().optional()
});

const ProviderIterationSchema = z.object({
    app_url: z.string().optional(),
    created_at: z.string().optional(),
    description: z.string().optional(),
    end_date: z.string().optional(),
    entity_type: z.string().optional(),
    follower_ids: z.array(z.string()).optional(),
    group_ids: z.array(z.string()).optional(),
    group_mention_ids: z.array(z.string()).optional(),
    id: z.number(),
    label_ids: z.array(z.number()).optional(),
    labels: z.array(ProviderLabelSchema).optional(),
    member_mention_ids: z.array(z.string()).optional(),
    mention_ids: z.array(z.string()).optional(),
    name: z.string().optional(),
    start_date: z.string().optional(),
    stats: ProviderStatsSchema.optional(),
    status: z.string(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    status: z.string(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    description: z.string().optional(),
    group_ids: z.array(z.string()).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Create an iteration.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.shortcut.com/api/rest/v3#Create-Iteration
            endpoint: '/api/v3/iterations',
            data: {
                name: input.name,
                start_date: input.start_date,
                end_date: input.end_date,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.group_ids !== undefined && { group_ids: input.group_ids })
            },
            retries: 10
        });

        const iteration = ProviderIterationSchema.parse(response.data);

        return {
            id: iteration.id,
            ...(iteration.name !== undefined && { name: iteration.name }),
            status: iteration.status,
            ...(iteration.start_date !== undefined && { start_date: iteration.start_date }),
            ...(iteration.end_date !== undefined && { end_date: iteration.end_date }),
            ...(iteration.description !== undefined && { description: iteration.description }),
            ...(iteration.group_ids !== undefined && { group_ids: iteration.group_ids }),
            ...(iteration.created_at !== undefined && { created_at: iteration.created_at }),
            ...(iteration.updated_at !== undefined && { updated_at: iteration.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
