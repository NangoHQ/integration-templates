import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    include_categories: z.boolean().optional().describe('Include a list of categories for Unicode emoji and the emoji in each category')
});

const EmojiSchema = z.object({
    name: z.string(),
    type: z.enum(['custom', 'alias']),
    url: z.string().optional(),
    alias_for: z.string().optional()
});

const OutputSchema = z.object({
    emoji: z.array(EmojiSchema),
    total_count: z.number()
});

const EmojiListResponseSchema = z.object({
    ok: z.boolean().optional(),
    error: z.string().optional(),
    emoji: z.record(z.string(), z.string()).optional()
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

        const data = EmojiListResponseSchema.parse(response.data);

        if (!data.ok) {
            throw new nango.ActionError({
                type: 'api_error',
                message: data.error || 'Failed to fetch emoji list'
            });
        }

        const emoji: z.infer<typeof EmojiSchema>[] = Object.entries(data.emoji || {}).map(([name, value]) => {
            if (value.startsWith('alias:')) {
                return {
                    name,
                    type: 'alias',
                    url: undefined,
                    alias_for: value.replace('alias:', '')
                };
            }

            return {
                name,
                type: 'custom',
                url: value,
                alias_for: undefined
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
