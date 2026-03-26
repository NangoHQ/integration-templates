import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('The channel ID to list pinned items for. Example: "C1234567890"')
});

const MessageSchema = z.object({
    type: z.string(),
    user: z.string(),
    text: z.string(),
    ts: z.string(),
    permalink: z.string(),
    pinned_to: z.array(z.string()).optional()
});

const FileSchema = z.object({
    id: z.string(),
    created: z.number(),
    timestamp: z.number(),
    name: z.string().optional(),
    title: z.string().optional(),
    mimetype: z.string().optional(),
    filetype: z.string().optional(),
    user: z.string(),
    permalink: z.string()
});

const CommentSchema = z.object({
    id: z.string(),
    created: z.number(),
    timestamp: z.number(),
    user: z.string(),
    comment: z.string()
});

const PinnedItemSchema = z.object({
    type: z.enum(['message', 'file', 'file_comment']),
    created: z.number().describe('Unix timestamp when the item was pinned'),
    created_by: z.string().describe('User ID who pinned the item'),
    channel: z.string().describe('Channel ID where the item is pinned'),
    message: MessageSchema.optional(),
    file: FileSchema.optional(),
    comment: CommentSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(PinnedItemSchema).describe('List of pinned items in the channel')
});

const action = createAction({
    description: 'List all items pinned in a specific channel',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/list-pins',
        group: 'Pins'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['pins:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/pins.list
        const response = await nango.get({
            endpoint: 'pins.list',
            params: {
                channel: input.channel_id
            },
            retries: 3
        });

        if (!response.data || !response.data.ok) {
            throw new nango.ActionError({
                type: 'slack_api_error',
                message: response.data?.error || 'Failed to list pinned items',
                channel_id: input.channel_id
            });
        }

        return {
            items: response.data.items || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
