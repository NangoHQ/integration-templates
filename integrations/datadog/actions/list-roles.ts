import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (zero-based page number) from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(100).optional().describe('Number of roles to return per page. Defaults to 100.')
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
    scopes: ['user_access_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer page number'
            });
        }
        const pageNumber = input.cursor ? parseInt(input.cursor, 10) : 0;
        const pageSize = input.page_size ?? 100;

        // v2/roles paginates with `page[number]`/`page[size]` (matching syncs/roles.ts); it does not
        // support a `page[cursor]` param, and reports totals via `meta.page.total_filtered_count`.
        const config: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/roles/
            endpoint: 'v2/roles',
            params: {
                'page[number]': String(pageNumber),
                'page[size]': String(pageSize)
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = z
            .object({
                data: z.array(ProviderRoleSchema).optional(),
                meta: z
                    .object({
                        page: z
                            .object({
                                total_filtered_count: z.number().optional()
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

        const totalFilteredCount = providerResponse.meta?.page?.total_filtered_count;
        const nextCursor = totalFilteredCount !== undefined && (pageNumber + 1) * pageSize < totalFilteredCount ? String(pageNumber + 1) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
