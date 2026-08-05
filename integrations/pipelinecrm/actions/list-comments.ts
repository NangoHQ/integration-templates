import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    note_id: z.number().describe('Note ID. Example: 889038936'),
    page: z.number().optional().describe('Page number to fetch. Example: 1'),
    per_page: z.number().optional().describe('Number of items per page. Example: 200')
});

const UserSchema = z.object({
    id: z.number().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    avatar_thumb_url: z.string().nullable().optional()
});

const ProviderCommentSchema = z.object({
    id: z.number(),
    user_id: z.number().optional(),
    note_id: z.number().optional(),
    comment: z.string().optional(),
    edited_by_user_id: z.number().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    user: UserSchema.optional()
});

const PaginationSchema = z.object({
    page: z.number().optional(),
    page_var: z.string().optional(),
    per_page: z.number().optional(),
    pages: z.number().optional(),
    total: z.number().optional()
});

const OutputSchema = z.object({
    entries: z.array(ProviderCommentSchema),
    pagination: PaginationSchema.optional()
});

const action = createAction({
    description: 'List comments on a note.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://app.pipelinecrm.com/openapi.yaml
        const response = await nango.get({
            endpoint: `/api/v3/notes/${encodeURIComponent(String(input.note_id))}/comments.json`,
            params: {
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            entries: z.array(ProviderCommentSchema),
            pagination: PaginationSchema.optional()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            entries: providerResponse.entries.map((comment) => ({
                id: comment.id,
                ...(comment.user_id !== undefined && { user_id: comment.user_id }),
                ...(comment.note_id !== undefined && { note_id: comment.note_id }),
                ...(comment.comment !== undefined && { comment: comment.comment }),
                ...(comment.edited_by_user_id !== undefined && { edited_by_user_id: comment.edited_by_user_id }),
                ...(comment.created_at !== undefined && { created_at: comment.created_at }),
                ...(comment.updated_at !== undefined && { updated_at: comment.updated_at }),
                ...(comment.user !== undefined && { user: comment.user })
            })),
            ...(providerResponse.pagination !== undefined && { pagination: providerResponse.pagination })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
