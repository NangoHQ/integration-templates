import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('The sys_id of the user record to retrieve. Example: "4896c3f9c3ca0310c5a8fc0d05013151"')
});

const ProviderUserSchema = z
    .object({
        sys_id: z.string(),
        user_name: z.string().optional().nullable(),
        first_name: z.string().optional().nullable(),
        last_name: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        active: z.string().optional().nullable(),
        sys_created_on: z.string().optional().nullable(),
        sys_updated_on: z.string().optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    sys_id: z.string(),
    user_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    active: z.string().optional(),
    sys_created_on: z.string().optional(),
    sys_updated_on: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table/sys_user/{sys_id}
            endpoint: `/api/now/table/sys_user/${encodeURIComponent(input.sys_id)}`,
            retries: 3
        });

        const providerResponse = z
            .object({
                result: ProviderUserSchema
            })
            .parse(response.data);

        const user = providerResponse.result;

        return {
            sys_id: user.sys_id,
            ...(user.user_name != null && { user_name: user.user_name }),
            ...(user.first_name != null && { first_name: user.first_name }),
            ...(user.last_name != null && { last_name: user.last_name }),
            ...(user.email != null && { email: user.email }),
            ...(user.active != null && { active: user.active }),
            ...(user.sys_created_on != null && { sys_created_on: user.sys_created_on }),
            ...(user.sys_updated_on != null && { sys_updated_on: user.sys_updated_on })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
