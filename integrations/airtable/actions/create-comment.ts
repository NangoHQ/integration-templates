import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    base_id: z.string().describe('Airtable base ID. Example: "appXXXXXXXXXXXXXX"'),
    table_id_or_name: z.string().describe('Airtable table ID or name. Example: "tblXXXXXXXXXXXXXX"'),
    record_id: z.string().describe('Airtable record ID. Example: "recXXXXXXXXXXXXXX"'),
    text: z.string().describe('Comment text. Example: "Hello from Nango!"')
});

const AuthorSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string()
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    author: AuthorSchema,
    text: z.string(),
    createdTime: z.string(),
    lastUpdatedTime: z.string().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    author: AuthorSchema,
    text: z.string(),
    created_time: z.string(),
    last_updated_time: z.string().optional()
});

const action = createAction({
    description: 'Create a comment on an Airtable record.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/create-comment
        const response = await nango.post({
            endpoint: `/v0/${input.base_id}/${input.table_id_or_name}/${input.record_id}/comments`,
            data: {
                text: input.text
            },
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'No data returned from Airtable API.'
            });
        }

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            author: providerComment.author,
            text: providerComment.text,
            created_time: providerComment.createdTime,
            ...(providerComment.lastUpdatedTime != null && { last_updated_time: providerComment.lastUpdatedTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
