import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const LinkedBusinessSchema = z.object({
    image_large_url: z.string().optional(),
    image_medium_url: z.string().optional(),
    image_small_url: z.string().optional(),
    image_xlarge_url: z.string().optional(),
    username: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(LinkedBusinessSchema)
});

const action = createAction({
    description: 'List businesses linked to the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_accounts:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/linked_business_accounts/get
            endpoint: '/v5/user_account/businesses',
            retries: 3
        });

        const parsed = z.array(LinkedBusinessSchema).parse(response.data);

        return {
            items: parsed
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
