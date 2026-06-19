import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_email: z.string().email().describe('Email address of the friend to add. Example: "ada@example.com"'),
    user_first_name: z.string().describe('First name of the friend. Example: "Ada"'),
    user_last_name: z.string().optional().describe('Last name of the friend. Example: "Lovelace"')
});

const PictureSchema = z.object({
    small: z.string().optional(),
    medium: z.string().optional(),
    large: z.string().optional()
});

const BalanceSchema = z.object({
    currency_code: z.string().optional(),
    amount: z.string().optional()
});

const ProviderFriendSchema = z.object({
    id: z.number(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    email: z.string().optional(),
    registration_status: z.string().optional(),
    picture: PictureSchema.nullable().optional(),
    custom_picture: z.boolean().optional(),
    groups: z
        .array(
            z.object({
                group_id: z.number(),
                balance: z.array(BalanceSchema)
            })
        )
        .optional(),
    balance: z.array(BalanceSchema).optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    registration_status: z.string().optional(),
    picture: PictureSchema.optional(),
    custom_picture: z.boolean().optional(),
    groups: z
        .array(
            z.object({
                group_id: z.number(),
                balance: z.array(BalanceSchema)
            })
        )
        .optional(),
    balance: z.array(BalanceSchema).optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Create a friend in Splitwise',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        const response = await nango.post({
            // https://dev.splitwise.com/#tag/friends/paths/~1create_friend/post
            endpoint: '/api/v3.0/create_friend',
            data: {
                user_email: input.user_email,
                user_first_name: input.user_first_name,
                ...(input.user_last_name !== undefined && { user_last_name: input.user_last_name })
            },
            retries: 3
        });

        const providerResponse = z.object({ friend: ProviderFriendSchema }).parse(response.data);
        const friend = providerResponse.friend;

        return {
            id: friend.id,
            ...(friend.first_name != null && { first_name: friend.first_name }),
            ...(friend.last_name != null && { last_name: friend.last_name }),
            ...(friend.email !== undefined && { email: friend.email }),
            ...(friend.registration_status !== undefined && { registration_status: friend.registration_status }),
            ...(friend.picture != null && { picture: friend.picture }),
            ...(friend.custom_picture !== undefined && { custom_picture: friend.custom_picture }),
            ...(friend.groups !== undefined && { groups: friend.groups }),
            ...(friend.balance !== undefined && { balance: friend.balance }),
            ...(friend.updated_at !== undefined && { updated_at: friend.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
