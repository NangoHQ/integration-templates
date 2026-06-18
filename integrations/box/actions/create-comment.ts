import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the file to comment on. Example: "2231568666314"'),
    message: z.string().describe('The text of the comment.')
});

const CreatedBySchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    login: z.string().optional()
});

const ItemSchema = z.object({
    id: z.string(),
    type: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    message: z.string().optional(),
    tagged_message: z.string().optional(),
    is_reply_comment: z.boolean().optional(),
    created_by: CreatedBySchema.optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    item: ItemSchema.optional()
});

const action = createAction({
    description: 'Create a comment in Box.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.box.com/reference/post-comments/
            endpoint: '/2.0/comments',
            data: {
                item: {
                    type: 'file',
                    id: input.file_id
                },
                message: input.message
            },
            retries: 10
        });

        const comment = OutputSchema.parse(response.data);
        return comment;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
