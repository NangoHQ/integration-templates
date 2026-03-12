import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the file to comment on. Example: "1zpWYuzY5S65OUGNBZQXmJf4FZnIWLJHBkC2xBamBzvw"'),
    content: z.string().describe('The plain text content of the comment. Example: "This is a test comment."'),
    anchor: z
        .string()
        .optional()
        .describe(
            'A region of the document represented as a JSON string for anchored comments. Example: "{\\"r\\":\\"revision_id\\",\\"a\\":[{\\"line\\":{\\"end\\":\\"1\\"}}]}"'
        )
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the comment.'),
    content: z.string().describe('The plain text content of the comment.'),
    created_time: z.string().describe('The time when the comment was created (RFC 3339 date-time).'),
    modified_time: z.string().describe('The time when the comment was last modified (RFC 3339 date-time).'),
    author: z
        .object({
            display_name: z.string().optional().describe('The display name of the author.'),
            email_address: z.string().optional().describe('The email address of the author.')
        })
        .passthrough()
        .optional()
        .describe('The author of the comment.'),
    resolved: z.boolean().describe('Whether the comment has been resolved.'),
    deleted: z.boolean().describe('Whether the comment has been deleted.')
});

const action = createAction({
    description: 'Add a comment to a file',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-comment',
        group: 'Comments'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: { content: string; anchor?: string } = {
            content: input.content
        };

        if (input.anchor) {
            requestBody.anchor = input.anchor;
        }

        // https://developers.google.com/workspace/drive/api/reference/rest/v3/comments/create
        const response = await nango.post({
            endpoint: `/drive/v3/files/${input.file_id}/comments`,
            params: {
                fields: 'id,content,createdTime,modifiedTime,author,resolved,deleted'
            },
            data: requestBody,
            retries: 3
        });

        const comment = response.data;

        return {
            id: comment.id,
            content: comment.content,
            created_time: comment.createdTime,
            modified_time: comment.modifiedTime,
            author: comment.author
                ? {
                      display_name: comment.author.displayName,
                      email_address: comment.author.emailAddress
                  }
                : undefined,
            resolved: comment.resolved ?? false,
            deleted: comment.deleted ?? false
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
