import { z } from 'zod';
import { createAction } from 'nango';

const ProviderOpenCommentSchema = z.object({
    id: z.string(),
    userId: z.number().optional(),
    title: z.string(),
    createdTime: z.union([z.string(), z.number()]).optional(),
    modifiedTime: z.union([z.string(), z.number()]).optional(),
    replyCommentId: z.string().optional(),
    replyUserId: z.number().optional()
});

const InputSchema = z
    .object({
        projectId: z.string().describe('Identifier of the project that contains the task. Example: "6ac5b589bed7f77658a9a803"'),
        taskId: z.string().describe('Identifier of the task to attach the comment to. Example: "6ac5b589bed7f77658a9a808"'),
        title: z.string().describe('Comment text to post on the task.')
    })
    .describe('Identifies the task to comment on and the comment text to post.');

const OutputSchema = z
    .object({
        id: z.string().describe('Identifier of the newly created comment.'),
        userId: z.number().optional().describe('Identifier of the user who created the comment.'),
        title: z.string().describe('Comment text that was posted.'),
        createdTime: z
            .union([z.string(), z.number()])
            .optional()
            .describe('Creation timestamp. Returned as an epoch-millisecond integer, even though the API documents an ISO-8601 string.'),
        modifiedTime: z
            .union([z.string(), z.number()])
            .optional()
            .describe('Last-modified timestamp. Returned as an epoch-millisecond integer, even though the API documents an ISO-8601 string.'),
        replyCommentId: z.string().optional().describe('Identifier of the comment this comment replies to, when present.'),
        replyUserId: z.number().optional().describe('Identifier of the user being replied to, when present.')
    })
    .describe('The comment that was created on the task.');

/**
 * @tags: [write]
 * @tagReason: Creates a new comment on a task through a provider-side mutation.
 * @pitfalls: createdTime and modifiedTime are returned as epoch-millisecond integers, not the documented ISO-8601 strings; each call creates a new comment, so repeated calls produce duplicates.
 */
const action = createAction({
    description: 'Add a comment to a task.',
    version: '1.0.0',
    scopes: ['tasks:write'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.ticktick.com/docs/openapi.md (Add Task Comment)
            endpoint: `/open/v1/project/${encodeURIComponent(input.projectId)}/task/${encodeURIComponent(input.taskId)}/comment`,
            data: {
                title: input.title
            },
            // Creating a comment is not idempotent; a retry after a lost response would post a duplicate.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const comment = ProviderOpenCommentSchema.parse(response.data);

        return {
            id: comment.id,
            title: comment.title,
            ...(comment.userId !== undefined && { userId: comment.userId }),
            ...(comment.createdTime !== undefined && { createdTime: comment.createdTime }),
            ...(comment.modifiedTime !== undefined && { modifiedTime: comment.modifiedTime }),
            ...(comment.replyCommentId !== undefined && { replyCommentId: comment.replyCommentId }),
            ...(comment.replyUserId !== undefined && { replyUserId: comment.replyUserId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
