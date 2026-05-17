import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderUserSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string(),
    type: z.number(),
    pmi: z.union([z.string(), z.number()]).optional(),
    timezone: z.string().optional(),
    dept: z.string().optional(),
    created_at: z.string().optional(),
    last_login_time: z.string().optional(),
    last_client_version: z.string().optional(),
    account_id: z.string().optional(),
    pic_url: z.string().optional(),
    status: z.string().optional(),
    group_ids: z.array(z.string()).optional(),
    im_group_ids: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string(),
    type: z.number(),
    pmi: z.string().optional(),
    timezone: z.string().optional(),
    dept: z.string().optional(),
    created_at: z.string().optional(),
    last_login_time: z.string().optional(),
    last_client_version: z.string().optional(),
    account_id: z.string().optional(),
    pic_url: z.string().optional(),
    status: z.string().optional(),
    group_ids: z.array(z.string()).optional(),
    im_group_ids: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Fetch the authenticated Zoom user profile.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-current-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.zoom.us/docs/api/rest/reference/user/methods/#operation/user
            endpoint: '/users/me',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User profile not found'
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            ...(providerUser.first_name !== undefined && { first_name: providerUser.first_name }),
            ...(providerUser.last_name !== undefined && { last_name: providerUser.last_name }),
            email: providerUser.email,
            type: providerUser.type,
            ...(providerUser.pmi !== undefined && { pmi: String(providerUser.pmi) }),
            ...(providerUser.timezone !== undefined && { timezone: providerUser.timezone }),
            ...(providerUser.dept !== undefined && { dept: providerUser.dept }),
            ...(providerUser.created_at !== undefined && { created_at: providerUser.created_at }),
            ...(providerUser.last_login_time !== undefined && { last_login_time: providerUser.last_login_time }),
            ...(providerUser.last_client_version !== undefined && { last_client_version: providerUser.last_client_version }),
            ...(providerUser.account_id !== undefined && { account_id: providerUser.account_id }),
            ...(providerUser.pic_url !== undefined && { pic_url: providerUser.pic_url }),
            ...(providerUser.status !== undefined && { status: providerUser.status }),
            ...(providerUser.group_ids !== undefined && { group_ids: providerUser.group_ids }),
            ...(providerUser.im_group_ids !== undefined && { im_group_ids: providerUser.im_group_ids })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
