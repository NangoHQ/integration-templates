import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({});

const PictureSchema = z.object({
    small: z.string().optional(),
    medium: z.string().optional(),
    large: z.string().optional()
});

const BalanceSchema = z.object({
    currency_code: z.string().optional(),
    amount: z.string().optional()
});

const MemberSchema = z.object({
    id: z.number(),
    first_name: z.string().optional(),
    last_name: z.union([z.string(), z.null()]).optional(),
    email: z.string().optional(),
    registration_status: z.string().optional(),
    picture: PictureSchema.optional(),
    custom_picture: z.boolean().optional(),
    balance: z.array(BalanceSchema).optional()
});

const DebtSchema = z.object({
    from: z.number().optional(),
    to: z.number().optional(),
    amount: z.string().optional(),
    currency_code: z.string().optional()
});

const AvatarSchema = z.object({
    original: z.union([z.string(), z.null()]).optional(),
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
    id: z.number(),
    name: z.string().optional(),
    group_type: z.union([z.string(), z.null()]).optional(),
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
    groups: z.array(GroupSchema)
});

const action = createAction({
    description: 'List groups from Splitwise.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-groups',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://dev.splitwise.com/#tag/groups/paths/~1get_groups/get
            endpoint: '/api/v3.0/get_groups',
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = z
            .object({
                groups: z.array(z.unknown())
            })
            .parse(response.data);

        return {
            groups: providerResponse.groups.map((group) => GroupSchema.parse(group))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
