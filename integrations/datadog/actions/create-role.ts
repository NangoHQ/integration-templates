import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the role to create. Example: "Nango Registry Test Role"')
});

const PermissionSchema = z
    .object({
        id: z.string(),
        type: z.string()
    })
    .passthrough();

const RelationshipDataSchema = z
    .object({
        data: z.array(PermissionSchema).optional()
    })
    .optional();

const ProviderRoleSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        attributes: z
            .object({
                name: z.string(),
                created_at: z.string().optional(),
                modified_at: z.string().optional(),
                user_count: z.number().optional()
            })
            .passthrough(),
        relationships: z
            .object({
                permissions: RelationshipDataSchema.optional()
            })
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    user_count: z.number().optional(),
    permissions: z.array(PermissionSchema).optional()
});

const action = createAction({
    description: 'Create a new role.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_access_manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/roles/#create-role
            endpoint: 'v2/roles',
            data: {
                data: {
                    type: 'roles',
                    attributes: {
                        name: input.name
                    }
                }
            },
            retries: 3
        });

        if (!response.data || !response.data.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Datadog: missing role data.'
            });
        }

        const providerRole = ProviderRoleSchema.parse(response.data.data);

        const permissions = providerRole.relationships?.permissions?.data;

        return {
            id: providerRole.id,
            type: providerRole.type,
            name: providerRole.attributes.name,
            ...(providerRole.attributes.created_at !== undefined && { created_at: providerRole.attributes.created_at }),
            ...(providerRole.attributes.modified_at !== undefined && { modified_at: providerRole.attributes.modified_at }),
            ...(providerRole.attributes.user_count !== undefined && { user_count: providerRole.attributes.user_count }),
            ...(permissions !== undefined && { permissions })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
