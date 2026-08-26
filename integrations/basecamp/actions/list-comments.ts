import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// The account-scoped Basecamp API host. The configured provider base URL already embeds the account ID
// (e.g. https://3.basecampapi.com/12345), and so does the absolute `next` URL from the Link header
// (e.g. https://3.basecampapi.com/12345/buckets/.../comments.json?page=2). Reusing the cursor's path
// under the default base URL would double up the account ID and 404. Instead, once the cursor's origin
// is confirmed to be this trusted host, the request is sent with baseUrlOverride set to that origin so
// the full account-scoped path from the cursor is used as-is.
const BASECAMP_API_ORIGIN = 'https://3.basecampapi.com';

const CreatorSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    email_address: z.string().nullable().optional()
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
            email_address: z.string().nullable().optional().describe('Creator email address, or null/absent if the creator has none.')
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
        // Keep the full absolute URL (including its account-scoped path) so the next call can
        // validate its origin and reuse the exact path via baseUrlOverride. See BASECAMP_API_ORIGIN above.
        return match[1];
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
        let endpoint: string;
        let baseUrlOverride: string | undefined;

        if (input.cursor) {
            let url: URL;
            // @allowTryCatch A malformed cursor must surface as a structured ActionError instead of an unhandled TypeError from URL parsing.
            try {
                url = new URL(input.cursor);
            } catch {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'The cursor is not a valid URL.'
                });
            }
            if (url.origin !== BASECAMP_API_ORIGIN) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'The cursor does not point to the Basecamp API host.'
                });
            }
            baseUrlOverride = url.origin;
            endpoint = url.pathname + url.search;
        } else {
            endpoint = `/buckets/${encodeURIComponent(input.projectId)}/recordings/${encodeURIComponent(input.recordingId)}/comments.json`;
        }

        const config: ProxyConfiguration = {
            // https://github.com/basecamp/bc3-api/blob/master/sections/comments.md#get-comments
            endpoint,
            ...(baseUrlOverride && { baseUrlOverride }),
            retries: 3
        };

        const response = await nango.get(config);

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
                    ...(comment.creator.email_address != null && { email_address: comment.creator.email_address })
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
