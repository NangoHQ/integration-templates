import { z } from 'zod';
import { createAction } from 'nango';

const GroupUserInputSchema = z
    .object({
        user_id: z.number().optional().describe('User ID of an existing user to add. Example: 5823'),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        email: z.string().optional()
    })
    .refine((user) => user.user_id !== undefined || user.email !== undefined, {
        message: 'Each user must have either user_id or email.'
    });

const InputSchema = z.object({
    name: z.string().describe('Group name. Example: "The Brain Trust"'),
    group_type: z.enum(['home', 'trip', 'couple', 'other', 'apartment', 'house']).optional().describe('What is the group used for?'),
    simplify_by_default: z.boolean().optional().describe('Turn on simplify debts?'),
    users: z.array(GroupUserInputSchema).optional().describe('Users to add to the group. The current user is added by default.')
});

const PictureSchema = z
    .object({
        small: z.string().optional(),
        medium: z.string().optional(),
        large: z.string().optional()
    })
    .passthrough();

const UserSchema = z
    .object({
        id: z.number(),
        first_name: z.string().nullish(),
        last_name: z.string().nullish(),
        email: z.string().nullish(),
        registration_status: z.string().nullish(),
        picture: PictureSchema.nullish(),
        custom_picture: z.boolean().nullish(),
        balance: z
            .array(
                z.object({
                    currency_code: z.string(),
                    amount: z.string()
                })
            )
            .nullish()
    })
    .passthrough();

const DebtSchema = z.object({
    from: z.number(),
    to: z.number(),
    amount: z.string(),
    currency_code: z.string()
});

const AvatarSchema = z
    .object({
        original: z.string().nullable().optional(),
        xxlarge: z.string().optional(),
        xlarge: z.string().optional(),
        large: z.string().optional(),
        medium: z.string().optional(),
        small: z.string().optional()
    })
    .passthrough();

const CoverPhotoSchema = z
    .object({
        xxlarge: z.string().optional(),
        xlarge: z.string().optional()
    })
    .passthrough();

const ProviderGroupSchema = z.object({
    id: z.number(),
    name: z.string(),
    group_type: z.string().nullish(),
    updated_at: z.string().nullish(),
    simplify_by_default: z.boolean().nullish(),
    members: z.array(UserSchema).nullish(),
    original_debts: z.array(DebtSchema).nullish(),
    simplified_debts: z.array(DebtSchema).nullish(),
    avatar: AvatarSchema.nullish(),
    custom_avatar: z.boolean().nullish(),
    cover_photo: CoverPhotoSchema.nullish(),
    invite_link: z.string().nullish()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    group_type: z.string().optional(),
    updated_at: z.string().optional(),
    simplify_by_default: z.boolean().optional(),
    members: z.array(UserSchema).optional(),
    original_debts: z.array(DebtSchema).optional(),
    simplified_debts: z.array(DebtSchema).optional(),
    avatar: AvatarSchema.optional(),
    custom_avatar: z.boolean().optional(),
    cover_photo: CoverPhotoSchema.optional(),
    invite_link: z.string().optional()
});

const action = createAction({
    description: 'Create a group in Splitwise.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            name: input.name
        };

        if (input.group_type !== undefined) {
            data['group_type'] = input.group_type;
        }

        if (input.simplify_by_default !== undefined) {
            data['simplify_by_default'] = input.simplify_by_default;
        }

        if (input.users) {
            for (const [index, user] of input.users.entries()) {
                if (user.first_name !== undefined) {
                    data[`users__${index}__first_name`] = user.first_name;
                }
                if (user.last_name !== undefined) {
                    data[`users__${index}__last_name`] = user.last_name;
                }
                if (user.email !== undefined) {
                    data[`users__${index}__email`] = user.email;
                }
                if (user.user_id !== undefined) {
                    data[`users__${index}__user_id`] = user.user_id;
                }
            }
        }

        const response = await nango.post({
            // https://dev.splitwise.com/
            endpoint: '/api/v3.0/create_group',
            data,
            retries: 10
        });

        const body = z.object({ group: z.unknown() }).parse(response.data);
        const providerGroup = ProviderGroupSchema.parse(body.group);

        const avatar = providerGroup.avatar ? { ...providerGroup.avatar } : undefined;
        if (avatar && avatar.original === null) {
            delete avatar.original;
        }

        const coverPhoto = providerGroup.cover_photo ? { ...providerGroup.cover_photo } : undefined;

        return {
            id: providerGroup.id,
            name: providerGroup.name,
            ...(providerGroup.group_type != null && { group_type: providerGroup.group_type }),
            ...(providerGroup.updated_at != null && { updated_at: providerGroup.updated_at }),
            ...(providerGroup.simplify_by_default != null && { simplify_by_default: providerGroup.simplify_by_default }),
            ...(providerGroup.members != null && { members: providerGroup.members }),
            ...(providerGroup.original_debts != null && { original_debts: providerGroup.original_debts }),
            ...(providerGroup.simplified_debts != null && { simplified_debts: providerGroup.simplified_debts }),
            ...(avatar !== undefined && { avatar }),
            ...(providerGroup.custom_avatar != null && { custom_avatar: providerGroup.custom_avatar }),
            ...(coverPhoto !== undefined && { cover_photo: coverPhoto }),
            ...(providerGroup.invite_link != null && { invite_link: providerGroup.invite_link })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
