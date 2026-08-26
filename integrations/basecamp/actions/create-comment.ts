import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The project (bucket) ID that contains the recording to comment on. Example: 48644099'),
        recordingId: z.number().describe('The ID of the recording to comment on. Recording IDs are globally unique across Basecamp. Example: 10239340927'),
        content: z
            .string()
            .describe(
                'The body of the comment as HTML-rich text. See the Basecamp rich-text guide for allowed tags. Example: "<div><em>Wow!</em> That is cool.</div>"'
            )
    })
    .describe('Input for creating a comment on a Basecamp recording');

const CreatorSchema = z.object({
    id: z.number().describe('The unique ID of the comment author'),
    name: z.string().describe('The display name of the comment author'),
    email_address: z.string().describe('The email address of the comment author'),
    title: z.string().nullable().describe('The job title of the comment author'),
    avatar_url: z.string().describe("The URL of the author's avatar image")
});

const ParentSchema = z.object({
    id: z.number().describe('The ID of the parent recording this comment is attached to'),
    title: z.string().describe('The title of the parent recording'),
    type: z.string().describe('The type of the parent recording (e.g. Message, Todo, etc.)'),
    url: z.string().describe('The API URL of the parent recording'),
    app_url: z.string().describe('The Basecamp app URL of the parent recording')
});

const BucketSchema = z.object({
    id: z.number().describe('The project ID this comment belongs to'),
    name: z.string().describe('The name of the project'),
    type: z.string().describe('The type of the bucket (always Project)')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the newly created comment'),
        status: z.string().describe('The status of the comment (always active for newly created comments)'),
        created_at: z.string().describe('The ISO 8601 timestamp when the comment was created'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the comment was last updated'),
        title: z.string().describe('The auto-generated title of the comment (e.g. "Re: Message Title")'),
        type: z.string().describe('The type of the record (always Comment)'),
        url: z.string().describe('The API URL of the comment'),
        app_url: z.string().describe('The Basecamp app URL of the comment'),
        content: z.string().describe('The HTML body of the comment'),
        content_attachments: z.array(z.unknown()).describe('Attachments embedded in the comment body'),
        creator: CreatorSchema.describe('The person who authored the comment'),
        parent: ParentSchema.describe('The parent recording this comment is attached to'),
        bucket: BucketSchema.describe('The project this comment belongs to')
    })
    .describe('The newly created Basecamp comment');

const ProviderCommentSchema = z.object({
    id: z.number(),
    status: z.string(),
    visible_to_clients: z.boolean().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    title: z.string(),
    inherits_status: z.boolean().optional(),
    type: z.string(),
    url: z.string(),
    app_url: z.string(),
    bookmark_url: z.string().optional(),
    boosts_count: z.number().optional(),
    boosts_url: z.string().optional(),
    parent: z
        .object({
            id: z.number(),
            title: z.string(),
            type: z.string(),
            url: z.string().optional(),
            app_url: z.string().optional()
        })
        .optional(),
    bucket: z
        .object({
            id: z.number(),
            name: z.string(),
            type: z.string()
        })
        .optional(),
    creator: z
        .object({
            id: z.number(),
            name: z.string(),
            email_address: z.string().nullable().optional(),
            title: z.string().nullable().optional(),
            avatar_url: z.string().optional()
        })
        .optional(),
    content: z.string(),
    content_attachments: z.array(z.unknown()).optional()
});

/**
 * @tags: [write]
 * @tagReason: Posts a new comment to a Basecamp recording, which notifies all subscribed users and mutates the provider state.
 * @pitfalls: All people subscribed to the recording are immediately notified when the comment is posted.
 */
const action = createAction({
    description: 'Post a comment on any recording',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/comments.md#create-a-comment
        const response = await nango.post({
            endpoint: `/buckets/${encodeURIComponent(String(input.projectId))}/recordings/${encodeURIComponent(String(input.recordingId))}/comments.json`,
            data: {
                content: input.content
            },
            retries: 3
        });

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            status: providerComment.status,
            created_at: providerComment.created_at,
            updated_at: providerComment.updated_at,
            title: providerComment.title,
            type: providerComment.type,
            url: providerComment.url,
            app_url: providerComment.app_url,
            content: providerComment.content,
            content_attachments: providerComment.content_attachments ?? [],
            creator: providerComment.creator
                ? {
                      id: providerComment.creator.id,
                      name: providerComment.creator.name,
                      email_address: providerComment.creator.email_address ?? '',
                      title: providerComment.creator.title ?? null,
                      avatar_url: providerComment.creator.avatar_url ?? ''
                  }
                : {
                      id: 0,
                      name: '',
                      email_address: '',
                      title: null,
                      avatar_url: ''
                  },
            parent: providerComment.parent
                ? {
                      id: providerComment.parent.id,
                      title: providerComment.parent.title,
                      type: providerComment.parent.type,
                      url: providerComment.parent.url ?? '',
                      app_url: providerComment.parent.app_url ?? ''
                  }
                : {
                      id: 0,
                      title: '',
                      type: '',
                      url: '',
                      app_url: ''
                  },
            bucket: providerComment.bucket
                ? {
                      id: providerComment.bucket.id,
                      name: providerComment.bucket.name,
                      type: providerComment.bucket.type
                  }
                : {
                      id: 0,
                      name: '',
                      type: ''
                  }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
