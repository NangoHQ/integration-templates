import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    offset: z.number().optional().describe('Pagination offset. Example: 0'),
    limit: z.number().optional().describe('Pagination limit. Example: 100')
});

const ProviderEntitySchema = z.object({}).passthrough();

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()).optional(),
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

const OutputSchema = z.object({
    entities: z.array(ProviderEntitySchema),
    total: z.number().optional(),
    next_offset: z.number().optional()
});

const action = createAction({
    description: 'List Software Catalog entities',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['apm_service_catalog_read'],

    exec: async (nango, input) => {
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
        const rawEntities = data.data ?? [];
        const entities = rawEntities.map((item) => {
            const parsedItem = ProviderEntitySchema.safeParse(item);
            return parsedItem.success ? parsedItem.data : {};
        });

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
