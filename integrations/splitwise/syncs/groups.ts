import { createSync } from 'nango';
import { z } from 'zod';

const BalanceSchema = z.object({
    currency_code: z.string(),
    amount: z.string()
});

const PictureSchema = z.object({
    small: z.string().optional(),
    medium: z.string().optional(),
    large: z.string().optional()
});

const MemberSchema = z.object({
    id: z.number(),
    first_name: z.string().optional(),
    last_name: z.string().nullable().optional(),
    email: z.string().optional(),
    registration_status: z.string().optional(),
    picture: PictureSchema.optional(),
    custom_picture: z.boolean().optional(),
    balance: z.array(BalanceSchema).optional()
});

const DebtSchema = z.object({
    from: z.number(),
    to: z.number(),
    amount: z.string(),
    currency_code: z.string()
});

const AvatarSchema = z.object({
    original: z.string().nullable().optional(),
    xxlarge: z.string().optional(),
    xlarge: z.string().optional(),
    large: z.string().optional(),
    medium: z.string().optional(),
    small: z.string().optional()
});

const CoverPhotoSchema = z.object({
    xxlarge: z.string().optional(),
    xlarge: z.string().optional()
});

const GroupSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    group_type: z.string().optional(),
    updated_at: z.string().optional(),
    simplify_by_default: z.boolean().optional(),
    members: z.array(MemberSchema).optional(),
    original_debts: z.array(DebtSchema).optional(),
    simplified_debts: z.array(DebtSchema).optional(),
    avatar: AvatarSchema.optional(),
    custom_avatar: z.boolean().optional(),
    cover_photo: CoverPhotoSchema.optional(),
    invite_link: z.string().optional()
});

const ProviderGroupSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    group_type: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    simplify_by_default: z.boolean().nullable().optional(),
    members: z.array(MemberSchema).optional(),
    original_debts: z.array(DebtSchema).optional(),
    simplified_debts: z.array(DebtSchema).optional(),
    avatar: AvatarSchema.nullable().optional(),
    custom_avatar: z.boolean().nullable().optional(),
    cover_photo: CoverPhotoSchema.nullable().optional(),
    invite_link: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    groups: z.array(ProviderGroupSchema)
});

const sync = createSync({
    description: 'Sync groups from Splitwise.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Group: GroupSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/groups'
        }
    ],

    exec: async (nango) => {
        // Blocker: Splitwise get_groups does not support updated_after, cursor, since_id,
        // or any other changed-since filter. It always returns the full list of groups.
        await nango.trackDeletesStart('Group');

        // https://dev.splitwise.com/#tag/groups/paths/~1get_groups/get
        const response = await nango.get({
            endpoint: '/api/v3.0/get_groups',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse groups response: ${parsed.error.message}`);
        }

        const groups = parsed.data.groups.map((record) => ({
            id: String(record.id),
            ...(record.name != null && { name: record.name }),
            ...(record.group_type != null && { group_type: record.group_type }),
            ...(record.updated_at != null && { updated_at: record.updated_at }),
            ...(record.simplify_by_default != null && { simplify_by_default: record.simplify_by_default }),
            ...(record.members != null && { members: record.members }),
            ...(record.original_debts != null && { original_debts: record.original_debts }),
            ...(record.simplified_debts != null && { simplified_debts: record.simplified_debts }),
            ...(record.avatar != null && { avatar: record.avatar }),
            ...(record.custom_avatar != null && { custom_avatar: record.custom_avatar }),
            ...(record.cover_photo != null && { cover_photo: record.cover_photo }),
            ...(record.invite_link != null && { invite_link: record.invite_link })
        }));

        if (groups.length > 0) {
            await nango.batchSave(groups, 'Group');
        }

        await nango.trackDeletesEnd('Group');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
