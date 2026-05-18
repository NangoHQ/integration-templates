import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The ID of the user. Example: "123"')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    login: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
    space_amount: z.number().optional(),
    space_used: z.number().optional(),
    max_upload_size: z.number().optional(),
    status: z.string().optional(),
    job_title: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    avatar_url: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    login: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
    space_amount: z.number().optional(),
    space_used: z.number().optional(),
    max_upload_size: z.number().optional(),
    status: z.string().optional(),
    job_title: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    avatar_url: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single user from Box',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.box.com/reference/get-users-id/
        const response = await nango.get({
            endpoint: `/2.0/users/${input.user_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                user_id: input.user_id
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            ...(providerUser.name !== undefined && { name: providerUser.name }),
            ...(providerUser.login !== undefined && { login: providerUser.login }),
            ...(providerUser.created_at !== undefined && { created_at: providerUser.created_at }),
            ...(providerUser.modified_at !== undefined && { modified_at: providerUser.modified_at }),
            ...(providerUser.timezone !== undefined && { timezone: providerUser.timezone }),
            ...(providerUser.language !== undefined && { language: providerUser.language }),
            ...(providerUser.space_amount !== undefined && { space_amount: providerUser.space_amount }),
            ...(providerUser.space_used !== undefined && { space_used: providerUser.space_used }),
            ...(providerUser.max_upload_size !== undefined && { max_upload_size: providerUser.max_upload_size }),
            ...(providerUser.status !== undefined && { status: providerUser.status }),
            ...(providerUser.job_title !== undefined && { job_title: providerUser.job_title }),
            ...(providerUser.phone !== undefined && { phone: providerUser.phone }),
            ...(providerUser.address !== undefined && { address: providerUser.address }),
            ...(providerUser.avatar_url !== undefined && { avatar_url: providerUser.avatar_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
