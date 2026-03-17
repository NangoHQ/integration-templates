import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fileId: z.string().describe('The ID of the file to list comments for. Example: "1wwU5Dhr-6_3SHgtSQnXJ7HBPkgW-shalzdc0pfRL-Yk"'),
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.')
});

const AuthorSchema = z.object({
    displayName: z.string().optional(),
    kind: z.string().optional(),
    me: z.boolean().optional(),
    photoLink: z.string().optional()
});

const CommentSchema = z.object({
    id: z.string(),
    content: z.string().optional(),
    htmlContent: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    resolved: z.boolean().optional(),
    deleted: z.boolean().optional(),
    author: AuthorSchema.optional()
});

const OutputSchema = z.object({
    comments: z.array(CommentSchema),
    nextPageToken: z.string().optional().describe('The cursor for the next page of comments. Omitted if there are no more pages.')
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
            endpoint: `drive/v3/files/${input.fileId}/comments`,
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
                fileId: input.fileId
            });
        }

        const comments = (response.data.comments || []).map((comment: any) => ({
            id: comment.id,
            content: comment.content ?? undefined,
            htmlContent: comment.htmlContent ?? undefined,
            createdTime: comment.createdTime ?? undefined,
            modifiedTime: comment.modifiedTime ?? undefined,
            resolved: comment.resolved ?? undefined,
            deleted: comment.deleted ?? undefined,
            author: comment.author
                ? {
                      displayName: comment.author.displayName ?? undefined,
                      kind: comment.author.kind ?? undefined,
                      me: comment.author.me ?? undefined,
                      photoLink: comment.author.photoLink ?? undefined
                  }
                : undefined
        }));

        return {
            comments,
            nextPageToken: response.data.nextPageToken || undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
