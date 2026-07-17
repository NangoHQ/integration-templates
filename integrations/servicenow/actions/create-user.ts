import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_name: z.string().describe('Unique username for the user. Example: "john.doe"'),
    first_name: z.string().optional().describe('First name of the user. Example: "John"'),
    last_name: z.string().optional().describe('Last name of the user. Example: "Doe"'),
    email: z.string().optional().describe('Email address of the user. Example: "john.doe@example.com"'),
    active: z.boolean().optional().describe('Whether the user is active.'),
    title: z.string().optional().describe('Job title of the user. Example: "Software Engineer"'),
    department: z.string().optional().describe('Department of the user. Example: "IT"')
});

const ProviderResultSchema = z.object({
    sys_id: z.string(),
    user_name: z.string(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    active: z.union([z.boolean(), z.string()]).nullable().optional(),
    title: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    sys_created_on: z.string().nullable().optional(),
    sys_updated_on: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    result: ProviderResultSchema
});

const OutputSchema = z.object({
    sys_id: z.string().describe('Unique system ID of the created user. Example: "abc123..."'),
    user_name: z.string().describe('Username of the created user.'),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    active: z.string().optional().describe('Active status of the user.'),
    title: z.string().optional(),
    department: z.string().optional(),
    sys_created_on: z.string().optional().describe('Creation timestamp in instance timezone.'),
    sys_updated_on: z.string().optional().describe('Last update timestamp in instance timezone.')
});

const action = createAction({
    description: 'Create a user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            user_name: input.user_name
        };

        if (input.first_name !== undefined) {
            data['first_name'] = input.first_name;
        }
        if (input.last_name !== undefined) {
            data['last_name'] = input.last_name;
        }
        if (input.email !== undefined) {
            data['email'] = input.email;
        }
        if (input.active !== undefined) {
            data['active'] = input.active;
        }
        if (input.title !== undefined) {
            data['title'] = input.title;
        }
        if (input.department !== undefined) {
            data['department'] = input.department;
        }

        const response = await nango.post({
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table
            endpoint: '/api/now/table/sys_user',
            data,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const result = providerResponse.result;

        return {
            sys_id: result.sys_id,
            user_name: result.user_name,
            ...(result.first_name != null && { first_name: result.first_name }),
            ...(result.last_name != null && { last_name: result.last_name }),
            ...(result.email != null && { email: result.email }),
            ...(result.active != null && { active: String(result.active) }),
            ...(result.title != null && { title: result.title }),
            ...(result.department != null && { department: result.department }),
            ...(result.sys_created_on != null && { sys_created_on: result.sys_created_on }),
            ...(result.sys_updated_on != null && { sys_updated_on: result.sys_updated_on })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
