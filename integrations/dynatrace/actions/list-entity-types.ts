import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    pageSize: z.number().optional().describe('Number of entity types per page. Max 500.')
});

const EntityTypePropertySchema = z.object({
    id: z.string(),
    type: z.string(),
    displayName: z.string().optional()
});

const ToPositionSchema = z.object({
    id: z.string(),
    toTypes: z.array(z.string())
});

const FromPositionSchema = z.object({
    id: z.string(),
    fromTypes: z.array(z.string())
});

const EntityTypeSchema = z.object({
    type: z.string(),
    displayName: z.string().optional(),
    dimensionKey: z.string().optional(),
    entityLimitExceeded: z.boolean().optional(),
    properties: z.array(EntityTypePropertySchema).optional(),
    tags: z.string().optional(),
    managementZones: z.string().optional(),
    fromRelationships: z.array(ToPositionSchema).optional(),
    toRelationships: z.array(FromPositionSchema).optional()
});

const ProviderResponseSchema = z.object({
    types: z.array(z.unknown()),
    nextPageKey: z.string().optional().nullable(),
    totalCount: z.number().optional(),
    pageSize: z.number().optional()
});

const OutputSchema = z.object({
    types: z.array(EntityTypeSchema),
    nextPageKey: z.string().optional(),
    totalCount: z.number().optional(),
    pageSize: z.number().optional()
});

const action = createAction({
    description: 'List all monitored entity types known to this environment with their properties/relationships schema.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['entities.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor) {
            params['nextPageKey'] = input.cursor;
        } else if (input.pageSize !== undefined) {
            params['pageSize'] = input.pageSize;
        }

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/entity-v2/get-all-entity-types
            endpoint: '/api/v2/entityTypes',
            params,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Dynatrace entityTypes endpoint.'
            });
        }

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: `Response validation failed: ${parsedResponse.error.message}`
            });
        }

        const data = parsedResponse.data;

        const types = data.types.map((item: unknown) => {
            const parsed = EntityTypeSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'schema_validation_error',
                    message: `Failed to validate entity type: ${parsed.error.message}`
                });
            }
            return parsed.data;
        });

        return {
            types,
            ...(data.nextPageKey != null && { nextPageKey: data.nextPageKey }),
            ...(data.totalCount !== undefined && { totalCount: data.totalCount }),
            ...(data.pageSize !== undefined && { pageSize: data.pageSize })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
