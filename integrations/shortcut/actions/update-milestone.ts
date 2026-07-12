import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    milestone_id: z.number().describe('The ID of the Milestone. Example: 15'),
    name: z.string().max(256).optional(),
    description: z.string().max(100000).optional(),
    state: z.enum(['to do', 'in progress', 'done']).optional(),
    categories: z.array(z.number()).optional().describe('An array of IDs of Categories attached to the Milestone.'),
    archived: z.boolean().optional()
});

const CategorySchema = z
    .object({
        id: z.number(),
        name: z.string(),
        color: z.string().optional(),
        archived: z.boolean().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        entity_type: z.string().optional(),
        external_id: z.string().nullable().optional()
    })
    .passthrough();

const StatsSchema = z
    .object({
        average_cycle_time: z.number().optional(),
        average_lead_time: z.number().optional(),
        num_related_documents: z.number().optional()
    })
    .passthrough();

const MilestoneSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        description: z.string().nullable().optional(),
        state: z.string(),
        archived: z.boolean().optional(),
        categories: z.array(CategorySchema).optional(),
        completed: z.boolean().optional(),
        completed_at: z.string().nullable().optional(),
        completed_at_override: z.string().nullable().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        entity_type: z.string().optional(),
        app_url: z.string().optional(),
        key_result_ids: z.array(z.string()).optional(),
        position: z.number().optional(),
        started: z.boolean().optional(),
        started_at: z.string().nullable().optional(),
        started_at_override: z.string().nullable().optional(),
        stats: StatsSchema.optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update an Objective.',
    version: '1.0.0',
    input: InputSchema,
    output: MilestoneSchema,

    exec: async (nango, input): Promise<z.infer<typeof MilestoneSchema>> => {
        const response = await nango.put({
            // https://developer.shortcut.com/api/rest/v3#Update-Milestone
            endpoint: `/api/v3/milestones/${encodeURIComponent(String(input.milestone_id))}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.state !== undefined && { state: input.state }),
                ...(input.categories !== undefined && { categories: input.categories }),
                ...(input.archived !== undefined && { archived: input.archived })
            },
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Milestone not found or update failed',
                milestone_id: input.milestone_id
            });
        }

        const milestone = MilestoneSchema.parse(response.data);
        return milestone;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
