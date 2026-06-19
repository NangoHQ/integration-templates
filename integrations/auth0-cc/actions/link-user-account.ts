import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        primary_user_id: z.string().describe('ID of the primary user account to link a second account to. Example: "auth0|123"'),
        link_with: z.string().optional().describe('JWT for the secondary account being linked. If provided, provider and user_id must not be sent.'),
        provider: z.string().optional().describe('Identity provider of the secondary user account being linked. Example: "auth0"'),
        user_id: z.string().optional().describe('user_id of the secondary user account being linked.'),
        connection_id: z
            .string()
            .optional()
            .describe('connection_id of the secondary user account being linked when more than one auth0 database provider exists.')
    })
    .refine(
        (data) => {
            if (data.link_with) {
                return !data.provider && !data.user_id && !data.connection_id;
            }
            return Boolean(data.provider && data.user_id);
        },
        {
            message: 'Must provide either link_with, or both provider and user_id. connection_id is only allowed with provider and user_id.',
            path: ['link_with']
        }
    );

const ProfileDataSchema = z
    .object({
        email: z.string().optional(),
        email_verified: z.boolean().optional(),
        name: z.string().optional(),
        username: z.string().optional(),
        given_name: z.string().optional(),
        phone_number: z.string().optional(),
        phone_verified: z.boolean().optional(),
        family_name: z.string().optional()
    })
    .optional();

const IdentitySchema = z.object({
    connection: z.string(),
    user_id: z.string(),
    provider: z.string(),
    profileData: ProfileDataSchema,
    isSocial: z.boolean().optional(),
    access_token: z.string().optional(),
    access_token_secret: z.string().optional(),
    refresh_token: z.string().optional()
});

const OutputSchema = z.array(IdentitySchema);

const action = createAction({
    description: 'Link a secondary user account to a primary account in Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['update:users'],

    exec: async (nango, input) => {
        const body: Record<string, unknown> = {};
        if (input['link_with']) {
            body['link_with'] = input['link_with'];
        } else {
            if (input['provider']) {
                body['provider'] = input['provider'];
            }
            if (input['user_id']) {
                body['user_id'] = input['user_id'];
            }
            if (input['connection_id']) {
                body['connection_id'] = input['connection_id'];
            }
        }

        const response = await nango.post({
            // https://auth0.com/docs/api/management/v2/users/post-identities
            endpoint: `/api/v2/users/${encodeURIComponent(input.primary_user_id)}/identities`,
            data: body,
            retries: 10
        });

        const identities = OutputSchema.parse(response.data);
        return identities;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
