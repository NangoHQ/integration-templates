import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the Milestone. Example: "Q3 Objective"'),
    description: z.string().optional().describe('The Milestone description.'),
    categories: z.array(z.string()).optional().describe('Array of category names to attach to the Milestone. Example: ["Q3 Goals"]'),
    started_at_override: z.string().optional().describe('Manual override for the time/date the Milestone was started. ISO 8601 format.'),
    completed_at_override: z.string().optional().describe('Manual override for the time/date the Milestone was completed. ISO 8601 format.')
});

const CategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    color: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    entity_type: z.string().optional(),
    external_id: z.string().nullable().optional(),
    archived: z.boolean().optional()
});

const MilestoneSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    categories: z.array(CategorySchema).optional(),
    started_at_override: z.string().nullable().optional(),
    completed_at_override: z.string().nullable().optional(),
    state: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    app_url: z.string().optional(),
    archived: z.boolean().optional(),
    completed: z.boolean().optional(),
    completed_at: z.string().nullable().optional(),
    started: z.boolean().optional(),
    started_at: z.string().nullable().optional(),
    position: z.number().optional(),
    key_result_ids: z.array(z.string()).optional(),
    stats: z
        .object({
            average_cycle_time: z.number().optional(),
            average_lead_time: z.number().optional(),
            num_related_documents: z.number().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create an Objective.',
    version: '1.0.0',
    input: InputSchema,
    output: MilestoneSchema,

    exec: async (nango, input): Promise<z.infer<typeof MilestoneSchema>> => {
        // https://developer.shortcut.com/api/rest/v3#Create-Milestone
        const response = await nango.post({
            endpoint: '/api/v3/milestones',
            data: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.categories !== undefined && { categories: input.categories.map((name) => ({ name })) }),
                ...(input.started_at_override !== undefined && { started_at_override: input.started_at_override }),
                ...(input.completed_at_override !== undefined && { completed_at_override: input.completed_at_override })
            },
            retries: 3
        });

        const milestone = MilestoneSchema.parse(response.data);
        return milestone;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
