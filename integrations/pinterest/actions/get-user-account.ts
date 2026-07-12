import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderUserAccountSchema = z.object({
    account_type: z.string().optional(),
    profile_image: z.string().optional(),
    website_url: z.string().optional(),
    username: z.string().optional()
});

const OutputSchema = z.object({
    account_type: z.string().optional(),
    profile_image: z.string().optional(),
    website_url: z.string().optional(),
    username: z.string().optional()
});

const action = createAction({
    description: 'Retrieve the connected user account profile.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_accounts:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/user_account/get
            endpoint: '/v5/user_account',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User account not found'
            });
        }

        const providerUser = ProviderUserAccountSchema.parse(response.data);

        return {
            ...(providerUser.account_type !== undefined && { account_type: providerUser.account_type }),
            ...(providerUser.profile_image !== undefined && { profile_image: providerUser.profile_image }),
            ...(providerUser.website_url !== undefined && { website_url: providerUser.website_url }),
            ...(providerUser.username !== undefined && { username: providerUser.username })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
