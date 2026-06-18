import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channelId: z.string().describe('Discord channel ID. Example: "1504364254634180618"')
});

const WebhookSchema = z.object({
    id: z.string(),
    type: z.number().int(),
    guild_id: z.string().optional(),
    channel_id: z.string().optional(),
    name: z.string().nullable().optional(),
    avatar: z.string().nullable().optional(),
    token: z.string().optional(),
    application_id: z.string().nullable().optional(),
    user: z
        .object({
            id: z.string(),
            username: z.string(),
            discriminator: z.string(),
            avatar: z.string().nullable().optional(),
            bot: z.boolean().optional()
        })
        .optional(),
    source_guild: z
        .object({
            id: z.string(),
            name: z.string(),
            icon: z.string().nullable().optional()
        })
        .optional(),
    source_channel: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    url: z.string().optional()
});

const OutputSchema = z.object({
    webhooks: z.array(WebhookSchema)
});

const MetadataSchema = z.object({
    botToken: z.string()
});

const action = createAction({
    description: 'List webhooks from a Discord channel',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['webhook.incoming'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();

        if (!metadata?.botToken) {
            throw new nango.ActionError({
                type: 'missing_bot_token',
                message: 'Bot token is required in connection metadata.'
            });
        }

        // https://discord.com/developers/docs/resources/webhook#list-channel-webhooks
        const response = await nango.get({
            endpoint: `/api/v10/channels/${input.channelId}/webhooks`,
            headers: {
                Authorization: `Bot ${metadata.botToken}`
            },
            retries: 3
        });

        const webhooks = z.array(WebhookSchema).parse(response.data);

        return {
            webhooks: webhooks
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
