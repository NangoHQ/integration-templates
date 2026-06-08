import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Group ID. Example: 321')
});

const PictureSchema = z.object({
    small: z.string().nullable().optional(),
    medium: z.string().nullable().optional(),
    large: z.string().nullable().optional()
});

const BalanceSchema = z.object({
    currency_code: z.string(),
    amount: z.string()
});

const MemberSchema = z.object({
    id: z.number(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    registration_status: z.string().nullable().optional(),
    picture: PictureSchema.nullable().optional(),
    custom_picture: z.boolean().nullable().optional(),
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

const ProviderGroupSchema = z.object({
    id: z.number(),
    name: z.string(),
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

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
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

const action = createAction({
    description: 'Retrieve a single group from Splitwise.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-group',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://dev.splitwise.com/
            endpoint: `/api/v3.0/get_group/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Group not found',
                id: input.id
            });
        }

        const data = z
            .object({
                group: ProviderGroupSchema
            })
            .parse(response.data);

        return {
            id: data.group.id,
            name: data.group.name,
            ...(data.group.group_type !== undefined && { group_type: data.group.group_type }),
            ...(data.group.updated_at !== undefined && { updated_at: data.group.updated_at }),
            ...(data.group.simplify_by_default !== undefined && { simplify_by_default: data.group.simplify_by_default }),
            ...(data.group.members !== undefined && { members: data.group.members }),
            ...(data.group.original_debts !== undefined && { original_debts: data.group.original_debts }),
            ...(data.group.simplified_debts !== undefined && { simplified_debts: data.group.simplified_debts }),
            ...(data.group.avatar !== undefined && { avatar: data.group.avatar }),
            ...(data.group.custom_avatar !== undefined && { custom_avatar: data.group.custom_avatar }),
            ...(data.group.cover_photo !== undefined && { cover_photo: data.group.cover_photo }),
            ...(data.group.invite_link !== undefined && { invite_link: data.group.invite_link })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
