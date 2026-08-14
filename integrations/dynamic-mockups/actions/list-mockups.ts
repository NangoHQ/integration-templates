import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    catalog_uuid: z.string().optional().describe('Catalog UUID to filter mockups. Example: "6e228160-a9cc-4407-bfa9-464972545fdd"'),
    collection_uuid: z.string().optional().describe('Collection UUID to filter mockups. Example: "f035baed-db43-40d5-b260-cdc02458db93"'),
    include_all_catalogs: z.boolean().optional().describe('Include mockups from all catalogs'),
    name: z.string().optional().describe('Filter mockups by name')
});

const SizeSchema = z.object({
    width: z.number(),
    height: z.number()
});

const PositionSchema = z.object({
    top: z.number(),
    left: z.number()
});

const DecorationSchema = z.object({
    location: z.string(),
    name: z.string()
});

const SmartObjectSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    size: SizeSchema,
    position: PositionSchema,
    print_area_presets: z.array(z.record(z.string(), z.unknown())).optional(),
    decoration: DecorationSchema.optional()
});

const TextLayerSchema = z.object({
    uuid: z.string(),
    name: z.string()
});

const CollectionSchema = z.object({
    uuid: z.string(),
    name: z.string()
});

const ThumbnailSchema = z.object({
    width: z.number(),
    url: z.string()
});

const PsdSchema = z.object({
    uuid: z.string(),
    name: z.string()
});

const MockupSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    thumbnail: z.string().optional(),
    smart_objects: z.array(SmartObjectSchema).optional(),
    text_layers: z.array(TextLayerSchema).optional(),
    collections: z.array(CollectionSchema).optional(),
    thumbnails: z.array(ThumbnailSchema).optional(),
    products: z.array(z.record(z.string(), z.unknown())).optional(),
    type: z.string().optional(),
    psd: PsdSchema.optional(),
    catalog_uuid: z.string().optional(),
    catalog_id: z.number().optional(),
    id: z.number().optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.array(MockupSchema)
});

const OutputSchema = z.object({
    items: z.array(MockupSchema)
});

const action = createAction({
    description: 'List mockup templates (both classic PSD-based and MockAnything AI-generated) in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.dynamicmockups.com/
        const response = await nango.get({
            endpoint: '/v1/mockups',
            params: {
                ...(input.catalog_uuid !== undefined && { catalog_uuid: input.catalog_uuid }),
                ...(input.collection_uuid !== undefined && { collection_uuid: input.collection_uuid }),
                ...(input.include_all_catalogs !== undefined && { include_all_catalogs: String(input.include_all_catalogs) }),
                ...(input.name !== undefined && { name: input.name })
            },
            retries: 3
        });

        const envelope = ProviderResponseSchema.parse(response.data);

        if (!envelope.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: envelope.message
            });
        }

        return {
            items: envelope.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
