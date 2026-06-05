import { createSync } from 'nango';
import { z } from 'zod';

const ProviderBalanceSchema = z.object({
    currency_code: z.string(),
    amount: z.string()
});

const ProviderGroupBalanceSchema = z.object({
    group_id: z.number(),
    balance: z.array(ProviderBalanceSchema)
});

const ProviderPictureSchema = z.object({
    small: z.string().optional().nullable(),
    medium: z.string().optional().nullable(),
    large: z.string().optional().nullable()
});

const ProviderFriendSchema = z.object({
    id: z.number(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    registration_status: z.string().optional().nullable(),
    picture: ProviderPictureSchema.optional().nullable(),
    custom_picture: z.boolean().optional().nullable(),
    balance: z.array(ProviderBalanceSchema).optional().nullable(),
    groups: z.array(ProviderGroupBalanceSchema).optional().nullable(),
    updated_at: z.string()
});

const ProviderResponseSchema = z.object({
    friends: z.array(ProviderFriendSchema)
});

const FriendSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    registration_status: z.string().optional(),
    picture: z
        .object({
            small: z.string().optional(),
            medium: z.string().optional(),
            large: z.string().optional()
        })
        .optional(),
    custom_picture: z.boolean().optional(),
    balance: z
        .array(
            z.object({
                currency_code: z.string(),
                amount: z.string()
            })
        )
        .optional(),
    groups: z
        .array(
            z.object({
                group_id: z.number(),
                balance: z.array(
                    z.object({
                        currency_code: z.string(),
                        amount: z.string()
                    })
                )
            })
        )
        .optional(),
    updated_at: z.string()
});

const sync = createSync({
    description: 'Sync friends from Splitwise',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Friend: FriendSchema
    },
    endpoints: [
        {
            path: '/syncs/friends',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Blocker: Splitwise get_friends does not document updated_after, cursor, limit,
        // or offset parameters, so the endpoint must be treated as a full refresh.
        await nango.trackDeletesStart('Friend');

        // https://dev.splitwise.com/#tag/friends/paths/~1get_friends/get
        const response = await nango.get({
            endpoint: '/api/v3.0/get_friends',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse friends response: ${parsed.error.message}`);
        }

        const friends = parsed.data.friends.map((record) => ({
            id: String(record.id),
            ...(record.first_name != null && { first_name: record.first_name }),
            ...(record.last_name != null && { last_name: record.last_name }),
            ...(record.email != null && { email: record.email }),
            ...(record.registration_status != null && { registration_status: record.registration_status }),
            ...(record.picture != null && {
                picture: {
                    ...(record.picture.small != null && { small: record.picture.small }),
                    ...(record.picture.medium != null && { medium: record.picture.medium }),
                    ...(record.picture.large != null && { large: record.picture.large })
                }
            }),
            ...(record.custom_picture != null && { custom_picture: record.custom_picture }),
            ...(record.balance != null && {
                balance: record.balance.map((b) => ({
                    currency_code: b.currency_code,
                    amount: b.amount
                }))
            }),
            ...(record.groups != null && {
                groups: record.groups.map((g) => ({
                    group_id: g.group_id,
                    balance: g.balance.map((b) => ({
                        currency_code: b.currency_code,
                        amount: b.amount
                    }))
                }))
            }),
            updated_at: record.updated_at
        }));

        if (friends.length > 0) {
            await nango.batchSave(friends, 'Friend');
        }

        await nango.trackDeletesEnd('Friend');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
