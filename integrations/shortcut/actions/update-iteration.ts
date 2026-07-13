import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    iteration_public_id: z.number().int().describe('The unique ID of the Iteration. Example: 28'),
    name: z.string().optional().describe('The name of the Iteration.'),
    description: z.string().nullable().optional().describe('The description of the Iteration. Set to null to clear.'),
    start_date: z.string().optional().describe('The date this Iteration begins. Example: "2026-07-12"'),
    end_date: z.string().optional().describe('The date this Iteration ends. Example: "2026-07-19"'),
    group_ids: z.array(z.string()).optional().describe('An array of UUIDs for any Groups you want to add as Followers.')
});

const LabelSchema = z.object({
    app_url: z.string(),
    archived: z.boolean().optional(),
    color: z.string().optional(),
    created_at: z.string(),
    description: z.string().nullish(),
    entity_type: z.string(),
    external_id: z.string().nullish(),
    global_id: z.string(),
    id: z.number().int(),
    name: z.string(),
    stats: z.record(z.string(), z.unknown()).optional(),
    updated_at: z.string()
});

const AssociatedGroupSchema = z.object({
    group_id: z.string(),
    associated_stories_count: z.number().int().optional()
});

const StatsSchema = z.object({
    average_cycle_time: z.number().int().optional(),
    average_lead_time: z.number().int().optional(),
    num_points: z.number().int().optional(),
    num_points_backlog: z.number().int().optional(),
    num_points_done: z.number().int().optional(),
    num_points_started: z.number().int().optional(),
    num_points_unstarted: z.number().int().optional(),
    num_related_documents: z.number().int().optional(),
    num_stories_backlog: z.number().int().optional(),
    num_stories_done: z.number().int().optional(),
    num_stories_started: z.number().int().optional(),
    num_stories_unestimated: z.number().int().optional(),
    num_stories_unstarted: z.number().int().optional()
});

const OutputSchema = z.object({
    app_url: z.string(),
    associated_groups: z.array(AssociatedGroupSchema).nullish(),
    created_at: z.string(),
    description: z.string().nullish(),
    end_date: z.string(),
    entity_type: z.string(),
    follower_ids: z.array(z.string()).nullish(),
    global_id: z.string(),
    group_ids: z.array(z.string()).nullish(),
    group_mention_ids: z.array(z.string()).nullish(),
    id: z.number().int(),
    label_ids: z.array(z.number().int()).nullish(),
    labels: z.array(LabelSchema).nullish(),
    member_mention_ids: z.array(z.string()).nullish(),
    mention_ids: z.array(z.string()).nullish(),
    name: z.string(),
    start_date: z.string(),
    stats: StatsSchema.nullish(),
    status: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Update an iteration.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.start_date !== undefined && { start_date: input.start_date }),
            ...(input.end_date !== undefined && { end_date: input.end_date }),
            ...(input.group_ids !== undefined && { group_ids: input.group_ids })
        };

        // https://developer.shortcut.com/api/rest/v3
        const response = await nango.put({
            endpoint: `/api/v3/iterations/${encodeURIComponent(input.iteration_public_id)}`,
            data: body,
            retries: 10
        });

        const iteration = OutputSchema.parse(response.data);
        return iteration;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
