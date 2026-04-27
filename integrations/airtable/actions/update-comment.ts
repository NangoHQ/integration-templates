import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    base_id: z.string().describe('The ID of the Airtable base. Example: "appXXXXXXXXXXXXXX"'),
    table_id_or_name: z.string().describe('The ID or name of the table. Example: "tblXXXXXXXXXXXXXX"'),
    record_id: z.string().describe('The ID of the record. Example: "recXXXXXXXXXXXXXX"'),
    row_comment_id: z.string().describe('The ID of the comment to update. Example: "comXXXXXXXXXXXXXX"'),
    text: z.string().describe('The updated comment text.')
});

const ProviderAuthorSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string()
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    author: ProviderAuthorSchema,
    text: z.string(),
    createdTime: z.string(),
    lastUpdatedTime: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    author: z.object({
        id: z.string(),
        email: z.string(),
        name: z.string()
    }),
    text: z.string(),
    created_time: z.string(),
    last_updated_time: z.string().optional()
});

const action = createAction({
    description: 'Update a comment on an Airtable record.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.recordComments:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://airtable.com/developers/web/api/update-comment
            endpoint: `/v0/${input.base_id}/${input.table_id_or_name}/${input.record_id}/comments/${input.row_comment_id}`,
            data: {
                text: input.text
            },
            retries: 1
        });

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            author: {
                id: providerComment.author.id,
                email: providerComment.author.email,
                name: providerComment.author.name
            },
            text: providerComment.text,
            created_time: providerComment.createdTime,
            ...(providerComment.lastUpdatedTime != null && { last_updated_time: providerComment.lastUpdatedTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
