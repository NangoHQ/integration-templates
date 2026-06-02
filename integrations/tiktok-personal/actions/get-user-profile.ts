import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({});

const ProviderUserSchema = z.object({
    bio_description: z.string().optional().nullable(),
    profile_deep_link: z.string().optional().nullable(),
    is_verified: z.boolean().optional().nullable()
});

const OutputSchema = z.object({
    bio_description: z.string().optional(),
    profile_deep_link: z.string().optional(),
    is_verified: z.boolean().optional()
});

const TikTokResponseSchema = z.object({
    data: z
        .object({
            user: ProviderUserSchema
        })
        .optional(),
    error: z
        .object({
            code: z.string().optional(),
            message: z.string().optional(),
            log_id: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Fetch extended TikTok user profile including bio description, profile deep link, and verification status.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-user-profile',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user.info.profile'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info
            endpoint: '/v2/user/info/',
            params: {
                fields: 'bio_description,profile_deep_link,is_verified'
            },
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = TikTokResponseSchema.parse(response.data);

        if (parsed.error?.code && parsed.error.code !== 'ok') {
            throw new nango.ActionError({
                type: 'api_error',
                message: `TikTok API error: ${parsed.error.code} - ${parsed.error.message ?? ''}`
            });
        }

        const user = parsed.data?.user;
        if (!user) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User profile not found'
            });
        }

        return {
            ...(user.bio_description != null && { bio_description: user.bio_description }),
            ...(user.profile_deep_link != null && { profile_deep_link: user.profile_deep_link }),
            ...(user.is_verified != null && { is_verified: user.is_verified })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
