import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The project (bucket) ID that contains the comment. Example: 48644099'),
        commentId: z.number().describe('The numeric ID of the comment to retrieve. Example: 1069479852')
    })
    .describe('Input for retrieving a single Basecamp comment by project and comment ID.');

const ParentSchema = z.object({
    id: z.number(),
    title: z.string().optional(),
    type: z.string(),
    url: z.string(),
    app_url: z.string().optional()
});

const BucketSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string()
});

const CreatorSchema = z.object({
    id: z.number(),
    name: z.string(),
    email_address: z.string().optional()
});

const ProviderCommentSchema = z.object({
    id: z.number(),
    status: z.string(),
    visible_to_clients: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    title: z.string().optional(),
    inherits_status: z.boolean(),
    type: z.string(),
    url: z.string(),
    app_url: z.string().optional(),
    bookmark_url: z.string().optional(),
    boosts_count: z.number(),
    boosts_url: z.string().optional(),
    parent: ParentSchema.optional(),
    bucket: BucketSchema.optional(),
    creator: CreatorSchema.optional(),
    content: z.string().optional(),
    content_attachments: z.array(z.unknown()).optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique numeric ID of the comment.'),
        status: z.string().describe('The status of the comment, such as active or drafted.'),
        visible_to_clients: z.boolean().describe('Whether the comment is visible to client users.'),
        created_at: z.string().describe('ISO 8601 timestamp when the comment was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the comment was last updated.'),
        title: z.string().optional().describe('The auto-generated title of the comment, typically "Re: <parent title>".'),
        inherits_status: z.boolean().describe('Whether the comment inherits the status of its parent recording.'),
        type: z.string().describe('The record type, always "Comment".'),
        url: z.string().describe('The API URL for this comment.'),
        app_url: z.string().optional().describe('The Basecamp web app URL for this comment.'),
        bookmark_url: z.string().optional().describe('The bookmark URL for this comment.'),
        boosts_count: z.number().describe('The number of boosts (likes) on this comment.'),
        boosts_url: z.string().optional().describe('The API URL for boosts on this comment.'),
        parent: z
            .object({
                id: z.number().describe('The numeric ID of the parent recording.'),
                title: z.string().optional().describe('The title of the parent recording.'),
                type: z.string().describe('The type of the parent recording, e.g. Message or Todo.'),
                url: z.string().describe('The API URL of the parent recording.'),
                app_url: z.string().optional().describe('The Basecamp app URL of the parent recording.')
            })
            .optional()
            .describe('The parent recording this comment is attached to.'),
        bucket: z
            .object({
                id: z.number().describe('The numeric ID of the project (bucket).'),
                name: z.string().describe('The name of the project.'),
                type: z.string().describe('The type of the bucket, typically "Project".')
            })
            .optional()
            .describe('The project (bucket) containing this comment.'),
        creator: z
            .object({
                id: z.number().describe('The numeric ID of the person who created the comment.'),
                name: z.string().describe('The display name of the creator.'),
                email_address: z.string().optional().describe('The email address of the creator.')
            })
            .optional()
            .describe('The person who authored the comment.'),
        content: z.string().optional().describe('The HTML body content of the comment.'),
        content_attachments: z.array(z.unknown()).optional().describe('Attachments embedded in the comment content.')
    })
    .describe('A single Basecamp comment with its metadata, parent, bucket, creator, and content.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single comment from the Basecamp API without mutating provider data.
 * @pitfalls: A 404 may indicate a missing comment, insufficient permission, or an inactive account subscription.
 */
const action = createAction({
    description: 'Retrieve a single comment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/comments.md#get-a-comment
        const response = await nango.get({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/comments/${encodeURIComponent(input.commentId)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Comment not found or inaccessible.'
            });
        }

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            status: providerComment.status,
            visible_to_clients: providerComment.visible_to_clients,
            created_at: providerComment.created_at,
            updated_at: providerComment.updated_at,
            title: providerComment.title,
            inherits_status: providerComment.inherits_status,
            type: providerComment.type,
            url: providerComment.url,
            app_url: providerComment.app_url,
            bookmark_url: providerComment.bookmark_url,
            boosts_count: providerComment.boosts_count,
            boosts_url: providerComment.boosts_url,
            parent: providerComment.parent,
            bucket: providerComment.bucket,
            creator: providerComment.creator,
            content: providerComment.content,
            content_attachments: providerComment.content_attachments
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
