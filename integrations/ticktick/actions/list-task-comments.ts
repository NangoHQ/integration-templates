import { z } from 'zod';
import { createAction } from 'nango';

const ProviderCommentSchema = z.object({
    id: z.string(),
    userId: z.number(),
    title: z.string(),
    createdTime: z.union([z.number(), z.string()]),
    modifiedTime: z.union([z.number(), z.string()]),
    replyCommentId: z.string().nullable().optional(),
    replyUserId: z.number().nullable().optional()
});

const InputSchema = z
    .object({
        projectId: z.string().describe('Identifier of the project that contains the task. Example: "6226ff9877acee87727f6bca"'),
        taskId: z.string().describe('Identifier of the task whose comments should be listed. Example: "63b7bebb91c0a5474805fcd4"')
    })
    .describe('Identifies the task whose comments to list.');

const OutputSchema = z
    .object({
        comments: z
            .array(
                z.object({
                    id: z.string().describe('Unique comment identifier.'),
                    userId: z.number().describe('TickTick user ID of the comment author.'),
                    title: z.string().describe('Text of the comment.'),
                    createdTime: z
                        .number()
                        .describe('Comment creation time as Unix epoch milliseconds (provider returns a number, not the ISO-8601 string shown in the docs).'),
                    modifiedTime: z
                        .number()
                        .describe('Last modification time as Unix epoch milliseconds (provider returns a number, not the ISO-8601 string shown in the docs).'),
                    replyCommentId: z.string().optional().describe('Identifier of the comment this comment replies to, when it is a reply.'),
                    replyUserId: z.number().optional().describe('TickTick user ID being replied to, when the comment is a reply.')
                })
            )
            .describe('All comments on the task, in the order returned by TickTick.')
    })
    .describe('All comments on the task.');

function toEpochMilliseconds(value: number | string): number {
    return typeof value === 'number' ? value : new Date(value).getTime();
}

/**
 * @tags: [read]
 * @tagReason: Fetches comment data for a task without modifying any provider state.
 * @pitfalls: createdTime and modifiedTime are Unix epoch-millisecond numbers, unlike the ISO-8601 date strings TickTick uses for task and project fields.
 */
const action = createAction({
    description: 'List all comments on a task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ticktick.com/docs/openapi.md (Get Task Comments)
            endpoint: `/open/v1/project/${encodeURIComponent(input.projectId)}/task/${encodeURIComponent(input.taskId)}/comments`,
            retries: 3
        });

        const comments = ProviderCommentSchema.array().parse(response.data);

        return {
            comments: comments.map((comment) => ({
                id: comment.id,
                userId: comment.userId,
                title: comment.title,
                createdTime: toEpochMilliseconds(comment.createdTime),
                modifiedTime: toEpochMilliseconds(comment.modifiedTime),
                ...(comment.replyCommentId != null && { replyCommentId: comment.replyCommentId }),
                ...(comment.replyUserId != null && { replyUserId: comment.replyUserId })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
