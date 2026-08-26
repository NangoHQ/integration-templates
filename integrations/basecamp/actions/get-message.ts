import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The Basecamp project (bucket) ID that contains the message. Example: 48644099'),
        messageId: z.number().describe('The ID of the message to retrieve. Example: 10239435719')
    })
    .describe('Input to retrieve a single Basecamp message by project and message ID.');

const ParentSchema = z.object({
    id: z.number().describe('The ID of the parent message board.'),
    title: z.string().describe('The title of the parent message board.'),
    type: z.string().describe('The type of the parent resource.')
});

const BucketSchema = z.object({
    id: z.number().describe('The ID of the project bucket.'),
    name: z.string().describe('The name of the project.'),
    type: z.string().describe('The type of the bucket resource.')
});

const CreatorSchema = z.object({
    id: z.number().describe('The ID of the person who created the message.'),
    name: z.string().describe('The full name of the creator.'),
    email_address: z.string().describe('The email address of the creator.'),
    avatar_url: z.string().describe("The URL of the creator's avatar image.")
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the message.'),
        status: z.string().describe('The status of the message, such as active or drafted.'),
        visible_to_clients: z.boolean().describe('Whether the message is visible to client users.'),
        created_at: z.string().describe('The ISO 8601 timestamp when the message was created.'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the message was last updated.'),
        title: z.string().describe('The title of the message.'),
        type: z.string().describe('The resource type, typically Message.'),
        url: z.string().describe('The API URL for this message.'),
        app_url: z.string().describe('The Basecamp web app URL for this message.'),
        comments_count: z.number().describe('The number of comments on this message.'),
        comments_url: z.string().describe('The API URL to fetch comments for this message.'),
        content: z.string().describe('The rich-text HTML body of the message, which may include <bc-attachment> tags.'),
        subject: z.string().describe('The subject line of the message.'),
        parent: ParentSchema.describe('The message board that contains this message.'),
        bucket: BucketSchema.describe('The project bucket that contains this message.'),
        creator: CreatorSchema.describe('The person who created this message.')
    })
    .describe('A single Basecamp message including its content, parent board, project bucket, and creator.');

/**
 * @tags: [read]
 * @tagReason: Reads a single message from the Basecamp API.
 * @pitfalls: A 404 may indicate the account is inactive rather than the message missing, signaled by a Reason: Account Inactive response header.
 */
const action = createAction({
    description: 'Retrieve a single message.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/messages.md
        const response = await nango.get({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/messages/${encodeURIComponent(input.messageId)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Message not found',
                projectId: input.projectId,
                messageId: input.messageId
            });
        }

        const message = z
            .object({
                id: z.number(),
                status: z.string(),
                visible_to_clients: z.boolean(),
                created_at: z.string(),
                updated_at: z.string(),
                title: z.string(),
                type: z.string(),
                url: z.string(),
                app_url: z.string(),
                comments_count: z.number(),
                comments_url: z.string(),
                content: z.string(),
                subject: z.string(),
                parent: z.object({
                    id: z.number(),
                    title: z.string(),
                    type: z.string()
                }),
                bucket: z.object({
                    id: z.number(),
                    name: z.string(),
                    type: z.string()
                }),
                creator: z.object({
                    id: z.number(),
                    name: z.string(),
                    email_address: z.string(),
                    avatar_url: z.string()
                })
            })
            .parse(response.data);

        return {
            id: message.id,
            status: message.status,
            visible_to_clients: message.visible_to_clients,
            created_at: message.created_at,
            updated_at: message.updated_at,
            title: message.title,
            type: message.type,
            url: message.url,
            app_url: message.app_url,
            comments_count: message.comments_count,
            comments_url: message.comments_url,
            content: message.content,
            subject: message.subject,
            parent: message.parent,
            bucket: message.bucket,
            creator: message.creator
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
