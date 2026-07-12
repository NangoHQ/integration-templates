import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    epic_id: z.number().describe('The unique public ID of the epic. Example: 16')
});

const CommentSchema = z
    .object({
        id: z.number(),
        text: z.string().optional(),
        author_id: z.string().uuid().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const StatsSchema = z
    .object({
        num_stories_total: z.number().optional(),
        num_stories_done: z.number().optional(),
        num_stories_in_progress: z.number().optional(),
        num_stories_unstarted: z.number().optional(),
        num_points_total: z.number().optional(),
        num_points_done: z.number().optional(),
        num_points_in_progress: z.number().optional(),
        num_points_unstarted: z.number().optional()
    })
    .passthrough();

const ProviderEpicSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        description: z.string().nullable().optional(),
        comments: z.array(CommentSchema).optional(),
        stats: StatsSchema.optional(),
        label_ids: z.array(z.number()).optional(),
        owner_ids: z.array(z.string().uuid()).optional(),
        milestone_id: z.number().nullable().optional(),
        epic_state_id: z.number().optional(),
        position: z.number().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = ProviderEpicSchema;

const action = createAction({
    description: 'Retrieve a single epic.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shortcut.com/api/rest/v3#get-epic
        const response = await nango.get({
            endpoint: `/api/v3/epics/${input.epic_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Epic not found',
                epic_id: input.epic_id
            });
        }

        const providerEpic = ProviderEpicSchema.parse(response.data);

        return providerEpic;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
