import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The unique identifier of the file. Example: "12345"'),
    limit: z.number().int().min(1).max(1000).optional().describe('The maximum number of items to return per page. Default: 100.'),
    offset: z.number().int().min(0).optional().describe('The 0-based offset of the first item to return. Default: 0.')
});

const UserMiniSchema = z.object({
    id: z.string(),
    type: z.literal('user'),
    name: z.string(),
    login: z.string()
});

const ItemReferenceSchema = z.object({
    id: z.string(),
    type: z.string()
});

const CommentSchema = z.object({
    id: z.string(),
    type: z.literal('comment'),
    is_reply_comment: z.boolean().optional(),
    message: z.string().optional(),
    tagged_message: z.string().optional(),
    created_by: UserMiniSchema.optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    item: ItemReferenceSchema.optional()
});

const OrderSchema = z.object({
    by: z.string().optional(),
    direction: z.enum(['ASC', 'DESC']).optional()
});

const OutputSchema = z.object({
    total_count: z.number().int().optional(),
    limit: z.number().int().optional(),
    offset: z.number().int().optional(),
    order: z.array(OrderSchema).optional(),
    entries: z.array(CommentSchema)
});

const action = createAction({
    description: 'List comments for a file',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-comments',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.offset !== undefined) {
            params['offset'] = input.offset;
        }

        // https://developer.box.com/reference/get-files-id-comments/
        const response = await nango.get({
            endpoint: `/2.0/files/${input.file_id}/comments`,
            params,
            retries: 3
        });

        const commentsData = OutputSchema.parse(response.data);

        return {
            total_count: commentsData.total_count,
            limit: commentsData.limit,
            offset: commentsData.offset,
            order: commentsData.order,
            entries: commentsData.entries
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
