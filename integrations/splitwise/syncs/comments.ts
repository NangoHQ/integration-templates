import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CommentSchema = z.object({
    id: z.string(),
    content: z.string().optional(),
    comment_type: z.string().optional(),
    relation_type: z.string().optional(),
    relation_id: z.string().optional(),
    created_at: z.string().optional(),
    deleted_at: z.string().optional(),
    user_id: z.string().optional(),
    user_first_name: z.string().optional(),
    user_last_name: z.string().optional(),
    user_picture_medium: z.string().optional()
});

const _ProviderExpenseSchema = z.object({
    id: z.number(),
    comments_count: z.number().optional(),
    updated_at: z.string(),
    deleted_at: z.string().nullable().optional()
});

const ProviderCommentSchema = z.object({
    id: z.number(),
    content: z.string().optional(),
    comment_type: z.string().optional(),
    relation_type: z.string().optional(),
    relation_id: z.number().optional(),
    created_at: z.string().optional(),
    deleted_at: z.string().nullable().optional(),
    user: z
        .object({
            id: z.number().optional(),
            first_name: z.string().nullable().optional(),
            last_name: z.string().nullable().optional(),
            picture: z
                .object({
                    medium: z.string().nullable().optional()
                })
                .optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const RuntimeCheckpointSchema = z.object({
    updated_after: z.string().optional()
});

const sync = createSync({
    description: 'Sync comments from Splitwise',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Comment: CommentSchema
    },
    // https://dev.splitwise.com/
    endpoints: [
        {
            path: '/syncs/comments',
            method: 'GET'
        }
    ],
    exec: async (nango) => {
        const checkpoint = RuntimeCheckpointSchema.parse((await nango.getCheckpoint()) ?? {});
        const updatedAfter = checkpoint.updated_after || undefined;
        let maxUpdatedAt: string | undefined;

        const expenseParams: Record<string, string | number> = {
            limit: 100
        };
        if (updatedAfter) {
            expenseParams['updated_after'] = updatedAfter;
        }

        const expenseProxyConfig: ProxyConfiguration = {
            // https://dev.splitwise.com/#tag/expenses/paths/~1get_expenses/get
            endpoint: '/api/v3.0/get_expenses',
            params: expenseParams,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'expenses'
            },
            retries: 3
        };

        for await (const page of nango.paginate<z.infer<typeof _ProviderExpenseSchema>>(expenseProxyConfig)) {
            const activeExpensesWithComments = page.filter((expense) => !expense.deleted_at && (expense.comments_count ?? 0) > 0);

            for (const expense of activeExpensesWithComments) {
                const commentResponse = await nango.get({
                    // https://dev.splitwise.com/#tag/comments/paths/~1get_comments/get
                    endpoint: '/api/v3.0/get_comments',
                    params: {
                        expense_id: String(expense.id)
                    },
                    retries: 3
                });

                const rawComments = commentResponse.data?.comments;
                if (!Array.isArray(rawComments)) {
                    continue;
                }

                const parsedComments = rawComments.map((raw) => {
                    const parsed = ProviderCommentSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse comment: ${parsed.error.message}`);
                    }
                    return parsed.data;
                });

                const upserts = parsedComments
                    .filter((comment) => !comment.deleted_at)
                    .map((comment) => ({
                        id: String(comment.id),
                        ...(comment.content != null && { content: comment.content }),
                        ...(comment.comment_type != null && { comment_type: comment.comment_type }),
                        ...(comment.relation_type != null && { relation_type: comment.relation_type }),
                        ...(comment.relation_id != null && { relation_id: String(comment.relation_id) }),
                        ...(comment.created_at != null && { created_at: comment.created_at }),
                        ...(comment.deleted_at != null && { deleted_at: comment.deleted_at }),
                        ...(comment.user?.id != null && { user_id: String(comment.user.id) }),
                        ...(comment.user?.first_name != null && { user_first_name: comment.user.first_name }),
                        ...(comment.user?.last_name != null && { user_last_name: comment.user.last_name }),
                        ...(comment.user?.picture?.medium != null && { user_picture_medium: comment.user.picture.medium })
                    }));

                const deletions = parsedComments.filter((comment) => Boolean(comment.deleted_at)).map((comment) => ({ id: String(comment.id) }));

                if (upserts.length > 0) {
                    await nango.batchSave(upserts, 'Comment');
                }

                if (deletions.length > 0) {
                    await nango.batchDelete(deletions, 'Comment');
                }
            }

            for (const expense of page) {
                if (maxUpdatedAt === undefined || expense.updated_at > maxUpdatedAt) {
                    maxUpdatedAt = expense.updated_at;
                }
            }

            if (maxUpdatedAt) {
                await nango.saveCheckpoint({
                    updated_after: maxUpdatedAt
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
