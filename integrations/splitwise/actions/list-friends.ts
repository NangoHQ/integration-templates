import { z } from 'zod';
import { createAction } from 'nango';

const BalanceSchema = z.object({
    currency_code: z.string(),
    amount: z.string()
});

const GroupBalanceSchema = z.object({
    group_id: z.number(),
    balance: z.array(BalanceSchema)
});

const PictureSchema = z.object({
    small: z.string().optional(),
    medium: z.string().optional(),
    large: z.string().optional()
});

const ProviderFriendSchema = z.object({
    id: z.number(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    email: z.string().optional(),
    registration_status: z.string().optional(),
    picture: PictureSchema.optional(),
    custom_picture: z.boolean().optional(),
    groups: z.array(GroupBalanceSchema).optional(),
    balance: z.array(BalanceSchema).optional(),
    updated_at: z.string().optional()
});

const ProviderResponseSchema = z.object({
    friends: z.array(ProviderFriendSchema)
});

const InputSchema = z.object({});

const OutputFriendSchema = z.object({
    id: z.number(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    registration_status: z.string().optional(),
    picture: PictureSchema.optional(),
    custom_picture: z.boolean().optional(),
    groups: z.array(GroupBalanceSchema).optional(),
    balance: z.array(BalanceSchema).optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    friends: z.array(OutputFriendSchema)
});

const action = createAction({
    description: 'List friends from Splitwise.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://dev.splitwise.com/#tag/friends/paths/~1get_friends/get
        const response = await nango.get({
            endpoint: '/api/v3.0/get_friends',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            friends: providerResponse.friends.map((friend) => ({
                id: friend.id,
                ...(friend.first_name != null && { first_name: friend.first_name }),
                ...(friend.last_name != null && { last_name: friend.last_name }),
                ...(friend.email !== undefined && { email: friend.email }),
                ...(friend.registration_status !== undefined && { registration_status: friend.registration_status }),
                ...(friend.picture !== undefined && { picture: friend.picture }),
                ...(friend.custom_picture !== undefined && { custom_picture: friend.custom_picture }),
                ...(friend.groups !== undefined && { groups: friend.groups }),
                ...(friend.balance !== undefined && { balance: friend.balance }),
                ...(friend.updated_at !== undefined && { updated_at: friend.updated_at })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
