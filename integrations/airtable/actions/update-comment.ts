import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base. Example: "appW06xK1bV2n2Gj2"'),
    tableIdOrName: z.string().describe('The ID or name of the table. Example: "tblt8x1D5J6Q0jB7Q" or "Projects"'),
    recordId: z.string().describe('The ID of the record. Example: "recU8x4f5L6m7N8o9"'),
    rowCommentId: z.string().describe('The ID of the comment to update. Example: "comx8x9y0z1a2b3c4"'),
    text: z.string().describe('The new text for the comment.')
});

const CommentAuthorSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string()
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    author: CommentAuthorSchema,
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
    createdTime: z.string(),
    lastUpdatedTime: z.string().optional()
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
    scopes: ['data.records:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://airtable.com/developers/web/api/update-comment
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}/${input.recordId}/comments/${input.rowCommentId}`,
            data: {
                text: input.text
            },
            retries: 3
        };

        const response = await nango.patch(config);

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            author: {
                id: providerComment.author.id,
                email: providerComment.author.email,
                name: providerComment.author.name
            },
            text: providerComment.text,
            createdTime: providerComment.createdTime,
            ...(providerComment.lastUpdatedTime !== undefined && {
                lastUpdatedTime: providerComment.lastUpdatedTime
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
