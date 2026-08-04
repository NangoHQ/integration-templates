import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    role_id: z.string().describe('Role ID. Example: "dffc73ec-89cd-11f1-8e5b-da7ad0900002"')
});

const ProviderPermissionSchema = z.object({
    id: z.string(),
    type: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z
            .object({
                name: z.string(),
                created_at: z.string().optional(),
                modified_at: z.string().optional(),
                managed: z.boolean().optional(),
                user_count: z.number().optional(),
                team_count: z.number().optional()
            })
            .optional(),
        relationships: z
            .object({
                permissions: z
                    .object({
                        data: z.array(ProviderPermissionSchema).optional()
                    })
                    .optional()
            })
            .optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    managed: z.boolean().optional(),
    user_count: z.number().optional(),
    team_count: z.number().optional(),
    permissions: z
        .array(
            z.object({
                id: z.string(),
                type: z.string()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Get a single role by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['roles_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/roles/#get-a-role
            endpoint: `v2/roles/${encodeURIComponent(input.role_id)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const attributes = providerResponse.data.attributes;
        const permissionsData = providerResponse.data.relationships?.permissions?.data;

        return {
            id: providerResponse.data.id,
            type: providerResponse.data.type,
            ...(attributes?.name !== undefined && { name: attributes.name }),
            ...(attributes?.created_at !== undefined && { created_at: attributes.created_at }),
            ...(attributes?.modified_at !== undefined && { modified_at: attributes.modified_at }),
            ...(attributes?.managed !== undefined && { managed: attributes.managed }),
            ...(attributes?.user_count !== undefined && { user_count: attributes.user_count }),
            ...(attributes?.team_count !== undefined && { team_count: attributes.team_count }),
            ...(permissionsData !== undefined && { permissions: permissionsData })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
