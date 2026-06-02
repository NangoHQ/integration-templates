import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string(),
    handle: z.string(),
    img_url: z.string().optional()
});

const action = createAction({
    description: 'Fetch the current Figma user.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-current-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['current_user:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.figma.com/developers/api#get-me-endpoint
            endpoint: '/v1/me',
            retries: 3
        };

        const response = await nango.get(config);

        const providerUser = z
            .object({
                id: z.string(),
                email: z.string(),
                handle: z.string(),
                img_url: z.string().optional()
            })
            .parse(response.data);

        return {
            id: providerUser.id,
            email: providerUser.email,
            handle: providerUser.handle,
            ...(providerUser.img_url !== undefined && { img_url: providerUser.img_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
