import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_gid: z.string().describe('A string identifying a user. This can either be the string "me", an email, or the gid of a user. Example: "12345"')
});

const ProviderPhotoSchema = z
    .object({
        image_21x21: z.string().optional().nullable(),
        image_27x27: z.string().optional().nullable(),
        image_36x36: z.string().optional().nullable(),
        image_60x60: z.string().optional().nullable(),
        image_128x128: z.string().optional().nullable(),
        image_1024x1024: z.string().optional().nullable()
    })
    .optional()
    .nullable();

const ProviderUserSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    photo: ProviderPhotoSchema
});

const OutputSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    photo: ProviderPhotoSchema.optional()
});

const action = createAction({
    description: 'Fetch a single user by gid.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.asana.com/reference/getuser
            endpoint: `/api/1.0/users/${input.user_gid}`,
            params: {
                opt_fields: 'gid,resource_type,name,email,photo'
            },
            retries: 3
        });

        if (!response.data || !response.data.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                user_gid: input.user_gid
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data.data);

        return {
            gid: providerUser.gid,
            ...(providerUser.resource_type !== undefined && { resource_type: providerUser.resource_type }),
            ...(providerUser.name != null && { name: providerUser.name }),
            ...(providerUser.email != null && { email: providerUser.email }),
            ...(providerUser.photo != null && { photo: providerUser.photo })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
