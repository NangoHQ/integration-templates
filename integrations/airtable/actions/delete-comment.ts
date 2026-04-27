import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    base_id: z.string().describe('The ID of the Airtable base. Example: "app1234567890abcd"'),
    table_id_or_name: z.string().describe('The ID or name of the table. Example: "tbl1234567890abcd"'),
    record_id: z.string().describe('The ID of the record. Example: "rec1234567890abcd"'),
    row_comment_id: z.string().describe('The ID of the comment to delete. Example: "com1234567890abcd"')
});

const ProviderDeleteCommentResponseSchema = z.object({
    id: z.string(),
    deleted: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    deleted: z.boolean().optional()
});

const action = createAction({
    description: 'Delete a comment from an Airtable record.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://airtable.com/developers/web/api/delete-comment
            endpoint: `/v0/${input.base_id}/${input.table_id_or_name}/${input.record_id}/comments/${input.row_comment_id}`,
            retries: 3
        });

        const providerResponse = ProviderDeleteCommentResponseSchema.parse(response.data);

        return {
            id: providerResponse.id,
            ...(providerResponse.deleted !== undefined && { deleted: providerResponse.deleted })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
