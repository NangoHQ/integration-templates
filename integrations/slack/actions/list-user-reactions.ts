/**
 * Instructions: Lists all items with reactions made by the user
 * API: https://api.slack.com/methods/reactions.list
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const Input = z.object({
    limit: z.number().optional().describe('Maximum number of items to return. Default: 100'),
    cursor: z.string().optional().describe('Pagination cursor from previous response')
});

const SlackReactionSchema = z.object({
    name: z.string(),
    users: z.array(z.string()),
    count: z.number()
});

const SlackReactedMessageSchema = z.object({
    type: z.string(),
    text: z.string().optional(),
    user: z.string().optional(),
    ts: z.string().optional(),
    reactions: z.array(SlackReactionSchema).optional()
});

const SlackReactedItemSchema = z.object({
    type: z.string(),
    channel: z.string().optional(),
    message: SlackReactedMessageSchema.optional()
});

const ResponseMetadataSchema = z.object({
    next_cursor: z.string().optional()
});

const Output = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    items: z.array(SlackReactedItemSchema).describe('Array of items the user has reacted to'),
    response_metadata: ResponseMetadataSchema.describe('Pagination metadata including next_cursor')
});

const action = createAction({
    description: 'Lists all items with reactions made by the user.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/list-user-reactions',
        group: 'Actions'
    },
    input: Input,
    output: Output,
    scopes: ['reactions:read'],
    exec: async (nango, input): Promise<z.infer<typeof Output>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/reactions.list
            endpoint: 'reactions.list',
            params: {
                ...(input.limit && { limit: input.limit.toString() }),
                ...(input.cursor && { cursor: input.cursor })
            },
            retries: 3
        };
        const response = await nango.get(config);
        return {
            ok: response.data.ok,
            items: response.data.items,
            response_metadata: response.data.response_metadata
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
