import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('TikTok advertiser ID. Example: "7644117588953235464"'),
    identity_id: z.string().describe('Identity ID. Example: "7644635848793210900"'),
    identity_type: z.string().optional().describe('Identity type. Enum values: CUSTOMIZED_USER, AUTH_CODE, TT_USER, BC_AUTH_TT')
});

const ProviderIdentitySchema = z.object({
    identity_id: z.string(),
    identity_type: z.string(),
    display_name: z.string().optional(),
    profile_image: z.string().optional(),
    identity_authorized_bc_id: z.string().nullable().optional(),
    available_status: z.string().nullable().optional(),
    can_pull_video: z.boolean().nullable().optional(),
    can_push_video: z.boolean().nullable().optional(),
    can_use_live_ads: z.boolean().nullable().optional(),
    can_manage_message: z.boolean().nullable().optional()
});

const OutputSchema = z.object({
    identity_id: z.string(),
    identity_type: z.string(),
    display_name: z.string().optional(),
    profile_image: z.string().optional(),
    identity_authorized_bc_id: z.string().optional(),
    available_status: z.string().optional(),
    can_pull_video: z.boolean().optional(),
    can_push_video: z.boolean().optional(),
    can_use_live_ads: z.boolean().optional(),
    can_manage_message: z.boolean().optional()
});

const TikTokResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string(),
    data: z.object({
        identity_list: z.array(z.unknown())
    })
});

const action = createAction({
    description: 'Retrieve a TikTok user identity by identity ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs/api-reference/v1.3
            endpoint: '/identity/get/',
            params: {
                advertiser_id: input.advertiser_id,
                identity_id: input.identity_id,
                ...(input.identity_type !== undefined && { identity_type: input.identity_type })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const apiResponse = TikTokResponseSchema.safeParse(response.data);
        if (!apiResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response structure from TikTok API'
            });
        }

        if (apiResponse.data.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: apiResponse.data.message,
                code: apiResponse.data.code
            });
        }

        for (const item of apiResponse.data.data.identity_list) {
            const itemResult = z.object({ identity_id: z.unknown() }).safeParse(item);
            if (itemResult.success && itemResult.data.identity_id === input.identity_id) {
                const providerIdentity = ProviderIdentitySchema.parse(item);
                return {
                    identity_id: providerIdentity.identity_id,
                    identity_type: providerIdentity.identity_type,
                    ...(providerIdentity.display_name !== undefined && { display_name: providerIdentity.display_name }),
                    ...(providerIdentity.profile_image !== undefined && { profile_image: providerIdentity.profile_image }),
                    ...(providerIdentity.identity_authorized_bc_id !== undefined &&
                        providerIdentity.identity_authorized_bc_id !== null && {
                            identity_authorized_bc_id: providerIdentity.identity_authorized_bc_id
                        }),
                    ...(providerIdentity.available_status !== undefined &&
                        providerIdentity.available_status !== null && {
                            available_status: providerIdentity.available_status
                        }),
                    ...(providerIdentity.can_pull_video !== undefined &&
                        providerIdentity.can_pull_video !== null && {
                            can_pull_video: providerIdentity.can_pull_video
                        }),
                    ...(providerIdentity.can_push_video !== undefined &&
                        providerIdentity.can_push_video !== null && {
                            can_push_video: providerIdentity.can_push_video
                        }),
                    ...(providerIdentity.can_use_live_ads !== undefined &&
                        providerIdentity.can_use_live_ads !== null && {
                            can_use_live_ads: providerIdentity.can_use_live_ads
                        }),
                    ...(providerIdentity.can_manage_message !== undefined &&
                        providerIdentity.can_manage_message !== null && {
                            can_manage_message: providerIdentity.can_manage_message
                        })
                };
            }
        }

        throw new nango.ActionError({
            type: 'not_found',
            message: `Identity not found: ${input.identity_id}`
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
