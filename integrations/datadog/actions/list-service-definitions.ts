import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    page_size: z.number().optional().describe('Number of items per page. Maximum allowed value is 100.')
});

const ProviderServiceDefinitionSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        attributes: z
            .object({
                meta: z
                    .object({
                        'ingested-schema-version': z.string().optional(),
                        'ingestion-source': z.string().optional(),
                        'last-modified-time': z.string().optional(),
                        origin: z.string().optional(),
                        'origin-detail': z.string().optional(),
                        'github-html-url': z.string().optional(),
                        warnings: z
                            .array(
                                z.object({
                                    'instance-location': z.string().optional(),
                                    'keyword-location': z.string().optional(),
                                    message: z.string().optional()
                                })
                            )
                            .optional()
                    })
                    .passthrough()
                    .optional(),
                schema: z.unknown().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderServiceDefinitionSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List service definitions in the Service Catalog.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['apm_service_catalog_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pageSize = input.page_size ?? 100;
        const pageNumber = input.cursor ? parseInt(input.cursor, 10) : 1;

        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/service-definition/#get-all-service-definitions
            endpoint: 'v2/services/definitions',
            params: {
                'page[size]': String(pageSize),
                'page[number]': String(pageNumber)
            },
            retries: 3
        });

        const listResponse = z
            .object({
                data: z.array(z.unknown())
            })
            .parse(response.data);

        const items = listResponse.data.map((item: unknown) => {
            return ProviderServiceDefinitionSchema.parse(item);
        });

        const hasNextPage = items.length === pageSize;
        const nextCursor = hasNextPage ? String(pageNumber + 1) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
