import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const UserAccountResponseSchema = z.object({
    username: z.string()
});

const InterestItemSchema = z.object({
    canonical_url: z.string().optional(),
    id: z.string(),
    key: z.string().optional(),
    name: z.string().optional()
});

const InterestsResponseSchema = z.object({
    items: z.array(z.unknown()),
    bookmark: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(InterestItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List interests the user follows.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_accounts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pinterest.com/docs/api/v5/#operation/user_account/get
        const userResponse = await nango.get({
            endpoint: '/v5/user_account',
            retries: 3
        });

        const userAccount = UserAccountResponseSchema.parse(userResponse.data);

        // https://developers.pinterest.com/docs/api/v5/#operation/user_account/followed_interests
        const interestsResponse = await nango.get({
            endpoint: `/v5/users/${encodeURIComponent(userAccount.username)}/interests/follow`,
            params: {
                ...(input.cursor !== undefined && { bookmark: input.cursor })
            },
            retries: 3
        });

        const interestsData = InterestsResponseSchema.parse(interestsResponse.data);

        const items = interestsData.items.map((item: unknown) => {
            const parsed = InterestItemSchema.parse(item);
            return {
                id: parsed.id,
                ...(parsed.canonical_url !== undefined && { canonical_url: parsed.canonical_url }),
                ...(parsed.key !== undefined && { key: parsed.key }),
                ...(parsed.name !== undefined && { name: parsed.name })
            };
        });

        const next_cursor = interestsData.bookmark ?? undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
