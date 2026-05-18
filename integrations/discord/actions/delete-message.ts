import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    botToken: z.string().describe('Discord bot token')
});

const InputSchema = z.object({
    channelId: z.string().describe('Channel ID where the message exists. Example: "1234567890123456789"'),
    messageId: z.string().describe('Message ID to delete. Example: "9876543210987654321"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    messageId: z.string().describe('ID of the deleted message'),
    channelId: z.string().describe('Channel ID where the message was deleted')
});

const action = createAction({
    description: 'Delete or archive a message in Discord',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-message',
        group: 'Messages'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['messages.read', 'messages.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = MetadataSchema.safeParse(await nango.getMetadata());

        if (!metadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Invalid metadata: botToken is required.'
            });
        }

        const botToken = metadata.data.botToken;

        // https://discord.com/developers/docs/resources/message#delete-message
        await nango.delete({
            endpoint: `/api/v10/channels/${input.channelId}/messages/${input.messageId}`,
            headers: {
                Authorization: `Bot ${botToken}`
            },
            retries: 3
        });

        return {
            success: true,
            messageId: input.messageId,
            channelId: input.channelId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
