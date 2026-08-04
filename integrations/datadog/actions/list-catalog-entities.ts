import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    offset: z.number().optional().describe('Pagination offset. Example: 0'),
    limit: z.number().optional().describe('Pagination limit. Example: 100')
});

const CatalogEntityAttributesSchema = z
    .object({
        kind: z.string().optional(),
        name: z.string().optional(),
        namespace: z.string().optional(),
        apiVersion: z.string().optional(),
        owner: z.string().optional(),
        description: z.string().optional()
    })
    .passthrough();

const CatalogEntityMetaSchema = z
    .object({
        createdAt: z.string().optional(),
        modifiedAt: z.string().optional(),
        ingestionSource: z.string().optional(),
        origin: z.string().optional()
    })
    .passthrough();

const ProviderEntitySchema = z
    .object({
        id: z.string(),
        type: z.string(),
        attributes: CatalogEntityAttributesSchema.optional(),
        relationships: z.record(z.string(), z.unknown()).optional(),
        meta: CatalogEntityMetaSchema.optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: z.array(ProviderEntitySchema),
    meta: z
        .object({
            count: z.number().optional(),
            includeCount: z.number().optional(),
            page: z
                .object({
                    total: z.number().optional(),
                    limit: z.number().optional(),
                    offset: z.number().optional()
                })
                .optional()
        })
        .optional(),
    links: z
        .object({
            self: z.string().optional()
        })
        .optional()
});

const OutputEntitySchema = z.object({
    id: z.string(),
    type: z.string(),
    kind: z.string().optional(),
    name: z.string().optional(),
    namespace: z.string().optional(),
    api_version: z.string().optional(),
    owner: z.string().optional(),
    description: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    relationships: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    entities: z.array(OutputEntitySchema),
    total: z.number().optional(),
    next_offset: z.number().optional()
});

const action = createAction({
    description: 'List Software Catalog entities',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['apm_service_catalog_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/software-catalog/
            endpoint: 'v2/catalog/entity',
            params: {
                ...(input.offset !== undefined && { 'page[offset]': String(input.offset) }),
                ...(input.limit !== undefined && { 'page[limit]': String(input.limit) })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from catalog entity API'
            });
        }

        const data = parsed.data;
        const entities = data.data.map((item) => ({
            id: item.id,
            type: item.type,
            ...(item.attributes?.kind !== undefined && { kind: item.attributes.kind }),
            ...(item.attributes?.name !== undefined && { name: item.attributes.name }),
            ...(item.attributes?.namespace !== undefined && { namespace: item.attributes.namespace }),
            ...(item.attributes?.apiVersion !== undefined && { api_version: item.attributes.apiVersion }),
            ...(item.attributes?.owner !== undefined && { owner: item.attributes.owner }),
            ...(item.attributes?.description !== undefined && { description: item.attributes.description }),
            ...(item.meta?.createdAt !== undefined && { created_at: item.meta.createdAt }),
            ...(item.meta?.modifiedAt !== undefined && { modified_at: item.meta.modifiedAt }),
            ...(item.relationships !== undefined && { relationships: item.relationships })
        }));

        const metaPage = data.meta?.page ?? {};
        const total = metaPage.total ?? data.meta?.count;
        const responseLimit = metaPage.limit ?? input.limit ?? 100;
        const responseOffset = metaPage.offset ?? input.offset ?? 0;

        let nextOffset: number | undefined;
        if (total !== undefined && responseOffset + responseLimit < total) {
            nextOffset = responseOffset + responseLimit;
        }

        return {
            entities,
            ...(total !== undefined && { total }),
            ...(nextOffset !== undefined && { next_offset: nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
