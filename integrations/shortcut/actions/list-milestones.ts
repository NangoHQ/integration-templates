import { z } from 'zod';
import { createAction } from 'nango';

const CategorySchema = z.object({
    archived: z.boolean().optional(),
    color: z.string().optional(),
    created_at: z.string().optional(),
    entity_type: z.string().optional(),
    external_id: z.string().optional(),
    id: z.number(),
    name: z.string().optional(),
    updated_at: z.string().optional()
});

const MilestoneStatsSchema = z.object({
    average_cycle_time: z.number().optional(),
    average_lead_time: z.number().optional(),
    num_related_documents: z.number().optional()
});

const MilestoneSchema = z.object({
    id: z.number(),
    name: z.string(),
    app_url: z.string().optional(),
    archived: z.boolean().optional(),
    categories: z.array(CategorySchema).optional(),
    completed: z.boolean().optional(),
    completed_at: z.string().nullable().optional(),
    completed_at_override: z.string().nullable().optional(),
    created_at: z.string().optional(),
    description: z.string().nullable().optional(),
    entity_type: z.string().optional(),
    key_result_ids: z.array(z.string()).optional(),
    position: z.number().optional(),
    started: z.boolean().optional(),
    started_at: z.string().nullable().optional(),
    started_at_override: z.string().nullable().optional(),
    state: z.string().optional(),
    stats: MilestoneStatsSchema.optional(),
    updated_at: z.string().optional()
});

const InputSchema = z.object({
    cursor: z
        .string()
        .optional()
        .describe(
            'Pagination cursor from a previous response. The /milestones endpoint does not support cursor pagination; this field is reserved for future use.'
        )
});

const OutputSchema = z.object({
    items: z.array(MilestoneSchema),
    next_cursor: z
        .string()
        .optional()
        .describe('Pagination cursor for the next page. The /milestones endpoint does not return a cursor; this field is reserved for future use.')
});

const action = createAction({
    description: 'List Objectives (called milestones in the Shortcut API).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shortcut.com/api/rest/v3#List-Milestones
        const response = await nango.get({
            endpoint: '/api/v3/milestones',
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of milestones from the Shortcut API.'
            });
        }

        const milestones = z.array(MilestoneSchema).parse(response.data);

        return {
            items: milestones,
            next_cursor: undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
