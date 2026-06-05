import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderPictureSchema = z.object({
    small: z.string(),
    medium: z.string(),
    large: z.string()
});

const ProviderNotificationsSchema = z.object({
    added_as_friend: z.boolean().optional()
});

const ProviderUserSchema = z.object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    registration_status: z.string(),
    picture: ProviderPictureSchema,
    custom_picture: z.boolean(),
    notifications_read: z.string().optional().nullable(),
    notifications_count: z.number().optional().nullable(),
    notifications: ProviderNotificationsSchema.optional().nullable(),
    default_currency: z.string().optional().nullable(),
    locale: z.string().optional().nullable()
});

const ProviderResponseSchema = z.object({
    user: ProviderUserSchema
});

const OutputSchema = z.object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    registration_status: z.string(),
    picture: z.object({
        small: z.string(),
        medium: z.string(),
        large: z.string()
    }),
    custom_picture: z.boolean(),
    notifications_read: z.string().optional(),
    notifications_count: z.number().optional(),
    notifications: z
        .object({
            added_as_friend: z.boolean().optional()
        })
        .optional(),
    default_currency: z.string().optional(),
    locale: z.string().optional()
});

const action = createAction({
    description: 'Fetch the current Splitwise user.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-current-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://dev.splitwise.com/#tag/users/paths/~1get_current_user/get
            endpoint: '/api/v3.0/get_current_user',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const user = providerResponse.user;

        return {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            registration_status: user.registration_status,
            picture: {
                small: user.picture.small,
                medium: user.picture.medium,
                large: user.picture.large
            },
            custom_picture: user.custom_picture,
            ...(user.notifications_read != null && { notifications_read: user.notifications_read }),
            ...(user.notifications_count != null && { notifications_count: user.notifications_count }),
            ...(user.notifications != null && {
                notifications: {
                    ...(user.notifications.added_as_friend != null && { added_as_friend: user.notifications.added_as_friend })
                }
            }),
            ...(user.default_currency != null && { default_currency: user.default_currency }),
            ...(user.locale != null && { locale: user.locale })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
