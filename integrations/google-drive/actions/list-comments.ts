import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the file to list comments for. Example: "1wwU5Dhr-6_3SHgtSQnXJ7HBPkgW-shalzdc0pfRL-Yk"'),
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.')
});

const AuthorSchema = z.object({
    displayName: z.union([z.string(), z.null()]),
    kind: z.union([z.string(), z.null()]),
    me: z.union([z.boolean(), z.null()]),
    photoLink: z.union([z.string(), z.null()])
});

const CommentSchema = z.object({
    id: z.string(),
    content: z.union([z.string(), z.null()]),
    htmlContent: z.union([z.string(), z.null()]),
    createdTime: z.union([z.string(), z.null()]),
    modifiedTime: z.union([z.string(), z.null()]),
    resolved: z.union([z.boolean(), z.null()]),
    deleted: z.union([z.boolean(), z.null()]),
    author: AuthorSchema.nullable()
});

const OutputSchema = z.object({
    comments: z.array(CommentSchema),
    next_cursor: z.union([z.string(), z.null()]).describe('The cursor for the next page of comments. Null if there are no more pages.')
});

const action = createAction({
    description: 'List comments on a file',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-comments',
        group: 'Comments'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config = {
            // https://developers.google.com/workspace/drive/api/reference/rest/v3/comments/list
            endpoint: `drive/v3/files/${input.file_id}/comments`,
            params: {
                fields: '*',
                ...(input.cursor && { pageToken: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No comments found for the specified file',
                file_id: input.file_id
            });
        }

        const comments = (response.data.comments || []).map((comment: any) => ({
            id: comment.id,
            content: comment.content ?? null,
            htmlContent: comment.htmlContent ?? null,
            createdTime: comment.createdTime ?? null,
            modifiedTime: comment.modifiedTime ?? null,
            resolved: comment.resolved ?? null,
            deleted: comment.deleted ?? null,
            author: comment.author
                ? {
                      displayName: comment.author.displayName ?? null,
                      kind: comment.author.kind ?? null,
                      me: comment.author.me ?? null,
                      photoLink: comment.author.photoLink ?? null
                  }
                : null
        }));

        return {
            comments,
            next_cursor: response.data.nextPageToken || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
