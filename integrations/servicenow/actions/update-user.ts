import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        sys_id: z.string().describe('The sys_id of the user to update. Example: "4896c3f9c3ca0310c5a8fc0d05013151"'),
        user_name: z.string().optional().describe('Unique user name.'),
        first_name: z.string().optional().describe('First name.'),
        last_name: z.string().optional().describe('Last name.'),
        email: z.string().optional().describe('Email address.'),
        active: z.boolean().optional().describe('Set to false to deactivate the user.'),
        phone: z.string().optional().describe('Phone number.'),
        title: z.string().optional().describe('Job title.'),
        department: z
            .string()
            .optional()
            .describe('Department sys_id (reference to cmn_department). Example: "5d7f17f03710200044e0bfc8bcbe5d43". Department names are not accepted.')
    })
    .refine((data) => Object.keys(data).some((key) => key !== 'sys_id'), {
        message: 'At least one mutable field must be provided in addition to sys_id.'
    });

const ReferenceFieldSchema = z
    .object({
        link: z.string().optional(),
        value: z.string().optional()
    })
    .passthrough();

const ProviderUserSchema = z.object({
    sys_id: z.string(),
    user_name: z.string().optional().nullable(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    active: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    // Normally a plain sys_id string thanks to sysparm_exclude_reference_link, but accept the
    // { link, value } reference shape too in case that param isn't honored.
    department: z.union([z.string(), ReferenceFieldSchema]).optional().nullable()
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
            // Reference fields (e.g. department) default to a { link, value } object in the
            // response. Excluding reference links keeps the response shape a plain string so it
            // matches ProviderUserSchema.
            params: {
                sysparm_exclude_reference_link: 'true'
            },
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

        const department =
            providerUser.department == null ? undefined : typeof providerUser.department === 'string' ? providerUser.department : providerUser.department.value;

        return {
            sys_id: providerUser.sys_id,
            ...(providerUser.user_name != null && { user_name: providerUser.user_name }),
            ...(providerUser.first_name != null && { first_name: providerUser.first_name }),
            ...(providerUser.last_name != null && { last_name: providerUser.last_name }),
            ...(providerUser.email != null && { email: providerUser.email }),
            ...(providerUser.active != null && { active: providerUser.active }),
            ...(providerUser.phone != null && { phone: providerUser.phone }),
            ...(providerUser.title != null && { title: providerUser.title }),
            ...(department !== undefined && { department })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
