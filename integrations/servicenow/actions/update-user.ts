import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('The sys_id of the user to update. Example: "4896c3f9c3ca0310c5a8fc0d05013151"'),
    user_name: z.string().optional().describe('Unique user name.'),
    first_name: z.string().optional().describe('First name.'),
    last_name: z.string().optional().describe('Last name.'),
    email: z.string().optional().describe('Email address.'),
    active: z.boolean().optional().describe('Set to false to deactivate the user.'),
    phone: z.string().optional().describe('Phone number.'),
    title: z.string().optional().describe('Job title.'),
    department: z.string().optional().describe('Department name or sys_id.')
});

const ProviderUserSchema = z.object({
    sys_id: z.string(),
    user_name: z.string().optional().nullable(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    active: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    department: z.string().optional().nullable()
});

const OutputSchema = z.object({
    sys_id: z.string(),
    user_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    active: z.string().optional(),
    phone: z.string().optional(),
    title: z.string().optional(),
    department: z.string().optional()
});

const action = createAction({
    description: 'Update user fields.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.servicenow.com/dev.do#!/reference/api/now/rest/table-api#table-PUT
            endpoint: `/api/now/table/sys_user/${encodeURIComponent(input.sys_id)}`,
            data: {
                ...(input.user_name !== undefined && { user_name: input.user_name }),
                ...(input.first_name !== undefined && { first_name: input.first_name }),
                ...(input.last_name !== undefined && { last_name: input.last_name }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.active !== undefined && { active: input.active }),
                ...(input.phone !== undefined && { phone: input.phone }),
                ...(input.title !== undefined && { title: input.title }),
                ...(input.department !== undefined && { department: input.department })
            },
            retries: 1
        };

        const response = await nango.patch(config);

        const rawResponse = z
            .object({
                result: z.unknown()
            })
            .parse(response.data);
        const providerUser = ProviderUserSchema.parse(rawResponse.result);

        return {
            sys_id: providerUser.sys_id,
            ...(providerUser.user_name != null && { user_name: providerUser.user_name }),
            ...(providerUser.first_name != null && { first_name: providerUser.first_name }),
            ...(providerUser.last_name != null && { last_name: providerUser.last_name }),
            ...(providerUser.email != null && { email: providerUser.email }),
            ...(providerUser.active != null && { active: providerUser.active }),
            ...(providerUser.phone != null && { phone: providerUser.phone }),
            ...(providerUser.title != null && { title: providerUser.title }),
            ...(providerUser.department != null && { department: providerUser.department })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
