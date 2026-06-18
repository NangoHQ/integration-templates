import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Starts at 1.'),
    per_page: z.number().optional().describe('Number of items per page. Maximum is 150.')
});

const CollectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    icon: z.string().optional(),
    order: z.number().optional(),
    workspace_id: z.string(),
    created_at: z.number(),
    updated_at: z.number()
});

const ProviderListSchema = z.object({
    type: z.string(),
    data: z.array(CollectionSchema),
    pages: z
        .object({
            type: z.string(),
            page: z.number(),
            per_page: z.number(),
            total_pages: z.number()
        })
        .optional(),
    total_count: z.number().optional()
});

const OutputSchema = z.object({
    collections: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional(),
            icon: z.string().optional(),
            order: z.number().optional(),
            created_at: z.number(),
            updated_at: z.number()
        })
    ),
    has_more: z.boolean(),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List top-level Help Center collections.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Collections/listCollections
        const response = await nango.get({
            endpoint: '/help_center/collections',
            params,
            retries: 3,
            headers: {
                'Intercom-Version': '2.11'
            }
        });

        const parsed = ProviderListSchema.parse(response.data);

        const hasMore = parsed.pages !== undefined && parsed.pages.page < parsed.pages.total_pages;

        return {
            collections: parsed.data.map((collection) => ({
                id: collection.id,
                name: collection.name,
                ...(collection.description !== undefined && {
                    description: collection.description
                }),
                ...(collection.icon !== undefined && { icon: collection.icon }),
                ...(collection.order !== undefined && { order: collection.order }),
                created_at: collection.created_at,
                updated_at: collection.updated_at
            })),
            has_more: hasMore,
            ...(hasMore && parsed.pages && { next_page: parsed.pages.page + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
