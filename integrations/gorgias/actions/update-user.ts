import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The ID of the user to update.'),
        name: z.string().optional().describe('Full name of the user.'),
        email: z.string().optional().describe('Email address of the user.'),
        bio: z.string().nullable().optional().describe('Short biography of the user.'),
        country: z.string().nullable().optional().describe('Country of the user in ISO 3166-1 alpha-2 format.'),
        external_id: z.string().optional().describe('ID of the user in a foreign system.'),
        language: z.string().nullable().optional().describe('Language of the user.'),
        meta: z
            .object({
                profile_picture_url: z.string().nullable().optional().describe('URL of the profile picture of the user.')
            })
            .passthrough()
            .optional()
            .describe('Data associated with the user.'),
        role: z
            .object({
                name: z.string().describe('Name of the role. Example: "admin"')
            })
            .optional()
            .describe('The role of the user.'),
        timezone: z.string().optional().describe('Timezone of the user.'),
        password_confirmation: z.string().optional().describe('Current password of the user. Required when changing the email.'),
        new_password: z.string().optional().describe('New password of the user.'),
        old_password: z.string().optional().describe('Current password of the user. Required when changing the password.'),
        two_fa_code: z.string().nullable().optional().describe('Two-factor authentication code.')
    })
    .describe('Input parameters for updating a Gorgias user.');

const ProviderUserSchema = z.object({
    id: z.number(),
    active: z.boolean().optional(),
    bio: z.string().nullable().optional(),
    created_datetime: z.string().optional(),
    country: z.string().nullable().optional(),
    deactivated_datetime: z.string().nullable().optional(),
    email: z.string().optional(),
    external_id: z.string().nullable().optional(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    language: z.string().nullable().optional(),
    meta: z
        .object({
            sso: z.string().nullable().optional(),
            profile_picture_url: z.string().nullable().optional()
        })
        .passthrough()
        .optional(),
    name: z.string().optional(),
    role: z
        .object({
            name: z.string().optional()
        })
        .optional(),
    timezone: z.string().optional(),
    updated_datetime: z.string().optional(),
    client_id: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the user.'),
        active: z.boolean().optional().describe('Whether the user can log in.'),
        bio: z.string().optional().describe('Short biography of the user.'),
        created_datetime: z.string().optional().describe('When the user was created.'),
        country: z.string().optional().describe('Country of the user.'),
        deactivated_datetime: z.string().optional().describe('When the user was deactivated.'),
        email: z.string().optional().describe('Email address of the user.'),
        external_id: z.string().optional().describe('ID of the user in a foreign system.'),
        firstname: z.string().optional().describe('First name of the user.'),
        lastname: z.string().optional().describe('Last name of the user.'),
        language: z.string().optional().describe('Language of the user.'),
        meta: z
            .object({
                sso: z.string().optional().describe('Name of the Single Sign-On provider.'),
                profile_picture_url: z.string().optional().describe('URL of the profile picture of the user.')
            })
            .passthrough()
            .optional()
            .describe('Data associated with the user.'),
        name: z.string().optional().describe('Full name of the user.'),
        role: z
            .object({
                name: z.string().optional().describe('Name of the role.')
            })
            .optional()
            .describe('The role of the user.'),
        timezone: z.string().optional().describe('Timezone of the user.'),
        updated_datetime: z.string().optional().describe('When the user was last updated.'),
        client_id: z.string().optional().describe('Service account associated application ID.')
    })
    .describe('The updated Gorgias user.');

/**
 * @tags: [write]
 * @tagReason: Mutates the user by updating their fields via the Gorgias API.
 * @pitfalls: Changing the email requires password_confirmation. Changing the password requires both old_password and new_password.
 */
const action = createAction({
    description: "Update a user's fields (name, email, role, bio, etc.).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.name !== undefined) {
            body['name'] = input.name;
        }
        if (input.email !== undefined) {
            body['email'] = input.email;
        }
        if (input.bio !== undefined) {
            body['bio'] = input.bio;
        }
        if (input.country !== undefined) {
            body['country'] = input.country;
        }
        if (input.external_id !== undefined) {
            body['external_id'] = input.external_id;
        }
        if (input.language !== undefined) {
            body['language'] = input.language;
        }
        if (input.meta !== undefined) {
            body['meta'] = input.meta;
        }
        if (input.role !== undefined) {
            body['role'] = input.role;
        }
        if (input.timezone !== undefined) {
            body['timezone'] = input.timezone;
        }
        if (input.password_confirmation !== undefined) {
            body['password_confirmation'] = input.password_confirmation;
        }
        if (input.new_password !== undefined) {
            body['new_password'] = input.new_password;
        }
        if (input.old_password !== undefined) {
            body['old_password'] = input.old_password;
        }
        if (input.two_fa_code !== undefined) {
            body['two_fa_code'] = input.two_fa_code;
        }

        const response = await nango.put({
            // https://developers.gorgias.com/reference/update-user
            endpoint: `/api/users/${encodeURIComponent(input.id)}`,
            data: body,
            retries: 3
        });

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            ...(providerUser.active !== undefined && { active: providerUser.active }),
            ...(providerUser.bio != null && { bio: providerUser.bio }),
            ...(providerUser.created_datetime !== undefined && { created_datetime: providerUser.created_datetime }),
            ...(providerUser.country != null && { country: providerUser.country }),
            ...(providerUser.deactivated_datetime != null && { deactivated_datetime: providerUser.deactivated_datetime }),
            ...(providerUser.email !== undefined && { email: providerUser.email }),
            ...(providerUser.external_id != null && { external_id: providerUser.external_id }),
            ...(providerUser.firstname !== undefined && { firstname: providerUser.firstname }),
            ...(providerUser.lastname !== undefined && { lastname: providerUser.lastname }),
            ...(providerUser.language != null && { language: providerUser.language }),
            ...(providerUser.meta !== undefined && {
                meta: {
                    ...(providerUser.meta.sso != null && { sso: providerUser.meta.sso }),
                    ...(providerUser.meta.profile_picture_url != null && { profile_picture_url: providerUser.meta.profile_picture_url }),
                    ...Object.fromEntries(Object.entries(providerUser.meta).filter(([key]) => key !== 'sso' && key !== 'profile_picture_url'))
                }
            }),
            ...(providerUser.name !== undefined && { name: providerUser.name }),
            ...(providerUser.role !== undefined && { role: providerUser.role }),
            ...(providerUser.timezone !== undefined && { timezone: providerUser.timezone }),
            ...(providerUser.updated_datetime !== undefined && { updated_datetime: providerUser.updated_datetime }),
            ...(providerUser.client_id != null && { client_id: providerUser.client_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
