import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    expense_id: z.number().describe('Expense ID to comment on. Example: 5123'),
    content: z.string().describe('Comment content. Example: "Does this include the delivery fee?"')
});

const ProviderUserSchema = z.object({
    id: z.number(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    picture: z
        .object({
            medium: z.string().optional()
        })
        .optional()
});

const ProviderCommentSchema = z.object({
    id: z.number(),
    content: z.string(),
    comment_type: z.string(),
    relation_type: z.string(),
    relation_id: z.number(),
    created_at: z.string(),
    deleted_at: z.string().nullable().optional(),
    user: ProviderUserSchema.optional()
});

const ProviderResponseSchema = z.object({
    comment: ProviderCommentSchema
});

const OutputSchema = z.object({
    id: z.number(),
    content: z.string(),
    comment_type: z.string(),
    relation_type: z.string(),
    relation_id: z.number(),
    created_at: z.string(),
    deleted_at: z.string().optional(),
    user: ProviderUserSchema.optional()
});

const action = createAction({
    description: 'Create a comment in Splitwise.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://dev.splitwise.com/#tag/comments/paths/~1create_comment/post
            endpoint: '/api/v3.0/create_comment',
            data: {
                expense_id: input.expense_id,
                content: input.content
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.comment.id,
            content: providerResponse.comment.content,
            comment_type: providerResponse.comment.comment_type,
            relation_type: providerResponse.comment.relation_type,
            relation_id: providerResponse.comment.relation_id,
            created_at: providerResponse.comment.created_at,
            ...(providerResponse.comment.deleted_at != null && { deleted_at: providerResponse.comment.deleted_at }),
            ...(providerResponse.comment.user !== undefined && { user: providerResponse.comment.user })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
