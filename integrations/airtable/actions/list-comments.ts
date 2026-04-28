import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base. Example: "appXXXXXXXXXXXXXX"'),
    tableIdOrName: z.string().describe('The ID or name of the table. Example: "tblXXXXXXXXXXXXXX"'),
    recordId: z.string().describe('The ID of the record. Example: "recXXXXXXXXXXXXXX"'),
    pageSize: z.number().min(1).max(100).optional().describe('Number of comments per page (1-100, default: 100).'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Maps to the Airtable offset parameter. Omit for the first page.')
});

const AuthorSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    name: z.string().optional()
});

const CommentSchema = z.object({
    id: z.string(),
    author: AuthorSchema,
    text: z.string(),
    createdTime: z.string(),
    lastUpdatedTime: z.string().optional()
});

const ProviderResponseSchema = z.object({
    comments: z.array(z.unknown()),
    offset: z.string().nullable().optional()
});

const OutputSchema = z.object({
    comments: z.array(CommentSchema),
    nextCursor: z.string().optional().describe('Pagination cursor for the next page. Maps from the Airtable offset response field.')
});

const action = createAction({
    description: 'List comments on an Airtable record.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-comments',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.pageSize !== undefined) {
            params['pageSize'] = String(input.pageSize);
        }
        if (input.cursor !== undefined) {
            params['offset'] = input.cursor;
        }

        const response = await nango.get({
            // https://airtable.com/developers/web/api/list-comments
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}/${input.recordId}/comments`,
            params: params,
            retries: 3
        });

        if (response.data === null || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected object response from Airtable comments API'
            });
        }

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from Airtable comments API'
            });
        }

        const comments = parsedResponse.data.comments.map((item) => {
            if (item === null || typeof item !== 'object') {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Expected comment object in comments array'
                });
            }

            const authorItem = 'author' in item && item.author !== null && typeof item.author === 'object' ? item.author : {};
            const authorId = 'id' in authorItem && typeof authorItem.id === 'string' ? authorItem.id : '';
            const authorEmail = 'email' in authorItem && typeof authorItem.email === 'string' ? authorItem.email : undefined;
            const authorName = 'name' in authorItem && typeof authorItem.name === 'string' ? authorItem.name : undefined;

            return {
                id: 'id' in item && typeof item.id === 'string' ? item.id : '',
                author: {
                    id: authorId,
                    ...(authorEmail !== undefined && { email: authorEmail }),
                    ...(authorName !== undefined && { name: authorName })
                },
                text: 'text' in item && typeof item.text === 'string' ? item.text : '',
                createdTime: 'createdTime' in item && typeof item.createdTime === 'string' ? item.createdTime : '',
                lastUpdatedTime: 'lastUpdatedTime' in item && typeof item.lastUpdatedTime === 'string' ? item.lastUpdatedTime : undefined
            };
        });

        return {
            comments: comments,
            ...(parsedResponse.data.offset != null && { nextCursor: parsedResponse.data.offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
