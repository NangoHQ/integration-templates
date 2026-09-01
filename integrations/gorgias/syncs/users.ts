import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const GorgiasUserSchema = z
    .object({
        id: z.string().describe('ID of the user.'),
        active: z.boolean().describe('Whether the user can log in.'),
        bio: z.string().optional().describe('Short biography of the user.'),
        created_datetime: z.string().describe('When the user was created.'),
        country: z.string().optional().describe('Country of the user in ISO 3166-1 alpha-2 format.'),
        deactivated_datetime: z.string().optional().describe('When the user was deactivated.'),
        email: z.string().describe('Email address of the user.'),
        external_id: z.string().optional().describe('ID of the user in a foreign system.'),
        firstname: z.string().optional().describe('First name of the user.'),
        lastname: z.string().optional().describe('Last name of the user.'),
        language: z.string().optional().describe('Language of the user.'),
        meta: z
            .object({
                sso: z.string().optional().describe('Name of the Single Sign-On provider the user can use to log in.'),
                profile_picture_url: z.string().optional().describe('URL of the profile picture of the user.')
            })
            .optional()
            .describe('Data associated with the user.'),
        name: z.string().describe('Full name of the user.'),
        role: z
            .object({
                name: z.string().describe('Name of the role.')
            })
            .describe('The role of the user.'),
        timezone: z.string().optional().describe('Timezone of the user.'),
        updated_datetime: z.string().describe('When the user was last updated.'),
        client_id: z.string().optional().describe('Service account associated application ID.')
    })
    .describe('Users represent people working for your company. They can be support agents, support specialists, support managers, directors, etc...');

const ProviderUserSchema = z.object({
    id: z.number(),
    active: z.boolean(),
    bio: z.string().nullable().optional(),
    created_datetime: z.string(),
    country: z.string().nullable().optional(),
    deactivated_datetime: z.string().nullable().optional(),
    email: z.string(),
    external_id: z.string().nullable().optional(),
    firstname: z.string().nullable().optional(),
    lastname: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    meta: z
        .object({
            sso: z.string().nullable().optional(),
            profile_picture_url: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    name: z.string(),
    role: z.object({
        name: z.string()
    }),
    timezone: z.string().nullable().optional(),
    updated_datetime: z.string(),
    client_id: z.string().nullable().optional()
});

const sync = createSync({
    description: 'Sync users (agents/admins/bots).',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        GorgiasUser: GorgiasUserSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('GorgiasUser');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/list-users
            endpoint: '/api/users',
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.next_cursor',
                cursor_name_in_request: 'cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 30
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const users = page.map((rawUser) => {
                const parsed = ProviderUserSchema.safeParse(rawUser);
                if (!parsed.success) {
                    throw new Error(`Failed to parse user: ${parsed.error.message}`);
                }
                const user = parsed.data;
                return {
                    id: String(user.id),
                    active: user.active,
                    bio: user.bio ?? undefined,
                    created_datetime: user.created_datetime,
                    country: user.country ?? undefined,
                    deactivated_datetime: user.deactivated_datetime ?? undefined,
                    email: user.email,
                    external_id: user.external_id ?? undefined,
                    firstname: user.firstname ?? undefined,
                    lastname: user.lastname ?? undefined,
                    language: user.language ?? undefined,
                    meta: user.meta
                        ? {
                              sso: user.meta.sso ?? undefined,
                              profile_picture_url: user.meta.profile_picture_url ?? undefined
                          }
                        : undefined,
                    name: user.name,
                    role: { name: user.role.name },
                    timezone: user.timezone ?? undefined,
                    updated_datetime: user.updated_datetime,
                    client_id: user.client_id ?? undefined
                };
            });

            if (users.length > 0) {
                await nango.batchSave(users, 'GorgiasUser');
            }
        }

        await nango.trackDeletesEnd('GorgiasUser');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
