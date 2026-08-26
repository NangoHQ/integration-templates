import { z } from 'zod';
import { createAction } from 'nango';

const CreatorSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    email_address: z.string().optional()
});

const ParentSchema = z.object({
    id: z.number(),
    title: z.string().optional(),
    type: z.string().optional()
});

const BucketSchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const ProviderCommentSchema = z.object({
    id: z.number(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    title: z.string().optional(),
    content: z.string().optional(),
    creator: CreatorSchema.optional(),
    parent: ParentSchema.optional(),
    bucket: BucketSchema.optional(),
    url: z.string().optional(),
    app_url: z.string().optional()
});

const CommentSchema = z.object({
    id: z.number().describe('Unique comment ID.'),
    status: z.string().optional().describe('Comment status, e.g. active or drafted.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the comment was created.'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the comment was last updated.'),
    title: z.string().optional().describe('Comment title, typically Re: parent title.'),
    content: z.string().optional().describe('HTML body of the comment.'),
    creator: z
        .object({
            id: z.number().describe('Creator person ID.'),
            name: z.string().optional().describe('Creator full name.'),
            email_address: z.string().optional().describe('Creator email address.')
        })
        .optional()
        .describe('Person who created the comment.'),
    parent: z
        .object({
            id: z.number().describe('Parent recording ID.'),
            title: z.string().optional().describe('Parent recording title.'),
            type: z.string().optional().describe('Parent recording type, e.g. Message or Todo.')
        })
        .optional()
        .describe('Recording this comment is attached to.'),
    bucket: z
        .object({
            id: z.number().describe('Project (bucket) ID.'),
            name: z.string().optional().describe('Project name.')
        })
        .optional()
        .describe('Project containing the comment.'),
    url: z.string().optional().describe('API URL of the comment.'),
    app_url: z.string().optional().describe('Basecamp web app URL of the comment.')
});

const InputSchema = z
    .object({
        projectId: z.number().describe('Project (bucket) ID that contains the recording.'),
        recordingId: z.number().describe('Recording ID to list comments for.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input for listing comments on a Basecamp recording.');

const OutputSchema = z
    .object({
        comments: z.array(CommentSchema).describe('Comments on the recording.'),
        nextCursor: z.string().optional().describe('Cursor to fetch the next page of comments.')
    })
    .describe('Output containing comments on a Basecamp recording and pagination cursor.');

function parseNextLink(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    if (match && match[1]) {
        const url = new URL(match[1]);
        return url.pathname + url.search;
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Only reads comments from the Basecamp API.
 * @pitfalls: Only active comments are returned; a 404 may mean the recording does not exist, permission is denied, or the account is inactive.
 */
const action = createAction({
    description: 'List comments on any recording (to-do, message, document, upload, card, schedule entry, to-do list, etc).',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://github.com/basecamp/bc3-api/blob/master/sections/comments.md#get-comments
            endpoint: input.cursor || `/buckets/${encodeURIComponent(input.projectId)}/recordings/${encodeURIComponent(input.recordingId)}/comments.json`,
            retries: 3
        });

        const rawComments = z.array(ProviderCommentSchema).parse(response.data);

        const comments = rawComments.map((comment) => ({
            id: comment.id,
            ...(comment.status !== undefined && { status: comment.status }),
            ...(comment.created_at !== undefined && { created_at: comment.created_at }),
            ...(comment.updated_at !== undefined && { updated_at: comment.updated_at }),
            ...(comment.title !== undefined && { title: comment.title }),
            ...(comment.content !== undefined && { content: comment.content }),
            ...(comment.creator !== undefined && {
                creator: {
                    id: comment.creator.id,
                    ...(comment.creator.name !== undefined && { name: comment.creator.name }),
                    ...(comment.creator.email_address !== undefined && { email_address: comment.creator.email_address })
                }
            }),
            ...(comment.parent !== undefined && {
                parent: {
                    id: comment.parent.id,
                    ...(comment.parent.title !== undefined && { title: comment.parent.title }),
                    ...(comment.parent.type !== undefined && { type: comment.parent.type })
                }
            }),
            ...(comment.bucket !== undefined && {
                bucket: {
                    id: comment.bucket.id,
                    ...(comment.bucket.name !== undefined && { name: comment.bucket.name })
                }
            }),
            ...(comment.url !== undefined && { url: comment.url }),
            ...(comment.app_url !== undefined && { app_url: comment.app_url })
        }));

        const nextCursor = parseNextLink(response.headers['link']);

        return {
            comments,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
