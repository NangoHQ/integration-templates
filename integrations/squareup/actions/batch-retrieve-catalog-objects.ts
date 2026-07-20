import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    object_ids: z.array(z.string()).min(1).describe('Array of CatalogObject IDs to retrieve. Max 1000.'),
    include_related_objects: z.boolean().optional().describe('Include related objects in the response'),
    catalog_version: z.number().optional().describe('Specific catalog version to retrieve'),
    include_deleted_objects: z.boolean().optional().describe('Include deleted objects in the response'),
    include_category_path_to_root: z.boolean().optional().describe('Include category path to root for returned categories')
});

const CatalogObjectSchema = z
    .object({
        type: z.string(),
        id: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    objects: z.array(CatalogObjectSchema).optional(),
    related_objects: z.array(CatalogObjectSchema).optional()
});

const action = createAction({
    description: 'Retrieve multiple catalog objects by ID in one call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ITEMS_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.squareup.com/reference/square/catalog-api/batch-retrieve-catalog-objects
            endpoint: '/v2/catalog/batch-retrieve',
            data: {
                object_ids: input.object_ids,
                ...(input.include_related_objects !== undefined && { include_related_objects: input.include_related_objects }),
                ...(input.catalog_version !== undefined && { catalog_version: input.catalog_version }),
                ...(input.include_deleted_objects !== undefined && { include_deleted_objects: input.include_deleted_objects }),
                ...(input.include_category_path_to_root !== undefined && { include_category_path_to_root: input.include_category_path_to_root })
            },
            retries: 3
        });

        const parsed = z
            .object({
                objects: z.array(CatalogObjectSchema).optional(),
                related_objects: z.array(CatalogObjectSchema).optional()
            })
            .parse(response.data);

        return {
            ...(parsed.objects !== undefined && { objects: parsed.objects }),
            ...(parsed.related_objects !== undefined && { related_objects: parsed.related_objects })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
