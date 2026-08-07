import { z } from 'zod';
import { createAction } from 'nango';

const EntityTypePropertySchema = z
    .object({
        id: z.string(),
        type: z.string()
    })
    .passthrough();

const FromRelationshipSchema = z
    .object({
        id: z.string(),
        toTypes: z.array(z.string())
    })
    .passthrough();

const ToRelationshipSchema = z
    .object({
        id: z.string(),
        fromTypes: z.array(z.string())
    })
    .passthrough();

const EntityTypeSchema = z
    .object({
        type: z.string(),
        dimensionKey: z.string().optional(),
        displayName: z.string().optional(),
        entityLimitExceeded: z.boolean().optional(),
        properties: z.array(EntityTypePropertySchema).optional(),
        fromRelationships: z.array(FromRelationshipSchema).optional(),
        toRelationships: z.array(ToRelationshipSchema).optional()
    })
    .passthrough();

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const OutputSchema = z.object({
    items: z.array(EntityTypeSchema),
    nextPageKey: z.string().optional()
});

const ProviderResponseSchema = z.object({
    totalCount: z.number().optional(),
    pageSize: z.number().optional(),
    nextPageKey: z.string().optional(),
    types: z.array(z.unknown())
});

const action = createAction({
    description: 'List all monitored entity types known to this environment with their properties and relationships schema.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['entities.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/entity-v2/get-all-entity-types
        const response = await nango.get({
            endpoint: '/api/v2/entityTypes',
            params: input.cursor ? { nextPageKey: input.cursor } : { pageSize: 500 },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.types.map((item) => {
            return EntityTypeSchema.parse(item);
        });

        return {
            items,
            ...(providerResponse.nextPageKey !== undefined && { nextPageKey: providerResponse.nextPageKey })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
