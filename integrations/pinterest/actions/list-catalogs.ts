import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    country: z.string().describe('Country code. Example: "US"'),
    ad_account_id: z.string().optional().describe('Ad account ID for Business Access. Example: "549770573673"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(250).optional().describe('Number of items per page. Example: 25')
});

const CatalogSchema = z.object({
    id: z.string(),
    name: z.string(),
    catalog_type: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(CatalogSchema),
    bookmark: z.string().optional()
});

const action = createAction({
    description: 'List product catalogs',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['catalogs:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/catalogs/list
            endpoint: '/v5/catalogs',
            params: {
                country: input.country,
                ...(input.ad_account_id !== undefined && { ad_account_id: input.ad_account_id }),
                ...(input.cursor !== undefined && { bookmark: input.cursor }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) })
            },
            retries: 3
        });

        const data = z
            .object({
                items: z.array(
                    z.object({
                        id: z.string(),
                        name: z.string(),
                        catalog_type: z.string(),
                        created_at: z.string(),
                        updated_at: z.string()
                    })
                ),
                bookmark: z.string().nullable().optional()
            })
            .parse(response.data);

        return {
            items: data.items.map((item) => ({
                id: item.id,
                name: item.name,
                catalog_type: item.catalog_type,
                created_at: item.created_at,
                updated_at: item.updated_at
            })),
            ...(data.bookmark != null && { bookmark: data.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
