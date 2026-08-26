import { z } from 'zod';
import { createAction } from 'nango';

const MessageCreatorSchema = z.object({
    id: z.number(),
    attachable_sgid: z.string(),
    name: z.string(),
    email_address: z.string(),
    personable_type: z.string(),
    title: z.string().nullable(),
    bio: z.string().nullable(),
    location: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    admin: z.boolean(),
    owner: z.boolean(),
    client: z.boolean(),
    employee: z.boolean(),
    time_zone: z.string(),
    avatar_url: z.string(),
    company: z.object({
        id: z.number(),
        name: z.string()
    }),
    can_ping: z.boolean(),
    can_manage: z.boolean().optional(),
    can_manage_people: z.boolean(),
    can_manage_projects: z.boolean(),
    can_manage_groups: z.boolean().optional()
});

const MessageSchema = z.object({
    id: z.number(),
    status: z.string(),
    visible_to_clients: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    title: z.string(),
    inherits_status: z.boolean(),
    type: z.string(),
    url: z.string(),
    app_url: z.string(),
    bookmark_url: z.string(),
    subscription_url: z.string(),
    comments_count: z.number(),
    comments_url: z.string(),
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
    creator: MessageCreatorSchema,
    content: z.string()
});

const InputSchema = z
    .object({
        projectId: z.string().describe('The Basecamp project (bucket) ID. Example: "48644099"'),
        messageBoardId: z.string().describe('The message board ID from the project\'s dock. Example: "10239340927"'),
        sort: z.enum(['created_at', 'updated_at']).optional().describe('Sort field. Defaults to created_at.'),
        direction: z.enum(['asc', 'desc']).optional().describe('Sort direction. Defaults to desc.'),
        cursor: z.string().optional().describe("Pagination cursor from the previous response's Link header. Omit for the first page.")
    })
    .describe('Input for listing messages on a Basecamp message board');

const OutputSchema = z
    .object({
        items: z
            .array(
                z
                    .object({
                        id: z.number().describe('Message ID'),
                        status: z.string().describe('Message status: active or drafted'),
                        created_at: z.string().describe('ISO 8601 creation timestamp'),
                        updated_at: z.string().describe('ISO 8601 last-update timestamp'),
                        title: z.string().describe('Message title'),
                        content: z.string().describe('Message body in HTML'),
                        comments_count: z.number().describe('Number of comments on the message'),
                        creator: z
                            .object({
                                id: z.number().describe('Creator person ID'),
                                name: z.string().describe('Creator display name'),
                                email_address: z.string().describe('Creator email address')
                            })
                            .describe('The person who created the message')
                    })
                    .describe('A message on the board')
            )
            .describe('Messages on the message board'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page, if more results exist')
    })
    .describe('Output for listing messages on a Basecamp message board');

/**
 * @tags: [read]
 * @tagReason: Reads messages from a Basecamp message board.
 * @pitfalls: Draft messages are excluded from results; messages must be published with status active before they appear in this listing.
 */
const action = createAction({
    description: "List messages on a project's message board",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.sort !== undefined) {
            params['sort'] = input.sort;
        }
        if (input.direction !== undefined) {
            params['direction'] = input.direction;
        }
        if (input.cursor !== undefined) {
            params['page'] = input.cursor;
        }

        // https://github.com/basecamp/bc3-api/blob/master/sections/messages.md
        const response = await nango.get({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/message_boards/${encodeURIComponent(input.messageBoardId)}/messages.json`,
            params,
            retries: 3
        });

        const messages = z.array(MessageSchema).parse(response.data);

        const nextCursor = typeof response.headers === 'object' && response.headers !== null ? extractNextCursor(response.headers['link']) : undefined;

        return {
            items: messages.map((message) => ({
                id: message.id,
                status: message.status,
                created_at: message.created_at,
                updated_at: message.updated_at,
                title: message.title,
                content: message.content,
                comments_count: message.comments_count,
                creator: {
                    id: message.creator.id,
                    name: message.creator.name,
                    email_address: message.creator.email_address
                }
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

function extractNextCursor(linkHeader: unknown): string | undefined {
    if (typeof linkHeader !== 'string') {
        return undefined;
    }

    const match = linkHeader.match(/<[^>]*[?&]page=([^&>]+)[^>]*>;\s*rel="next"/);
    if (match && match[1]) {
        return match[1];
    }

    return undefined;
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
