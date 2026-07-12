import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    slim: z.boolean().optional().describe('When true, omits the per-label stats object for a lighter payload.')
});

const LabelStatsSchema = z.object({
    num_epics: z.number().optional(),
    num_epics_completed: z.number().optional(),
    num_epics_in_progress: z.number().optional(),
    num_epics_total: z.number().optional(),
    num_epics_unstarted: z.number().optional(),
    num_points_backlog: z.number().optional(),
    num_points_completed: z.number().optional(),
    num_points_in_progress: z.number().optional(),
    num_points_total: z.number().optional(),
    num_stories_backlog: z.number().optional(),
    num_stories_completed: z.number().optional(),
    num_stories_in_progress: z.number().optional(),
    num_stories_total: z.number().optional(),
    num_stories_unestimated: z.number().optional(),
    num_stories_unstarted: z.number().optional()
});

const LabelSchema = z.object({
    app_url: z.string().optional(),
    archived: z.boolean().optional(),
    color: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    entity_type: z.string().optional(),
    external_id: z.string().nullable().optional(),
    id: z.number(),
    name: z.string(),
    stats: LabelStatsSchema.optional(),
    updated_at: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(LabelSchema)
});

const action = createAction({
    description: 'List labels.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shortcut.com/api/rest/v3#List-Labels
        const response = await nango.get({
            endpoint: '/api/v3/labels',
            params: {
                ...(input.slim !== undefined && { slim: String(input.slim) })
            },
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected a flat array of labels from the Shortcut API.'
            });
        }

        const labels = z.array(LabelSchema).parse(response.data);

        return {
            items: labels
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
