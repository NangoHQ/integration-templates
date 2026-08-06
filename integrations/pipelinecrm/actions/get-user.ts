import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('User ID. Example: "843757"')
});

const ProviderUserSchema = z.object({ api_key: z.unknown() }).passthrough();

const OutputSchema = z.object({}).passthrough();

const action = createAction({
    description: 'Get a single user by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `/api/v3/admin/users/${encodeURIComponent(input.user_id)}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                user_id: input.user_id
            });
        }

        const { api_key: _apiKey, ...user } = ProviderUserSchema.parse(response.data);

        return OutputSchema.parse(user);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
