import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderProjectSchema = z.object({
    id: z.number(),
    dock: z
        .array(
            z.object({
                id: z.number(),
                name: z.string(),
                enabled: z.boolean()
            })
        )
        .optional()
});

const ProviderMessageSchema = z.object({
    id: z.number(),
    status: z.string(),
    visible_to_clients: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    title: z.string(),
    // The messages listing endpoint (GET .../messages.json) does not document or reliably return
    // `subject` (it's documented only on the single-message endpoint), even though it has been
    // observed present on some listing responses. Treat it as possibly absent so a page never
    // fails to parse solely because of this field.
    subject: z.string().optional(),
    content: z.string().optional(),
    url: z.string(),
    app_url: z.string(),
    comments_count: z.number(),
    comments_url: z.string(),
    boosts_count: z.number().optional(),
    boosts_url: z.string().optional(),
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
    creator: z
        .object({
            id: z.number(),
            name: z.string(),
            email_address: z.string().optional(),
            avatar_url: z.string().optional()
        })
        .optional()
});

const ParentSchema = z
    .object({
        id: z.string().describe('The globally unique identifier of the parent message board'),
        title: z.string().describe('The title of the parent message board'),
        type: z.string().describe('The type of the parent resource'),
        url: z.string().describe('The API URL of the parent message board'),
        app_url: z.string().describe('The Basecamp app URL of the parent message board')
    })
    .describe('The message board that contains this message');

const BucketSchema = z
    .object({
        id: z.string().describe('The globally unique identifier of the project'),
        name: z.string().describe('The name of the project'),
        type: z.string().describe('The type of the bucket resource')
    })
    .describe('The project that this message belongs to');

const CreatorSchema = z
    .object({
        id: z.string().describe('The globally unique identifier of the creator'),
        name: z.string().describe('The name of the creator'),
        email_address: z.string().optional().describe('The email address of the creator'),
        avatar_url: z.string().optional().describe('The avatar URL of the creator')
    })
    .describe('The person who created this message');

const MessageSchema = z
    .object({
        id: z.string().describe('The globally unique identifier for the message'),
        status: z.string().describe('The current status of the message such as active or drafted'),
        visible_to_clients: z.boolean().describe('Whether the message is visible to client users'),
        created_at: z.string().describe('The ISO 8601 timestamp when the message was created'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the message was last updated'),
        title: z.string().describe('The title of the message'),
        subject: z.string().describe('The subject line of the message'),
        content: z.string().optional().describe('The HTML body content of the message'),
        url: z.string().describe('The API URL for the message'),
        app_url: z.string().describe('The Basecamp app URL for the message'),
        comments_count: z.number().describe('The number of comments attached to the message'),
        comments_url: z.string().describe('The API URL for the message comments'),
        boosts_count: z.number().optional().describe('The number of boosts on the message'),
        boosts_url: z.string().optional().describe('The API URL for the message boosts'),
        parent: ParentSchema,
        bucket: BucketSchema,
        creator: CreatorSchema.optional()
    })
    .describe('A message posted to a Basecamp message board');

const CheckpointSchema = z.object({
    projectId: z.string(),
    messageBoardId: z.string()
});

const sync = createSync({
    description: 'Sync messages across all known project message boards',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Message: MessageSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const projectsConfig: ProxyConfiguration = {
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/projects.md
            endpoint: '/projects.json',
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'limit',
                limit: 2
            },
            retries: 3
        };

        const projects: Array<z.infer<typeof ProviderProjectSchema>> = [];
        for await (const page of nango.paginate(projectsConfig)) {
            const validated = z.array(ProviderProjectSchema).parse(page);
            projects.push(...validated);
        }

        const boards: Array<{ projectId: string; messageBoardId: string }> = [];
        for (const project of projects) {
            const dock = project.dock ?? [];
            const board = dock.find((tool) => tool.name === 'message_board');
            if (board && board.enabled) {
                boards.push({
                    projectId: String(project.id),
                    messageBoardId: String(board.id)
                });
            }
        }

        let startIndex = 0;
        if (checkpoint !== null && checkpoint !== undefined && checkpoint['projectId'] !== '' && checkpoint['messageBoardId'] !== '') {
            const index = boards.findIndex((b) => b.projectId === checkpoint['projectId'] && b.messageBoardId === checkpoint['messageBoardId']);
            if (index !== -1) {
                startIndex = index;
            }
        }

        await nango.trackDeletesStart('Message');

        for (let i = startIndex; i < boards.length; i++) {
            const board = boards[i];
            if (!board) {
                continue;
            }
            const { projectId, messageBoardId } = board;

            const messagesConfig: ProxyConfiguration = {
                // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/messages.md
                endpoint: `/buckets/${encodeURIComponent(projectId)}/message_boards/${encodeURIComponent(messageBoardId)}/messages.json`,
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'limit',
                    limit: 2
                },
                retries: 3
            };

            for await (const page of nango.paginate(messagesConfig)) {
                const validated = z.array(ProviderMessageSchema).parse(page);
                const messages = validated.map((msg) => ({
                    id: String(msg.id),
                    status: msg.status,
                    visible_to_clients: msg.visible_to_clients,
                    created_at: msg.created_at,
                    updated_at: msg.updated_at,
                    title: msg.title,
                    // subject can be absent from the listing response; title always mirrors it, so fall back to title.
                    subject: msg.subject ?? msg.title,
                    ...(msg.content !== undefined && { content: msg.content }),
                    url: msg.url,
                    app_url: msg.app_url,
                    comments_count: msg.comments_count,
                    comments_url: msg.comments_url,
                    ...(msg.boosts_count !== undefined && { boosts_count: msg.boosts_count }),
                    ...(msg.boosts_url !== undefined && { boosts_url: msg.boosts_url }),
                    parent: {
                        id: String(msg.parent.id),
                        title: msg.parent.title,
                        type: msg.parent.type,
                        url: msg.parent.url,
                        app_url: msg.parent.app_url
                    },
                    bucket: {
                        id: String(msg.bucket.id),
                        name: msg.bucket.name,
                        type: msg.bucket.type
                    },
                    creator: msg.creator
                        ? {
                              id: String(msg.creator.id),
                              name: msg.creator.name,
                              ...(msg.creator.email_address !== undefined && { email_address: msg.creator.email_address }),
                              ...(msg.creator.avatar_url !== undefined && { avatar_url: msg.creator.avatar_url })
                          }
                        : undefined
                }));

                if (messages.length > 0) {
                    await nango.batchSave(messages, 'Message');
                }
            }

            if (i + 1 < boards.length) {
                const nextBoard = boards[i + 1];
                if (nextBoard) {
                    await nango.saveCheckpoint({
                        projectId: nextBoard.projectId,
                        messageBoardId: nextBoard.messageBoardId
                    });
                }
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Message');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
