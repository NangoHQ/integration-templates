import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    include_categories: z.boolean().optional().describe('Include a list of categories for Unicode emoji and the emoji in each category')
});

const EmojiSchema = z.object({
    name: z.string(),
    type: z.enum(['custom', 'alias']),
    url: z.union([z.string(), z.null()]),
    alias_for: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    emoji: z.array(EmojiSchema),
    total_count: z.number()
});

const action = createAction({
    description: 'List workspace custom emoji mappings, including alias-based emoji entries',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-custom-emoji',
        group: 'Emoji'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['emoji:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/emoji.list
        const response = await nango.get({
            endpoint: 'emoji.list',
            params: {
                ...(input.include_categories && { include_categories: String(input.include_categories) })
            },
            retries: 3
        });

        if (!response.data?.ok) {
            throw new nango.ActionError({
                type: 'api_error',
                message: response.data?.error || 'Failed to fetch emoji list'
            });
        }

        const emojiMap: Record<string, string> = response.data.emoji || {};

        const emoji = Object.entries(emojiMap).map(([name, value]) => {
            if (value.startsWith('alias:')) {
                return {
                    name,
                    type: 'alias' as const,
                    url: null,
                    alias_for: value.replace('alias:', '')
                };
            }

            return {
                name,
                type: 'custom' as const,
                url: value,
                alias_for: null
            };
        });

        return {
            emoji,
            total_count: emoji.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
