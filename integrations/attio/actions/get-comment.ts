import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    comment_id: z.string().describe('The unique identifier of the comment to retrieve. Example: "aa1dc1d9-93ac-4c6c-987e-16b6eea9aab2"')
});

const ActorSchema = z.object({
    id: z.string().nullish(),
    type: z.enum(['api-token', 'workspace-member', 'system', 'app']).nullish()
});

const CommentIdSchema = z.object({
    workspace_id: z.string(),
    comment_id: z.string()
});

const EntrySchema = z.object({
    entry_id: z.string(),
    list_id: z.string()
});

const RecordSchema = z.object({
    record_id: z.string(),
    object_id: z.string()
});

const ProviderCommentSchema = z.object({
    id: CommentIdSchema,
    thread_id: z.string(),
    content_plaintext: z.string(),
    entry: EntrySchema.nullable(),
    record: RecordSchema,
    resolved_at: z.string().nullable(),
    resolved_by: ActorSchema.nullable(),
    created_at: z.string(),
    author: ActorSchema.nullable()
});

const OutputSchema = z.object({
    id: CommentIdSchema,
    thread_id: z.string(),
    content_plaintext: z.string(),
    entry: EntrySchema.nullable(),
    record: RecordSchema,
    resolved_at: z.string().optional(),
    resolved_by: ActorSchema.nullable(),
    created_at: z.string(),
    author: ActorSchema.nullable()
});

const action = createAction({
    description: 'Retrieve a single comment from Attio.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['comment:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.attio.com/reference/get_v2-comments-comment-id
        const response = await nango.get({
            endpoint: `/v2/comments/${input.comment_id}`,
            retries: 3
        });

        const responseData = z.object({ data: ProviderCommentSchema }).parse(response.data);
        const providerComment = responseData.data;

        return {
            id: providerComment.id,
            thread_id: providerComment.thread_id,
            content_plaintext: providerComment.content_plaintext,
            entry: providerComment.entry,
            record: providerComment.record,
            ...(providerComment.resolved_at != null && { resolved_at: providerComment.resolved_at }),
            resolved_by: providerComment.resolved_by,
            created_at: providerComment.created_at,
            author: providerComment.author
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
