import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    roleId: z.string().trim().min(1).describe('Role ID. Example: "00000000-0000-0000-0000-000000000000"'),
    name: z.string().describe('New name for the role.')
});

const ProviderRoleSchema = z.object({
    data: z
        .object({
            id: z.string(),
            type: z.string(),
            attributes: z
                .object({
                    name: z.string(),
                    user_count: z.number().optional(),
                    created_at: z.string().optional(),
                    modified_at: z.string().optional()
                })
                .passthrough(),
            relationships: z
                .object({
                    permissions: z
                        .object({
                            data: z
                                .array(
                                    z.object({
                                        type: z.string(),
                                        id: z.string()
                                    })
                                )
                                .optional()
                        })
                        .optional()
                })
                .optional()
        })
        .passthrough()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    userCount: z.number().optional(),
    createdAt: z.string().optional(),
    modifiedAt: z.string().optional()
});

const action = createAction({
    description: "Update a role's name.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_access_manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://docs.datadoghq.com/api/latest/roles/#update-a-role
            endpoint: `v2/roles/${encodeURIComponent(input.roleId)}`,
            data: {
                data: {
                    id: input.roleId,
                    type: 'roles',
                    attributes: {
                        name: input.name
                    }
                }
            },
            retries: 3
        });

        const parsed = ProviderRoleSchema.parse(response.data);

        return {
            id: parsed.data.id,
            type: parsed.data.type,
            name: parsed.data.attributes.name,
            ...(parsed.data.attributes.user_count !== undefined && { userCount: parsed.data.attributes.user_count }),
            ...(parsed.data.attributes.created_at !== undefined && { createdAt: parsed.data.attributes.created_at }),
            ...(parsed.data.attributes.modified_at !== undefined && { modifiedAt: parsed.data.attributes.modified_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
