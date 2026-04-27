import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    base_id: z.string().describe('The ID of the Airtable base. Example: "appXXXXXXXXXXXXXX"'),
    table_id_or_name: z.string().describe('The ID or name of the table. Example: "tblXXXXXXXXXXXXXX" or "Table 1"'),
    record_id: z.string().describe('The ID of the record to list comments for. Example: "recXXXXXXXXXXXXXX"'),
    offset: z.string().optional().describe('Pagination offset token from the previous response. Omit for the first page.')
});

const AuthorSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string()
});

const CommentSchema = z.object({
    id: z.string(),
    author: AuthorSchema,
    text: z.string(),
    createdTime: z.string(),
    lastUpdatedTime: z.union([z.string(), z.null()]).optional()
});

const OutputSchema = z.object({
    comments: z.array(CommentSchema),
    offset: z.string().optional()
});

const action = createAction({
    description: 'List comments on an Airtable record',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-comments',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:records:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/list-comments
        const response = await nango.get({
            endpoint: `/v0/${input.base_id}/${input.table_id_or_name}/${input.record_id}/comments`,
            params: {
                ...(input.offset && { offset: input.offset })
            },
            retries: 3
        });

        const providerData = z
            .object({
                comments: z.array(z.unknown()).default([]),
                offset: z.union([z.string(), z.null()]).optional()
            })
            .parse(response.data);

        const comments = providerData.comments.map((item: unknown) => {
            const parsed = CommentSchema.parse(item);
            return {
                id: parsed.id,
                author: parsed.author,
                text: parsed.text,
                createdTime: parsed.createdTime,
                ...(parsed.lastUpdatedTime !== undefined && { lastUpdatedTime: parsed.lastUpdatedTime })
            };
        });

        return {
            comments,
            ...(providerData.offset !== null && providerData.offset !== undefined && { offset: providerData.offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
