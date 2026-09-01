import { z } from 'zod';
import { createAction } from 'nango';

const ParentSchema = z.object({
    id: z.number().describe('The unique ID of the parent resource.'),
    title: z.string().describe('The title of the parent resource.'),
    type: z.string().describe('The type of the parent resource, e.g., Message or Todo.'),
    url: z.string().describe('The API URL of the parent resource.'),
    app_url: z.string().describe('The Basecamp app URL of the parent resource.')
});

const BucketSchema = z.object({
    id: z.number().describe('The unique ID of the project bucket.'),
    name: z.string().describe('The name of the project.'),
    type: z.string().describe('The type of the bucket, typically Project.')
});

const CreatorSchema = z.object({
    id: z.number().describe('The unique ID of the comment creator.'),
    name: z.string().describe('The display name of the comment creator.'),
    email_address: z.string().optional().describe('The email address of the comment creator, if exposed by the provider.')
});

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project (bucket) containing the comment.'),
        commentId: z.number().describe('The unique ID of the comment to update.'),
        content: z.string().describe('The new HTML content for the comment.')
    })
    .describe('Input for updating a Basecamp comment.');

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the updated comment.'),
        status: z.string().describe('The current status of the comment, e.g., active.'),
        content: z.string().describe('The HTML content of the comment.'),
        created_at: z.string().describe('The ISO 8601 timestamp when the comment was created.'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the comment was last updated.'),
        parent: ParentSchema.describe('The parent resource this comment belongs to.'),
        bucket: BucketSchema.describe('The project bucket containing this comment.'),
        creator: CreatorSchema.describe('The person who created the comment.')
    })
    .describe('Output of an updated Basecamp comment.');

/**
 * @tags: [write]
 * @tagReason: Updates the HTML content of an existing Basecamp comment.
 */
const action = createAction({
    description: "Update a comment's content.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://github.com/basecamp/bc3-api/blob/master/sections/comments.md#update-a-comment
            endpoint: `/buckets/${encodeURIComponent(String(input.projectId))}/comments/${encodeURIComponent(String(input.commentId))}.json`,
            data: {
                content: input.content
            },
            retries: 3
        });

        const comment = z
            .object({
                id: z.number(),
                status: z.string(),
                content: z.string(),
                created_at: z.string(),
                updated_at: z.string(),
                parent: z.object({
                    id: z.number(),
                    title: z.string(),
                    type: z.string(),
                    url: z.string(),
                    app_url: z.string()
                }),
                bucket: z.object({
                    id: z.number(),
                    name: z.string(),
                    type: z.string()
                }),
                creator: z.object({
                    id: z.number(),
                    name: z.string(),
                    email_address: z.string().nullable().optional()
                })
            })
            .parse(response.data);

        return {
            id: comment.id,
            status: comment.status,
            content: comment.content,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            parent: comment.parent,
            bucket: comment.bucket,
            creator: {
                id: comment.creator.id,
                name: comment.creator.name,
                ...(comment.creator.email_address != null && { email_address: comment.creator.email_address })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
