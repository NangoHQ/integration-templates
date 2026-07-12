import { z } from 'zod';
import { createAction } from 'nango';

const LabelInputSchema = z.object({
    name: z.string(),
    color: z.string().optional(),
    description: z.string().optional(),
    external_id: z.string().optional()
});

const InputSchema = z.object({
    epic_public_id: z.number().describe('The unique ID of the Epic. Example: 16'),
    name: z.string().optional(),
    archived: z.boolean().optional(),
    epic_state_id: z.number().optional(),
    state: z.string().optional(),
    description: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(),
    started_at_override: z.string().nullable().optional(),
    completed_at_override: z.string().nullable().optional(),
    milestone_id: z.number().nullable().optional(),
    objective_ids: z.array(z.number()).optional(),
    owner_ids: z.array(z.string()).optional(),
    follower_ids: z.array(z.string()).optional(),
    requested_by_id: z.string().nullable().optional(),
    group_id: z.string().nullable().optional(),
    group_ids: z.array(z.string()).optional(),
    labels: z.array(LabelInputSchema).optional(),
    external_id: z.string().nullable().optional(),
    after_id: z.number().optional(),
    before_id: z.number().optional(),
    planned_start_date: z.string().nullable().optional()
});

const EpicSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        archived: z.boolean(),
        epic_state_id: z.number(),
        state: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        app_url: z.string(),
        entity_type: z.string(),
        description: z.string().nullable().optional(),
        external_id: z.string().nullable().optional(),
        deadline: z.string().nullable().optional(),
        started_at: z.string().nullable().optional(),
        completed_at: z.string().nullable().optional(),
        started_at_override: z.string().nullable().optional(),
        completed_at_override: z.string().nullable().optional(),
        milestone_id: z.number().nullable().optional(),
        objective_ids: z.array(z.number()).optional(),
        owner_ids: z.array(z.string()).optional(),
        follower_ids: z.array(z.string()).optional(),
        requested_by_id: z.string().nullable().optional(),
        group_id: z.string().nullable().optional(),
        group_ids: z.array(z.string()).optional(),
        label_ids: z.array(z.number()).optional(),
        project_ids: z.array(z.number()).optional(),
        position: z.number().optional(),
        stories_without_projects: z.number().optional(),
        stats: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update an epic.',
    version: '1.0.0',
    input: InputSchema,
    output: EpicSchema,

    exec: async (nango, input): Promise<z.infer<typeof EpicSchema>> => {
        const body: Record<string, unknown> = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.archived !== undefined && { archived: input.archived }),
            ...(input.epic_state_id !== undefined && { epic_state_id: input.epic_state_id }),
            ...(input.state !== undefined && { state: input.state }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.deadline !== undefined && { deadline: input.deadline }),
            ...(input.started_at_override !== undefined && { started_at_override: input.started_at_override }),
            ...(input.completed_at_override !== undefined && { completed_at_override: input.completed_at_override }),
            ...(input.milestone_id !== undefined && { milestone_id: input.milestone_id }),
            ...(input.objective_ids !== undefined && { objective_ids: input.objective_ids }),
            ...(input.owner_ids !== undefined && { owner_ids: input.owner_ids }),
            ...(input.follower_ids !== undefined && { follower_ids: input.follower_ids }),
            ...(input.requested_by_id !== undefined && { requested_by_id: input.requested_by_id }),
            ...(input.group_id !== undefined && { group_id: input.group_id }),
            ...(input.group_ids !== undefined && { group_ids: input.group_ids }),
            ...(input.labels !== undefined && { labels: input.labels }),
            ...(input.external_id !== undefined && { external_id: input.external_id }),
            ...(input.after_id !== undefined && { after_id: input.after_id }),
            ...(input.before_id !== undefined && { before_id: input.before_id }),
            ...(input.planned_start_date !== undefined && { planned_start_date: input.planned_start_date })
        };

        const response = await nango.put({
            // https://developer.shortcut.com/api/rest/v3#Update-Epic
            endpoint: `/api/v3/epics/${encodeURIComponent(String(input.epic_public_id))}`,
            data: body,
            retries: 10
        });

        const epic = EpicSchema.parse(response.data);
        return epic;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
