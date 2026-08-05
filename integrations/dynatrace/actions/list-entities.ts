import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        entitySelector: z
            .string()
            .optional()
            .describe('Entity selector expression. Example: "type(HOST)". Required for the first page; omit on subsequent pages when passing cursor.'),
        pageSize: z.number().optional().describe('Number of results per page. Default: 50.'),
        fields: z.string().optional().describe('Fields to include in the response. Example: "+properties,+tags,+fromRelationships,+toRelationships"'),
        cursor: z.string().optional().describe('Pagination cursor (nextPageKey) from the previous response. Omit for the first page.')
    })
    .refine((input) => input.cursor !== undefined || input.entitySelector !== undefined, {
        message: 'entitySelector is required when cursor is not provided',
        path: ['entitySelector']
    });

const ProviderEntitySchema = z
    .object({
        entityId: z.string(),
        type: z.string(),
        displayName: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    entities: z.array(z.unknown()),
    nextPageKey: z.string().optional().nullable(),
    pageSize: z.number().optional(),
    totalCount: z.number().optional()
});

const OutputSchema = z.object({
    entities: z.array(ProviderEntitySchema),
    nextPageKey: z.string().optional(),
    pageSize: z.number().optional(),
    totalCount: z.number().optional()
});

const action = createAction({
    description: 'List monitored entities (hosts, services, applications, process groups, etc.) matching an entity selector.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['entities.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let params: { entitySelector?: string; pageSize?: number; fields?: string; nextPageKey?: string };

        if (input.cursor !== undefined) {
            params = {
                nextPageKey: input.cursor
            };
        } else {
            if (!input.entitySelector) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'entitySelector is required when cursor is not provided'
                });
            }

            params = {
                entitySelector: input.entitySelector
            };

            if (input.pageSize !== undefined) {
                params.pageSize = input.pageSize;
            }

            if (input.fields !== undefined) {
                params.fields = input.fields;
            }
        }

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/entity-v2/get-entities-list
            endpoint: '/api/v2/entities',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const entities = providerResponse.entities.map((item) => ProviderEntitySchema.parse(item));

        return {
            entities,
            ...(providerResponse.nextPageKey !== undefined && providerResponse.nextPageKey !== null && { nextPageKey: providerResponse.nextPageKey }),
            ...(providerResponse.pageSize !== undefined && { pageSize: providerResponse.pageSize }),
            ...(providerResponse.totalCount !== undefined && { totalCount: providerResponse.totalCount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
