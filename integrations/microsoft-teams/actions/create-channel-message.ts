import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.string().describe('Team ID. Example: "19:xxxxxxxxxxxxxxxxxxxxxxxxxx@thread.tacv2"'),
    channelId: z.string().describe('Channel ID. Example: "19:xxxxxxxxxxxxxxxxxxxxxxxxxx@thread.tacv2"'),
    body: z.object({
        contentType: z.enum(['html', 'text']).describe('Content type. Example: "html"'),
        content: z.string().describe('Message content in HTML or plain text. Example: "<p>Hello team!</p>"')
    }),
    attachments: z
        .array(
            z.object({
                id: z.string().describe('Unique ID for the attachment'),
                contentType: z.string().describe('MIME type of the attachment. Example: "application/vnd.microsoft.card.hero"'),
                contentUrl: z.string().optional().describe('URL for the attachment'),
                name: z.string().optional().describe('Name of the attachment'),
                content: z.string().optional().describe('JSON-encoded content for adaptive cards')
            })
        )
        .optional()
        .describe('Optional attachments for the message')
});

const ProviderChatMessageSchema = z.object({
    id: z.string(),
    createdDateTime: z.string(),
    from: z
        .object({
            user: z
                .object({
                    id: z.string().optional(),
                    displayName: z.string().nullable().optional()
                })
                .optional()
        })
        .optional(),
    body: z.object({
        contentType: z.enum(['html', 'text', 'markdown']),
        content: z.string()
    }),
    attachments: z
        .array(
            z.object({
                id: z.string(),
                contentType: z.string(),
                contentUrl: z.string().nullable().optional(),
                name: z.string().nullable().optional(),
                content: z.string().nullable().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string().describe('Message ID'),
    createdDateTime: z.string().describe('Creation timestamp'),
    from: z
        .object({
            userId: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional()
        .describe('Sender information'),
    body: z.object({
        contentType: z.enum(['html', 'text', 'markdown']),
        content: z.string()
    }),
    attachments: z
        .array(
            z.object({
                id: z.string(),
                contentType: z.string(),
                contentUrl: z.string().optional(),
                name: z.string().optional(),
                content: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Post a root message in a channel',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ChannelMessage.Send'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: {
            body: { contentType: string; content: string };
            attachments?: Array<{
                id: string;
                contentType: string;
                contentUrl?: string;
                name?: string;
                content?: string;
            }>;
        } = {
            body: {
                contentType: input.body.contentType,
                content: input.body.content
            }
        };

        if (input.attachments !== undefined && input.attachments.length > 0) {
            requestBody.attachments = input.attachments.map((att) => ({
                id: att.id,
                contentType: att.contentType,
                ...(att.contentUrl !== undefined && { contentUrl: att.contentUrl }),
                ...(att.name !== undefined && { name: att.name }),
                ...(att.content !== undefined && { content: att.content })
            }));
        }

        // https://learn.microsoft.com/graph/api/channel-post-messages
        const response = await nango.post({
            endpoint: `/v1.0/teams/${input.teamId}/channels/${input.channelId}/messages`,
            data: requestBody,
            retries: 3
        });

        const providerMessage = ProviderChatMessageSchema.parse(response.data);

        return {
            id: providerMessage.id,
            createdDateTime: providerMessage.createdDateTime,
            ...(providerMessage.from !== undefined && {
                from: {
                    ...(providerMessage.from.user?.id !== undefined && {
                        userId: providerMessage.from.user.id
                    }),
                    ...(providerMessage.from.user?.displayName != null && {
                        displayName: providerMessage.from.user.displayName
                    })
                }
            }),
            body: {
                contentType: providerMessage.body.contentType,
                content: providerMessage.body.content
            },
            ...(providerMessage.attachments !== undefined &&
                providerMessage.attachments.length > 0 && {
                    attachments: providerMessage.attachments.map((att) => ({
                        id: att.id,
                        contentType: att.contentType,
                        ...(att.contentUrl != null && { contentUrl: att.contentUrl }),
                        ...(att.name != null && { name: att.name }),
                        ...(att.content != null && { content: att.content })
                    }))
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
