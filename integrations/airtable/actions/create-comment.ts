import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base. Example: "appXXXXXXXXXXXXXX"'),
    tableIdOrName: z.string().describe('The ID or name of the table. Example: "tblXXXXXXXXXXXXXX" or "Table 1"'),
    recordId: z.string().describe('The ID of the record to comment on. Example: "recXXXXXXXXXXXXXX"'),
    text: z.string().describe('The text content of the comment. Use @[userId] to mention users. Example: "Hello world" or "Hey @[usrXXXXXXXXXXXXXX]"')
});

const AuthorSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string()
});

const MentionedUserSchema = z.object({
    displayName: z.string(),
    email: z.string(),
    id: z.string(),
    type: z.string()
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    author: AuthorSchema,
    text: z.string(),
    createdTime: z.string(),
    lastUpdatedTime: z.string().nullable().optional(),
    mentioned: z.record(z.string(), MentionedUserSchema).nullable().optional()
});

const OutputMentionedRecordSchema = z.record(
    z.string(),
    z.object({
        displayName: z.string(),
        email: z.string(),
        id: z.string(),
        type: z.string()
    })
);

const OutputSchema = z.object({
    id: z.string().describe('The ID of the created comment'),
    author: z.object({
        id: z.string(),
        email: z.string(),
        name: z.string()
    }),
    text: z.string(),
    createdTime: z.string(),
    lastUpdatedTime: z.string().optional(),
    mentioned: OutputMentionedRecordSchema.optional()
});

const action = createAction({
    description: 'Create a comment on an Airtable record',
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
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}/${input.recordId}/comments`,
            data: {
                text: input.text
            },
            retries: 3
        });

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            author: providerComment.author,
            text: providerComment.text,
            createdTime: providerComment.createdTime,
            ...(providerComment.lastUpdatedTime !== null && { lastUpdatedTime: providerComment.lastUpdatedTime }),
            ...(providerComment.mentioned !== null && { mentioned: providerComment.mentioned })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
