import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('User ID of the friend. Example: 123')
});

const PictureSchema = z.object({
    small: z.string().optional(),
    medium: z.string().optional(),
    large: z.string().optional()
});

const BalanceSchema = z.object({
    currency_code: z.string(),
    amount: z.string()
});

const GroupBalanceSchema = z.object({
    group_id: z.number(),
    balance: z.array(BalanceSchema)
});

const ProviderFriendSchema = z.object({
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

const OutputSchema = ProviderFriendSchema;

const action = createAction({
    description: 'Retrieve a single friend from Splitwise.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-friend',
        group: 'Friends'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://dev.splitwise.com/
        const response = await nango.get({
            endpoint: `/api/v3.0/get_friend/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Splitwise API'
            });
        }

        const providerResponse = z
            .object({
                friend: ProviderFriendSchema
            })
            .parse(raw);

        return providerResponse.friend;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
