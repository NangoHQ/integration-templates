import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const RoleAttributesSchema = z.object({
    name: z.string(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    user_count: z.number().optional()
});

const ProviderRoleSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: RoleAttributesSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            created_at: z.string().optional(),
            modified_at: z.string().optional(),
            user_count: z.number().optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List roles (permission bundles assignable to users) in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/roles/
            endpoint: 'v2/roles',
            params: {
                ...(input.cursor !== undefined && { 'page[cursor]': input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = z
            .object({
                data: z.array(ProviderRoleSchema).optional(),
                meta: z
                    .object({
                        pagination: z
                            .object({
                                next_cursor: z.string().optional()
                            })
                            .optional()
                    })
                    .optional()
            })
            .parse(response.data);

        const items =
            providerResponse.data?.map((role) => ({
                id: role.id,
                name: role.attributes?.name ?? '',
                ...(role.attributes?.created_at !== undefined && { created_at: role.attributes.created_at }),
                ...(role.attributes?.modified_at !== undefined && { modified_at: role.attributes.modified_at }),
                ...(role.attributes?.user_count !== undefined && { user_count: role.attributes.user_count })
            })) ?? [];

        return {
            items,
            ...(providerResponse.meta?.pagination?.next_cursor !== undefined && {
                next_cursor: providerResponse.meta.pagination.next_cursor
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
