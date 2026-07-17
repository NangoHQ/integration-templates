import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('The identifier of the activity. Example: 19350154255'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(200).optional().describe('Number of items per page. Defaults to 30.')
});

const SummaryAthleteSchema = z
    .object({
        id: z.number().optional(),
        resource_state: z.number().optional(),
        firstname: z.string().optional(),
        lastname: z.string().optional()
    })
    .passthrough();

const CommentSchema = z.object({
    id: z.number(),
    activity_id: z.number().optional(),
    post_id: z.number().nullable().optional(),
    resource_state: z.number().optional(),
    text: z.string().optional(),
    mentions_metadata: z.unknown().nullable().optional(),
    created_at: z.string().optional(),
    athlete: SummaryAthleteSchema.optional(),
    cursor: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(CommentSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List the comments on an activity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['activity:read', 'activity:read_all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.strava.com/docs/reference/#api-Activities-getCommentsByActivityId
            endpoint: `/api/v3/activities/${encodeURIComponent(String(input.id))}/comments`,
            params: {
                ...(input.cursor !== undefined && { after_cursor: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size })
            },
            retries: 3
        });

        const comments = z.array(CommentSchema).parse(response.data);
        const lastComment = comments.length > 0 ? comments[comments.length - 1] : undefined;
        const nextCursor = lastComment?.cursor;

        return {
            items: comments,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
