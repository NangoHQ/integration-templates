import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    role_id: z.string().trim().min(1).describe('Role ID. Example: "dffc73ec-89cd-11f1-8e5b-da7ad0900002"')
});

const ProviderPermissionSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: z.object({
        created: z.string().optional(),
        description: z.string().optional(),
        display_name: z.string().optional(),
        display_type: z.string().optional(),
        group_name: z.string().optional(),
        name: z.string().optional(),
        name_aliases: z.array(z.string()).optional(),
        restricted: z.boolean().optional()
    })
});

const PermissionSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    display_name: z.string().optional(),
    description: z.string().optional(),
    display_type: z.string().optional(),
    group_name: z.string().optional(),
    restricted: z.boolean().optional()
});

const OutputSchema = z.object({
    permissions: z.array(PermissionSchema)
});

const action = createAction({
    description: 'List the permissions granted to a role.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_access_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.datadoghq.com/api/latest/roles/#list-role-permissions
        const response = await nango.get({
            endpoint: `v2/roles/${encodeURIComponent(input.role_id)}/permissions`,
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(ProviderPermissionSchema)
            })
            .parse(response.data);

        return {
            permissions: providerResponse.data.map((permission) => ({
                id: permission.id,
                ...(permission.attributes.name !== undefined && { name: permission.attributes.name }),
                ...(permission.attributes.display_name !== undefined && { display_name: permission.attributes.display_name }),
                ...(permission.attributes.description !== undefined && { description: permission.attributes.description }),
                ...(permission.attributes.display_type !== undefined && { display_type: permission.attributes.display_type }),
                ...(permission.attributes.group_name !== undefined && { group_name: permission.attributes.group_name }),
                ...(permission.attributes.restricted !== undefined && { restricted: permission.attributes.restricted })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
