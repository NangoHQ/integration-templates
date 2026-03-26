import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('Slack channel ID to list members for. Example: "C0123456789"'),
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.'),
    limit: z.number().optional().describe('Maximum number of items to return. Default is 100, max is 1000.')
});

const OutputSchema = z.object({
    members: z.array(z.string()).describe('List of user IDs belonging to the conversation members'),
    next_cursor: z.string().optional().describe('Pagination cursor for next page, or omitted if no more results')
});

const action = createAction({
    description: 'List members in a Slack channel',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/get-channel-members',
        group: 'Conversations'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['channels:read', 'groups:read', 'im:read', 'mpim:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/conversations.members
        const config = {
            endpoint: 'conversations.members',
            params: {
                channel: input.channel_id,
                ...(input.cursor && { cursor: input.cursor }),
                ...(input.limit && { limit: input.limit.toString() })
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data.ok) {
            throw new nango.ActionError({
                type: 'api_error',
                message: response.data.error || 'Unknown error from Slack API',
                slack_error: response.data.error
            });
        }

        return {
            members: response.data.members || [],
            next_cursor: response.data.response_metadata?.next_cursor || undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
