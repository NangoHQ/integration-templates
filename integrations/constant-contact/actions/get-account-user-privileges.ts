import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({}).describe('No input parameters. Returns the privileges of the authenticated account user.');

const PrivilegeSchema = z.object({
    privilege_id: z.number().describe('Numeric privilege identifier. Example: 12'),
    privilege_name: z.string().describe('Privilege name in "<resource>:<access>" form. Example: "contacts:write"')
});

const ProviderPrivilegeSchema = z.object({
    privilege_id: z.number(),
    privilege_name: z.string()
});

const OutputSchema = z
    .object({
        privileges: z.array(PrivilegeSchema).describe('Privileges granted to the authenticated account user.')
    })
    .describe('Privileges of the authenticated account user.');

/**
 * @tags: [read]
 * @tagReason: Only reads the authenticated account user's privileges via a GET request.
 * @pitfalls: Returns only the privileges of the account user that owns the authenticated credentials, not a roster of all users on the account.
 */
const action = createAction({
    description: 'Get the list of permission/privilege names granted to the authenticated account user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: '/v3/account/user/privileges',
            retries: 3
        };
        const response = await nango.get(config);

        const privileges = z.array(ProviderPrivilegeSchema).parse(response.data);

        return {
            privileges: privileges.map((privilege) => ({
                privilege_id: privilege.privilege_id,
                privilege_name: privilege.privilege_name
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
